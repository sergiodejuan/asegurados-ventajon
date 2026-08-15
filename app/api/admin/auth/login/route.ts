import { NextResponse } from "next/server";
import { getAgentByEmail, touchAgentLogin, createAuditLog } from "@/lib/store";
import { verifyPassword, setAgentSessionCookie } from "@/lib/agentAuth";
import { toPublicAgent } from "@/lib/crm";
import { checkRateLimit, rateLimitFail } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login propio de cada agente (email + contraseña). Coexiste con el
// ADMIN_TOKEN maestro, que sigue funcionando igual que siempre en la
// pantalla de acceso de /admin.
export async function POST(request: Request) {
  // Rate limit por IP (anti-spam global): 10 intentos cada 10 minutos.
  const limited = await rateLimitFail(request, { bucket: "admin-login", limit: 10, windowSeconds: 600 });
  if (limited) return limited;

  let body: { email?: string; password?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.email || !body.password) {
    return NextResponse.json({ ok: false, error: "Introduce tu email y contraseña." }, { status: 400 });
  }

  const emailNormalized = body.email.trim().toLowerCase();

  // Segundo rate limit por CUENTA: 10 fallos por email cada hora → bloqueo
  // temporal. Sin esto, un atacante con muchas IPs (botnet) puede probar
  // millones de contraseñas contra el mismo email sin que se corte nunca
  // porque cada IP tiene su propia cuota (ver auditoría, S-02). La cuenta
  // solo penaliza fallos; los logins con éxito no consumen del contador.
  const acctLimit = await checkRateLimit(`admin-login:acct:${emailNormalized}`, 10, 3600);
  if (!acctLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos con este email. Prueba de nuevo en una hora." },
      { status: 429, headers: { "Retry-After": String(acctLimit.retryAfterSeconds) } }
    );
  }

  const agent = await getAgentByEmail(emailNormalized);
  if (!agent || !agent.activo || !agent.passwordHash) {
    return NextResponse.json({ ok: false, error: "Email o contraseña incorrectos." }, { status: 401 });
  }
  const valid = await verifyPassword(body.password, agent.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  setAgentSessionCookie(agent.id);
  await touchAgentLogin(agent.id);
  await createAuditLog({
    agenteId: agent.id, agenteNombre: agent.nombre, action: "login", modulo: "auth",
    entidad: "agente", entidadId: agent.id, resumen: `${agent.nombre} ha iniciado sesión.`,
  });

  return NextResponse.json({ ok: true, agent: toPublicAgent(agent) });
}
