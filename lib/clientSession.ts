import crypto from "crypto";
import { cookies } from "next/headers";

// Sesión ligera del área de cliente: un token firmado (HMAC) que identifica
// al lead, sin usuario ni contraseña. Vive en una cookie httpOnly, así que
// el cliente tiene sus datos disponibles en cualquier visita/dispositivo sin
// tener que volver a escribir su nº de presupuesto + correo + teléfono cada
// vez — la base de datos sigue siendo la única fuente de verdad, esto solo
// identifica de forma segura qué lead está consultando.
//
// Variable de entorno recomendada: CLIENT_SESSION_SECRET (cualquier cadena
// larga aleatoria). Si no está configurada, se usa ADMIN_TOKEN como clave de
// firma (ya existe en todos los entornos) para no bloquear nada por defecto.

export const CLIENT_SESSION_COOKIE = "ventajon_client_session";
export const CLIENT_SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 días

function secret(): string {
  const configured = process.env.CLIENT_SESSION_SECRET || process.env.ADMIN_TOKEN;
  if (configured) return configured;
  // Fail-loud en producción: no debe existir un fallback público conocido
  // como secreto de firma (ver auditoría, S-01) — sería forjable.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[clientSession] Falta CLIENT_SESSION_SECRET (o al menos ADMIN_TOKEN) en producción. " +
      "Configura una cadena larga aleatoria en Vercel → Environment Variables antes de reiniciar."
    );
  }
  // Solo en dev: fallback conocido, no rota nada de la experiencia local
  // pero deja un secreto no-secreto para no perder tokens al reiniciar
  // Node. En prod NUNCA llega aquí gracias al throw.
  return "ventajon-dev-secret-change-me";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(leadId: string): string {
  const expires = Date.now() + CLIENT_SESSION_MAX_AGE * 1000;
  const payload = `${leadId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [leadId, expiresStr, sig] = parts;
  const payload = `${leadId}.${expiresStr}`;
  let expected: string;
  try { expected = sign(payload); } catch { return null; }
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;
  return leadId;
}

// Deja al lead con sesión iniciada en el área de cliente en este mismo
// dispositivo, justo tras completar un tarificador o "quiero que me llamen"
// — así entra directo la próxima vez que visite /area-cliente, sin tener
// que teclear su número de presupuesto.
export function setClientSessionCookie(leadId: string): void {
  cookies().set(CLIENT_SESSION_COOKIE, createSessionToken(leadId), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: CLIENT_SESSION_MAX_AGE,
  });
}
