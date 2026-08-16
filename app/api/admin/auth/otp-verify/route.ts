import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  getAdminOtp, deleteAdminOtp, bumpAdminOtpAttempts,
  getAgent, touchAgentLogin, createAuditLog,
} from "@/lib/store";
import { setAgentSessionCookie } from "@/lib/agentAuth";
import { toPublicAgent } from "@/lib/crm";
import { rateLimitFail } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Plus3: segundo paso del 2FA por email. Recibe el nonce que devolvió el
// login y el código de 6 dígitos que el agente ha recibido. Solo si
// coincide (timing-safe compare del hash SHA-256) crea la cookie de
// sesión y descarta el OTP (single-use).
//
// Bloqueos:
//   - 5 intentos por nonce → invalida el OTP (obligar a repetir login).
//   - TTL 10 min en el nonce.
//   - Rate-limit por IP para no permitir enumerar códigos válidos a lo
//     bruto contra nonces filtrados.
const MAX_ATTEMPTS = 5;
const OTP_MAX_AGE_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const limited = await rateLimitFail(request, { bucket: "admin-otp", limit: 30, windowSeconds: 600 });
  if (limited) return limited;

  let body: { nonce?: string; code?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const nonce = (body.nonce ?? "").trim();
  const code = (body.code ?? "").replace(/\D/g, "");
  if (!nonce || code.length !== 6) {
    return NextResponse.json({ ok: false, error: "Introduce el código de 6 dígitos." }, { status: 400 });
  }

  const rec = await getAdminOtp(nonce);
  if (!rec) {
    return NextResponse.json({ ok: false, error: "El código ha caducado o no es válido. Vuelve a iniciar sesión." }, { status: 401 });
  }

  const age = Date.now() - Date.parse(rec.createdAt);
  if (!Number.isFinite(age) || age > OTP_MAX_AGE_MS) {
    await deleteAdminOtp(nonce).catch(() => {});
    return NextResponse.json({ ok: false, error: "El código ha caducado. Vuelve a iniciar sesión." }, { status: 401 });
  }

  if (rec.attempts >= MAX_ATTEMPTS) {
    await deleteAdminOtp(nonce).catch(() => {});
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Vuelve a iniciar sesión." }, { status: 429 });
  }

  const expected = Buffer.from(rec.codeHash, "hex");
  const provided = Buffer.from(crypto.createHash("sha256").update(code).digest("hex"), "hex");
  const match = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);

  if (!match) {
    await bumpAdminOtpAttempts(nonce).catch(() => {});
    return NextResponse.json({ ok: false, error: "Código incorrecto." }, { status: 401 });
  }

  // Código correcto — invalidar el OTP (single-use, incluso si algo falla
  // después, ya no vale) y validar que el agente sigue existiendo y activo.
  await deleteAdminOtp(nonce).catch(() => {});
  const agent = await getAgent(rec.agentId);
  if (!agent || !agent.activo) {
    return NextResponse.json({ ok: false, error: "La cuenta ya no está activa." }, { status: 403 });
  }

  setAgentSessionCookie(agent.id);
  await touchAgentLogin(agent.id);
  await createAuditLog({
    agenteId: agent.id, agenteNombre: agent.nombre, action: "login", modulo: "auth",
    entidad: "agente", entidadId: agent.id, resumen: `${agent.nombre} ha iniciado sesión (2FA email OK).`,
  });

  return NextResponse.json({ ok: true, agent: toPublicAgent(agent) });
}
