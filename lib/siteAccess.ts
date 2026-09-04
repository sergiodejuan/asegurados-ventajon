// Bloqueo global de la web con contraseña. Cuando `enabled=true` en la
// config KV, el middleware exige una cookie firmada `site_access` antes
// de servir cualquier página o API pública. La cookie la planta el
// endpoint `/api/acceso/login` tras verificar la contraseña scrypt.
//
// La contraseña se administra desde `/admin/seguridad/acceso`. El secreto
// que firma la cookie (`SITE_ACCESS_SECRET`) es distinto del secreto de
// la sesión admin — así rotar uno no invalida el otro.
//
// Este módulo se importa desde:
//   - `middleware.ts` (Edge runtime) — sólo `verifyAccessCookie` y helpers
//     que usan Web Crypto (no Node crypto).
//   - Endpoints Node — `hashPassword`/`verifyPassword`/`signAccessCookie`.
//
// Para que ambos runtimes compartan la lógica del cookie, todo lo que va
// dentro de esta cookie (base64url + HMAC-SHA256) usa SÓLO Web Crypto,
// disponible en Edge y Node 18+.

export const SITE_ACCESS_COOKIE = "site_access";
export const SITE_ACCESS_KV_KEY = "siteAccess:config";
export const SITE_ACCESS_DEFAULT_TTL_DAYS = 30;

export type SiteAccessConfig = {
  enabled: boolean;
  passwordHash: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export const EMPTY_SITE_ACCESS_CONFIG: SiteAccessConfig = {
  enabled: false,
  passwordHash: null,
  updatedAt: null,
  updatedBy: null,
};

/* ------------------------------ Contraseña ------------------------------ */

// Reglas de contraseña dura: 14+ caracteres, mayúscula, minúscula, dígito y
// símbolo. Rechazamos secuencias triviales y espacios al principio/final.
export function validateHardPassword(pw: string): { ok: true } | { ok: false; error: string } {
  if (typeof pw !== "string") return { ok: false, error: "La contraseña no es válida." };
  if (pw.length < 14) return { ok: false, error: "La contraseña debe tener al menos 14 caracteres." };
  if (pw.length > 256) return { ok: false, error: "La contraseña no puede superar los 256 caracteres." };
  if (pw !== pw.trim()) return { ok: false, error: "No puede empezar ni terminar con espacios." };
  if (!/[a-z]/.test(pw)) return { ok: false, error: "Debe contener al menos una minúscula." };
  if (!/[A-Z]/.test(pw)) return { ok: false, error: "Debe contener al menos una mayúscula." };
  if (!/[0-9]/.test(pw)) return { ok: false, error: "Debe contener al menos un dígito." };
  if (!/[^A-Za-z0-9]/.test(pw)) return { ok: false, error: "Debe contener al menos un símbolo (por ejemplo !·%·?)." };
  return { ok: true };
}

/* --------------------------- Cookie firmada (HMAC) --------------------------- */

// Formato: base64url(payload) + "." + base64url(hmac). Payload es JSON con
// `exp` en segundos epoch, así el middleware puede caducar sin volver a KV.

function base64urlEncode(bytes: Uint8Array): string {
  // Web Crypto no incluye base64url; lo hacemos a mano.
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", enc, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function getSecret(): string {
  const s = process.env.SITE_ACCESS_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SITE_ACCESS_SECRET no configurado (32+ chars).");
    }
    // Dev: derivable, sin secreto real. En prod el throw impide arrancar.
    return "dev-only-do-not-use-in-production-site-access-secret-x";
  }
  return s;
}

export async function signAccessCookie(ttlSeconds = SITE_ACCESS_DEFAULT_TTL_DAYS * 86400): Promise<string> {
  const payload = { v: 1, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payloadStr = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadStr));
  return `${payloadStr}.${base64urlEncode(new Uint8Array(sig))}`;
}

export async function verifyAccessCookie(cookie: string | undefined | null): Promise<boolean> {
  if (!cookie) return false;
  const [payloadStr, sigStr] = cookie.split(".");
  if (!payloadStr || !sigStr) return false;
  let payload: { v?: number; exp?: number };
  try { payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadStr))); }
  catch { return false; }
  if (payload.v !== 1 || !payload.exp) return false;
  if (Math.floor(Date.now() / 1000) >= payload.exp) return false;
  const key = await hmacKey(getSecret());
  try {
    return await crypto.subtle.verify(
      "HMAC", key, base64urlDecode(sigStr), new TextEncoder().encode(payloadStr),
    );
  } catch { return false; }
}
