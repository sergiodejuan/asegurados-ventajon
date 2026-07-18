import { Resend } from "resend";
import { BRAND_NAME } from "./brand";

// Mismo patrón "no-op hasta que se configure" que Retell/Bland/Turnstile:
// sin RESEND_API_KEY el resto de la app sigue funcionando, simplemente no se
// puede enviar ningún correo (los llamantes de sendEmail deben tratar eso
// como "no se pudo verificar", nunca como "conceder acceso igualmente").
export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

let _resend: Resend | null = null;
function client(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || `${BRAND_NAME} <no-reply@resend.dev>`;

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const { error } = await client().emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
    if (error) { console.error("[email] resend error", error); return false; }
    return true;
  } catch (err) {
    console.error("[email] send error", err);
    return false;
  }
}
