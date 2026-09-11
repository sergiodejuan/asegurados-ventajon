// Lector de la config `siteAccess:config` desde el middleware Edge.
// No importa `@upstash/redis` (pesado para Edge) — hace un fetch REST
// directo al endpoint Upstash. Cachea el resultado en memoria del edge
// worker con TTL corto para no pegarle a Redis en cada request.

import { SITE_ACCESS_KV_KEY, EMPTY_SITE_ACCESS_CONFIG, type SiteAccessConfig } from "./siteAccess";

type CacheEntry = { value: SiteAccessConfig; expiresAt: number };
let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 30_000;

function upstashCreds(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

// Devuelve la config actual desde caché o Upstash. Si Upstash está caído
// o mal configurado, devuelve un fallback con `enabled=false` — el
// middleware trata ese caso como "no bloquear" (fail-open), para que un
// incidente en Upstash NO tumbe la web. La contraseña sólo se verifica
// en el endpoint /api/acceso/login (Node), que sí puede fail-cerrado.
export async function readSiteAccessConfigEdge(): Promise<SiteAccessConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const creds = upstashCreds();
  if (!creds) {
    cache = { value: EMPTY_SITE_ACCESS_CONFIG, expiresAt: now + CACHE_TTL_MS };
    return EMPTY_SITE_ACCESS_CONFIG;
  }

  try {
    const res = await fetch(`${creds.url}/get/${encodeURIComponent(SITE_ACCESS_KV_KEY)}`, {
      headers: { Authorization: `Bearer ${creds.token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`upstash ${res.status}`);
    const body = await res.json() as { result: string | null };
    if (!body.result) {
      cache = { value: EMPTY_SITE_ACCESS_CONFIG, expiresAt: now + CACHE_TTL_MS };
      return EMPTY_SITE_ACCESS_CONFIG;
    }
    // Upstash devuelve el valor tal cual se escribió. Con @upstash/redis
    // `.set(k, obj)` serializa el objeto, así que aquí toca parsear.
    let value: SiteAccessConfig;
    try {
      const raw = JSON.parse(body.result);
      value = {
        enabled: typeof raw.enabled === "boolean" ? raw.enabled : false,
        passwordHash: typeof raw.passwordHash === "string" ? raw.passwordHash : null,
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
        updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : null,
      };
    } catch { value = EMPTY_SITE_ACCESS_CONFIG; }
    cache = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch {
    // Fail-open: si Upstash está caído, no bloqueamos la web. Cache el
    // fallback un poco para que un outage no dispare N fetch/segundo.
    cache = { value: EMPTY_SITE_ACCESS_CONFIG, expiresAt: now + CACHE_TTL_MS };
    return EMPTY_SITE_ACCESS_CONFIG;
  }
}

// Invalida la caché — el endpoint admin que cambia la contraseña puede
// llamarla para que el siguiente request en este edge worker relea. En
// otros workers la caché sigue viva hasta que expire (30s como máximo).
export function invalidateSiteAccessCacheEdge() {
  cache = null;
}
