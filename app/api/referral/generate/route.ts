import { NextResponse } from "next/server";
import { referralGenerateSchema, normalizePhone } from "@/lib/schema";
import {
  getOrCreateReferralCode, isEligibleReferrer, findLeadIdByPhoneOrEmail,
  getReferralLandingConfig, getLead,
} from "@/lib/store";
import { rateLimitFail, getClientIp } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Genera (o recupera) el código único de referidor de un cliente contratado.
//
// Flow anónimo desde /referidos: el usuario rellena email + teléfono, hacemos
// lookup en los índices idx:phone/idx:email, validamos que tenga al menos un
// presupuesto ganado y devolvemos su código (o el existente si ya lo tenía).
//
// Requisitos: el lead debe tener al menos un presupuesto con status
// "ganado" (isEligibleReferrer). Si no lo tiene, respondemos 403 con
// mensaje amistoso invitándole a contratar primero.
export async function POST(request: Request) {
  const limited = await rateLimitFail(request, { bucket: "referral-gen", limit: 5, windowSeconds: 300 });
  if (limited) return limited;

  const config = await getReferralLandingConfig();
  if (!config.programaActivo) {
    return NextResponse.json({ ok: false, error: "El programa está pausado temporalmente." }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }
  const parsed = referralGenerateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos incompletos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { email, telefono, company, turnstileToken } = parsed.data;
  if (company) return NextResponse.json({ ok: false, error: "Envío bloqueado." }, { status: 400 });

  const turnstileOk = await verifyTurnstile(turnstileToken, getClientIp(request));
  if (!turnstileOk) return NextResponse.json({ ok: false, error: "Verificación anti-bot fallida." }, { status: 400 });

  const phone = telefono ? normalizePhone(telefono) : "";
  const mail = email?.trim().toLowerCase() ?? "";
  const leadId = await findLeadIdByPhoneOrEmail(phone || undefined, mail || undefined);
  if (!leadId) {
    return NextResponse.json({
      ok: false,
      reason: "no_client",
      error: "No encontramos ninguna cuenta con esos datos. Si aún no eres cliente, calcula tu seguro primero.",
    }, { status: 404 });
  }

  const eligible = await isEligibleReferrer(leadId);
  if (!eligible) {
    return NextResponse.json({
      ok: false,
      reason: "not_eligible",
      error: "El programa está reservado a clientes con al menos una póliza contratada. En cuanto contrates, se activa tu programa de referidos.",
    }, { status: 403 });
  }

  const lead = await getLead(leadId);
  const nombre = lead?.nombre?.trim() || "Amigo";
  const emailFinal = lead?.email?.trim().toLowerCase() || mail;

  const doc = await getOrCreateReferralCode(leadId, nombre, emailFinal);

  return NextResponse.json({
    ok: true,
    code: doc.code,
    referidorNombre: doc.referidorNombre,
    convertidos: doc.convertidos.length,
    pagados: doc.convertidos.filter((c) => c.status === "pagado").length,
  });
}
