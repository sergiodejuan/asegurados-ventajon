import crypto from "crypto";
import { getLead } from "./store";
import { sendEmail, emailConfigured } from "./email";
import { checkRateLimit } from "./rateLimit";
import { SITE_URL, BRAND_NAME } from "./brand";

// Token de un solo uso para confirmar que quien pide acceder al área de
// cliente de una ficha YA EXISTENTE es realmente su dueño. Mismo patrón de
// almacén que lib/rateLimit.ts (Redis en producción, memoria en dev) pero
// aparte: esto no es un contador, es un valor de un solo uso con TTL.
const TOKEN_TTL_SECONDS = 30 * 60; // 30 minutos

const hasKV = !!(
  (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
  (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
);

let _redis: import("@upstash/redis").Redis | null = null;
async function redisClient() {
  if (_redis) return _redis;
  const { Redis } = await import("@upstash/redis");
  _redis = new Redis({
    url: (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)!,
    token: (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)!,
  });
  return _redis;
}

const mem = new Map<string, { leadId: string; expiresAt: number }>();

async function storeToken(token: string, leadId: string): Promise<void> {
  if (hasKV) {
    const r = await redisClient();
    await r.set(`verify:${token}`, leadId, { ex: TOKEN_TTL_SECONDS });
    return;
  }
  mem.set(token, { leadId, expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000 });
}

async function takeToken(token: string): Promise<string | null> {
  if (hasKV) {
    const r = await redisClient();
    const leadId = await r.get<string>(`verify:${token}`);
    if (!leadId) return null;
    await r.del(`verify:${token}`); // de un solo uso
    return leadId;
  }
  const entry = mem.get(token);
  mem.delete(token); // de un solo uso, exista o no, caducado o no
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.leadId;
}

export async function consumeVerificationToken(token: string): Promise<string | null> {
  if (!token) return null;
  return takeToken(token);
}

function verificationEmailHtml(nombre: string, link: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c2333">
      <p style="font-size:14px">${primerNombre ? `Hola ${primerNombre},` : "Hola,"}</p>
      <p style="font-size:14px;line-height:1.6">
        Alguien ha pedido acceder a tu área de cliente en ${BRAND_NAME}. Si has sido tú, confirma tu acceso con este enlace
        (caduca en 30 minutos y solo funciona una vez):
      </p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}" style="background:#1B2B6B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Acceder a mi área de cliente
        </a>
      </p>
      <p style="font-size:13px;color:#5a6473;line-height:1.6">
        Si no has sido tú, ignora este correo — nadie podrá acceder a tus datos sin hacer clic en este enlace.
      </p>
    </div>
  `;
}

// Punto único que llaman todas las rutas públicas que podrían estar tocando
// una ficha YA EXISTENTE (dedupe por teléfono/email, o el formulario de
// "recuperar mis presupuestos"): en vez de conceder la cookie de sesión al
// instante —lo que permitiría a cualquiera que conozca tu teléfono o tu
// email "entrar" como tú—, se manda un enlace de un solo uso al email YA
// GUARDADO en la ficha (nunca al que venga en la petición actual, que podría
// ser el del atacante). Si no hay email guardado o no hay servicio de correo
// configurado, no se concede acceso automático — mejor eso que dejar la
// puerta abierta.
export async function sendAreaClienteVerificationEmail(leadId: string): Promise<{ sent: boolean }> {
  if (!emailConfigured()) return { sent: false };

  const lead = await getLead(leadId);
  if (!lead?.email) return { sent: false };

  // Máximo 3 correos de verificación por ficha y hora: evita que se pueda
  // usar esto para bombardear de correos a alguien solo con su teléfono.
  const limit = await checkRateLimit(`verify-email:${leadId}`, 3, 3600);
  if (!limit.ok) return { sent: false };

  const token = crypto.randomBytes(24).toString("base64url");
  await storeToken(token, leadId);
  const link = `${SITE_URL}/api/client/verify?token=${token}`;

  const ok = await sendEmail({
    to: lead.email,
    subject: `Confirma tu acceso — ${BRAND_NAME}`,
    html: verificationEmailHtml(lead.nombre, link),
  });
  return { sent: ok };
}
