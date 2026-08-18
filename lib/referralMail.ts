import { BRAND_NAME } from "./brand";
import { sendEmail } from "./email";
import { createReferralOptInToken } from "./referralTokens";

// Emails del programa referidos:
//   · Referido (el amigo): "Confirma tu email y te enviamos 20€ Amazon"
//     — se envía tras completar la cotización, con token de opt-in firmado.
//     Doble opt-in obligatorio antes de disparar el vale (previene fraude
//     de teléfono válido con email falso).
//   · Referidor (el cliente): "Tu amigo María acaba de pedir presupuesto"
//     — solo informativo, mantiene la sensación de progreso hacia el bono.
//   · Referidor: "Enhorabuena, tu bono de 20€ está en tu email" — cuando
//     el amigo contrata y supera los 30 días.
//
// Fail-open: si el correo no se envía, seguimos guardando la conversión en
// KV; el equipo lo puede reenviar a mano desde admin.

function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

function escape(v: string): string {
  return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function shell(inner: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0b1a3a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 20px rgba(11,26,58,0.08);">
        <tr><td style="background:#0b1a3a;padding:20px 26px;color:#fff;font-weight:800;font-size:16px;">${BRAND_NAME} · Programa Amigos</td></tr>
        <tr><td style="padding:28px 26px;">${inner}</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

// Se envía al amigo tras completar la comparativa. Su bono queda "en
// pendiente de confirmar email" hasta que hace clic en el link.
export async function sendReferralOptInEmail(input: {
  toEmail: string;
  toNombre: string;
  code: string;
  leadId: string;
  referidorNombre: string;
  monto: number;
}): Promise<void> {
  const base = siteUrl();
  const token = createReferralOptInToken(input.code, input.leadId);
  const link = base ? `${base}/api/referral/opt-in?token=${encodeURIComponent(token)}` : "";
  const inner = `
    <p style="margin:0;color:#0b1a3a;font-size:16px;font-weight:700;">Hola ${escape(input.toNombre)},</p>
    <p style="margin:12px 0 0 0;color:#475569;font-size:14px;line-height:1.6;">
      Acabas de pedir tu comparativa en ${BRAND_NAME}. Como llegaste con la recomendación de <strong>${escape(input.referidorNombre)}</strong>,
      te regalamos <strong>${input.monto}€ Amazon</strong>.
    </p>
    <p style="margin:14px 0 0 0;color:#475569;font-size:14px;line-height:1.6;">
      Solo tenemos que confirmar que este email es tuyo — un solo clic:
    </p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${escape(link)}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:800;font-size:15px;">
        Confirmar mi email y recibir ${input.monto}€ Amazon
      </a>
    </p>
    <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
      El vale te llega en 24-48 horas laborables al mismo email. Si no reconoces esta invitación, ignora este correo — no se activará nada.
    </p>
  `;
  await sendEmail({
    to: input.toEmail,
    subject: `Te regalamos ${input.monto}€ Amazon por tu comparativa en ${BRAND_NAME}`,
    html: shell(inner),
  });
}

// Se envía al referidor cuando su amigo ha pedido comparativa. Objetivo:
// mantener enganchado al referidor con progreso visible del bono.
export async function sendReferralProgressEmail(input: {
  toEmail: string;
  referidorNombre: string;
  amigoNombre: string;
  producto: string;
  monto: number;
}): Promise<void> {
  const inner = `
    <p style="margin:0;color:#0b1a3a;font-size:16px;font-weight:700;">Hola ${escape(input.referidorNombre)},</p>
    <p style="margin:12px 0 0 0;color:#475569;font-size:14px;line-height:1.6;">
      Buenas noticias: <strong>${escape(input.amigoNombre)}</strong> acaba de pedir su comparativa de <strong>seguro de ${escape(input.producto)}</strong> con tu enlace personal.
    </p>
    <p style="margin:14px 0 0 0;color:#475569;font-size:14px;line-height:1.6;">
      Cuando contrate su póliza y ésta lleve 30 días activa, recibirás automáticamente tu vale de <strong>${input.monto}€ Amazon</strong> en este mismo email.
    </p>
    <p style="margin:14px 0 0 0;color:#64748b;font-size:13px;line-height:1.6;">
      Puedes seguir invitando a más amigos — hasta 10 conversiones al año cuentan para tu bono.
    </p>
  `;
  await sendEmail({
    to: input.toEmail,
    subject: `${escape(input.amigoNombre)} ha pedido su presupuesto con tu enlace · ${BRAND_NAME}`,
    html: shell(inner),
  });
}
