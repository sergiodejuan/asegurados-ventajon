import crypto from "crypto";
import { getLead } from "./store";
import { sendEmail, emailConfigured } from "./email";
import { manychatConfigured, sendManychatVerificationLink } from "./manychat";
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
          Confirmar mi acceso
        </a>
      </p>
      <p style="font-size:13px;color:#5a6473;line-height:1.6">
        Si no has sido tú, ignora este correo — nadie podrá acceder a tus datos sin hacer clic en este enlace.
      </p>
    </div>
  `;
}

// Genera (y guarda) un enlace de un solo uso nuevo para una ficha, o null si
// se ha superado el límite de la propia ficha. Compartido entre los dos
// canales de envío (email y WhatsApp): lo que se protege con el límite es
// la generación de enlaces en sí, no un canal concreto — si no fuera así,
// alguien podría esquivar el límite de un canal simplemente pidiendo el
// otro.
//
// Apunta a una página (/area-cliente/verificar), NO directamente al endpoint
// que consume el token: varios proveedores de correo (Gmail, Outlook...)
// escanean automáticamente los enlaces de un mensaje nada más llegar, antes
// de que el usuario lo abra — si el enlace fuera él mismo el que consume el
// token de un solo uso (como hacía antes), ese escaneo automático lo
// invalidaría y el usuario real vería siempre "enlace no válido" al hacer
// clic. Con una página intermedia que exige un clic explícito ("Confirmar
// acceso"), ese escaneo automático (que solo descarga el HTML, no simula
// clics) deja de poder consumir el token.
async function createVerificationLink(leadId: string): Promise<string | null> {
  // Máximo 3 enlaces de verificación por ficha y hora (entre email y
  // WhatsApp juntos): evita que se pueda usar esto para bombardear de
  // mensajes a alguien solo con su teléfono.
  const limit = await checkRateLimit(`verify-link:${leadId}`, 3, 3600);
  if (!limit.ok) return null;

  const token = crypto.randomBytes(24).toString("base64url");
  await storeToken(token, leadId);
  return `${SITE_URL}/area-cliente/verificar?token=${token}`;
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

  const link = await createVerificationLink(leadId);
  if (!link) return { sent: false };

  const ok = await sendEmail({
    to: lead.email,
    subject: `Confirma tu acceso — ${BRAND_NAME}`,
    html: verificationEmailHtml(lead.nombre, link),
  });
  return { sent: ok };
}

// Alternativa al email cuando el cliente lo pide expresamente (botón
// "reenviar por WhatsApp" en /area-cliente): mismo enlace de un solo uso,
// mandado al teléfono YA GUARDADO en la ficha vía una plantilla de WhatsApp
// (ver sendManychatVerificationLink en lib/manychat.ts — requiere
// MANYCHAT_VERIFICATION_FLOW_NS configurado).
export async function sendAreaClienteVerificationWhatsApp(leadId: string): Promise<{ sent: boolean }> {
  if (!manychatConfigured()) return { sent: false };

  const lead = await getLead(leadId);
  if (!lead?.telefono) return { sent: false };

  const link = await createVerificationLink(leadId);
  if (!link) return { sent: false };

  const result = await sendManychatVerificationLink(lead.telefono, lead.nombre, link);
  return { sent: result.ok };
}
