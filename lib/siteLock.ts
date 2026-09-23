// Bloqueo temporal de acceso público a la web (modo mantenimiento con
// contraseña), gestionable desde /admin/configuracion/bloqueo-web. Módulo
// deliberadamente aislado de lib/store.ts (que arrastra decenas de
// dependencias pesadas — email, PDF, integraciones…): este archivo lo
// importa también middleware.ts, que corre en Edge Runtime, así que se
// mantiene mínimo y sin imports de Node puro. @upstash/redis es un cliente
// REST basado en fetch, compatible con Edge Runtime igual que en Node.

export type SiteLockConfig = {
  enabled: boolean;
  // Hash scrypt "salt:hash" (ver lib/password.ts) — nunca se manda al
  // cliente. Se calcula en la API de admin (runtime nodejs); aquí solo se
  // guarda y se lee como valor opaco.
  passwordHash: string;
  updatedAt: string;
  updatedBy: string;
};

export const DEFAULT_SITE_LOCK: SiteLockConfig = { enabled: false, passwordHash: "", updatedAt: "", updatedBy: "" };

const CONFIG_KEY = "site_lock:config";
export const SITE_LOCK_COOKIE = "ventajon_site_unlock";
export const SITE_LOCK_UNLOCK_MAX_AGE = 60 * 60 * 24 * 30; // 30 días, igual que el resto de sesiones del sitio

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

// Fallback en memoria del proceso para desarrollo local sin KV (mismo patrón
// que lib/store.ts). En Edge Runtime cada isolate tiene su propia memoria, así
// que en local/preview sin KV el bloqueo puede no ser consistente entre
// instancias — aceptable porque producción siempre usa Redis (ver store.ts).
let memConfig: SiteLockConfig = DEFAULT_SITE_LOCK;
const memSessions = new Map<string, number>(); // clave de sesión -> expiresAt (ms)

export async function getSiteLockConfig(): Promise<SiteLockConfig> {
  if (hasKV) {
    const r = await redisClient();
    return (await r.get<SiteLockConfig>(CONFIG_KEY)) ?? DEFAULT_SITE_LOCK;
  }
  return memConfig;
}

export async function saveSiteLockConfig(
  patch: Partial<Pick<SiteLockConfig, "enabled" | "passwordHash">>,
  updatedBy: string
): Promise<SiteLockConfig> {
  const current = await getSiteLockConfig();
  const next: SiteLockConfig = { ...current, ...patch, updatedAt: new Date().toISOString(), updatedBy };
  if (hasKV) {
    const r = await redisClient();
    await r.set(CONFIG_KEY, next);
  } else {
    memConfig = next;
  }
  return next;
}

// Caché breve en memoria del propio isolate para no pagar una lectura a Redis
// en CADA petición pública mientras el candado está desactivado (caso
// normal): el middleware tolera hasta ~15s de desfase al activar/desactivar
// el bloqueo, aceptable para esta funcionalidad (no es un dato de seguridad
// fino, es un interruptor de mantenimiento).
let cached: { config: SiteLockConfig; until: number } | null = null;
export async function getSiteLockConfigCached(): Promise<SiteLockConfig> {
  const now = Date.now();
  if (cached && cached.until > now) return cached.config;
  const config = await getSiteLockConfig();
  cached = { config, until: now + 15_000 };
  return config;
}

/* --------------------------- Sesiones de desbloqueo ------------------------ */
// Sin usuario/contraseña por visitante: un token opaco aleatorio que vive en
// Redis con TTL (mismo patrón que claimOnce en lib/store.ts). La clave incluye
// una "versión" derivada del hash de contraseña vigente: al cambiar la
// contraseña, las sesiones ya abiertas dejan de encontrar su clave (quedan
// huérfanas y expiran solas) sin tener que enumerarlas ni borrarlas una a una.

function randomToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function currentVersion(config: SiteLockConfig): string {
  return config.passwordHash ? config.passwordHash.slice(0, 12) : "none";
}

function sessionKey(token: string, version: string): string {
  return `site_lock:session:${version}:${token}`;
}

export async function createUnlockSession(config: SiteLockConfig): Promise<string> {
  const token = randomToken();
  const key = sessionKey(token, currentVersion(config));
  if (hasKV) {
    const r = await redisClient();
    await r.set(key, "1", { ex: SITE_LOCK_UNLOCK_MAX_AGE });
  } else {
    memSessions.set(key, Date.now() + SITE_LOCK_UNLOCK_MAX_AGE * 1000);
  }
  return token;
}

export async function isUnlockSessionValid(token: string | undefined | null, config: SiteLockConfig): Promise<boolean> {
  if (!token) return false;
  const key = sessionKey(token, currentVersion(config));
  if (hasKV) {
    const r = await redisClient();
    return (await r.get(key)) !== null;
  }
  const exp = memSessions.get(key);
  return !!exp && exp > Date.now();
}
