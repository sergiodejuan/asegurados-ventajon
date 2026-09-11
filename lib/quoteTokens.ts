import crypto from "node:crypto";

// Tokens firmados HMAC para "abrir" la comparativa desde canales externos
// (WhatsApp via ManyChat, email, SMS) sin exponer leadIds sueltos en la
// URL. El token va en el link que envía el flow al usuario:
// https://.../comparativa?token=<leadId>.<expires>.<sig>
// El endpoint /api/client/hydrate-quote lee el token, verifica firma y
// caducidad, y devuelve el `quote` que la comparativa espera cargar
// localmente — así el usuario no tiene que reintroducir sus datos.
// Aislado del secreto de sesión (SESSION_SECRETS) y del referral secret
// para no arrastrar compromisos entre subsistemas — misma política que
// PDF_WATERMARK_SECRET / REFERRAL_TOKEN_SECRET. Sin secreto configurado
// en prod, falla cerrado.

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días: margen amplio para que el usuario vuelva sin regenerar

function secret(): string {
  const configured = process.env.QUOTE_TOKEN_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[quoteTokens] Falta QUOTE_TOKEN_SECRET en producción. Configura una " +
      "cadena aleatoria larga (32+ bytes base64) en Vercel → Environment Variables.",
    );
  }
  return "ventajon-dev-quote-token-secret-change-me";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createQuoteAccessToken(leadId: string, ttlMs = TOKEN_TTL_MS): string {
  const expires = Date.now() + ttlMs;
  const payload = `${leadId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyQuoteAccessToken(token: string | undefined | null): { leadId: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [leadId, expiresStr, sig] = parts;
  if (!leadId || !expiresStr || !sig) return null;
  const payload = `${leadId}.${expiresStr}`;
  let expected: string;
  try { expected = sign(payload); } catch { return null; }
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;
  return { leadId };
}
