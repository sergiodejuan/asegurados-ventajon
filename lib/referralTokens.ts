import crypto from "node:crypto";

// Tokens firmados HMAC para el doble opt-in del referido tras cotizar.
// Contenido: `${code}.${leadId}.${expiresAt}.${sig}` — sig es HMAC-SHA256
// de los tres primeros con REFERRAL_TOKEN_SECRET (o fallback dev).
//
// Aislado del secreto de sesión (session/agentSession) — misma política que
// PDF watermark / OTP admin: si se compromete uno no arrastra al resto.
// Sin secreto configurado en prod, falla cerrado.

const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 días — suficiente margen para que el amigo haga clic sin que caduque

function secret(): string {
  const configured = process.env.REFERRAL_TOKEN_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[referralTokens] Falta REFERRAL_TOKEN_SECRET en producción. " +
      "Configura una cadena larga aleatoria (32+ bytes base64) en Vercel → Environment Variables.",
    );
  }
  return "ventajon-dev-referral-secret-change-me";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createReferralOptInToken(code: string, leadId: string): string {
  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = `${code}.${leadId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyReferralOptInToken(token: string | undefined | null): { code: string; leadId: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [code, leadId, expiresStr, sig] = parts;
  const payload = `${code}.${leadId}.${expiresStr}`;
  let expected: string;
  try { expected = sign(payload); } catch { return null; }
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;
  return { code, leadId };
}
