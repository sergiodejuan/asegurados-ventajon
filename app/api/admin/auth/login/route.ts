import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAgentByEmail, saveAdminOtp } from "@/lib/store";
import { verifyPassword } from "@/lib/agentAuth";
import { checkRateLimit, rateLimitFail } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import { BRAND_NAME } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login propio de cada agente (email + contraseña). Coexiste con el
// ADMIN_TOKEN maestro, que sigue funcionando igual que siempre en la
// pantalla de acceso de /admin.
//
// Plus3 (auditoría consultora): NO creamos sesión aquí. Devolvemos un
// nonce y enviamos un OTP de 6 dígitos por email al agente; solo cuando
// verifica el código en /api/admin/auth/otp-verify se emite la cookie de
// sesión. Así, aunque un atacante conozca la contraseña (reuse, phishing,
// dump filtrado), necesita también acceso al buzón para entrar.
function generateOtp(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

function otpEmailHtml(code: string, agentName: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0b1a3a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 20px rgba(11,26,58,0.08);">
        <tr><td style="background:#0b1a3a;padding:20px 26px;color:#fff;font-weight:800;font-size:16px;">${BRAND_NAME} · Acceso admin</td></tr>
        <tr><td style="padding:26px;">
          <p style="margin:0;color:#0b1a3a;font-size:15px;">Hola ${agentName || ""},</p>
          <p style="margin:12px 0 0 0;color:#475569;font-size:14px;line-height:1.6;">Este es tu código de verificación para entrar al panel. Caduca en 10 minutos y solo sirve una vez.</p>
          <p style="margin:22px 0;text-align:center;">
            <span style="display:inline-block;padding:14px 22px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:12px;font-family:monospace;font-size:28px;font-weight:800;letter-spacing:.35em;color:#0b1a3a;">${code}</span>
          </p>
          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">Si no has intentado entrar, ignora este correo y avisa al administrador — es posible que alguien conozca tu contraseña.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

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
  // porque cada IP tiene su propia cuota.
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

  // Contraseña OK — generamos OTP, lo guardamos hasheado y lo enviamos por
  // email. NO se crea sesión aquí; el flujo continúa en /otp-verify.
  const code = generateOtp();
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const nonce = crypto.randomBytes(24).toString("base64url");
  await saveAdminOtp(nonce, {
    agentId: agent.id, codeHash, attempts: 0, createdAt: new Date().toISOString(),
  });

  try {
    await sendEmail({
      to: agent.email,
      subject: `[${BRAND_NAME}] Código de acceso al panel: ${code}`,
      html: otpEmailHtml(code, agent.nombre),
    });
  } catch (err) {
    console.error("[admin-login] no se pudo enviar el OTP", err);
    // Fail-closed: si no podemos enviar el correo no cedemos el nonce; el
    // agente reintenta y así no dejamos OTPs colgando sin manera de
    // entregarlos.
    return NextResponse.json(
      { ok: false, error: "No hemos podido enviar el código por email. Prueba de nuevo en unos segundos." },
      { status: 502 }
    );
  }

  // Devolvemos SOLO el nonce y una pista de dónde ha llegado el correo (el
  // dominio, sin la parte local completa, para que el agente sepa a qué
  // bandeja mirar sin exponer todo el email si otro le mira la pantalla).
  const [local, domain] = agent.email.split("@");
  const hint = local.length > 2
    ? `${local.slice(0, 2)}…@${domain ?? ""}`
    : `${local[0] ?? ""}…@${domain ?? ""}`;
  return NextResponse.json({ ok: true, otpRequired: true, nonce, emailHint: hint });
}
