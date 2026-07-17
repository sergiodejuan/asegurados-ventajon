import { NextResponse } from "next/server";

// Limitador de tasa reutilizable para endpoints públicos. Mismo patrón de
// almacén que lib/store.ts (Redis en producción, memoria del proceso en
// dev/sin credenciales) pero deliberadamente independiente de store.ts: no
// es un dato del CRM, es control de abuso.
//
// Se usa sobre todo en los endpoints que disparan una llamada automática
// real por Retell/Bland AI (/api/lead, /api/vida, /api/auto,
// /api/call-request, /api/exit-intent, /api/calculadora-ahorro): sin esto,
// cualquiera puede introducir el teléfono de un tercero y hacer que reciba
// llamadas automáticas repetidas — no es solo spam en el CRM, es un vector
// de acoso telefónico real.

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

const mem = new Map<string, { count: number; resetAt: number }>();

// Limpieza periódica del mapa en memoria para no acumular claves caducadas
// indefinidamente en un proceso de larga duración (dev/sin KV).
let lastSweep = 0;
function sweepMemory(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of mem) if (v.resetAt < now) mem.delete(k);
}

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  if (hasKV) {
    const r = await redisClient();
    const redisKey = `ratelimit:${key}`;
    const count = await r.incr(redisKey);
    if (count === 1) await r.expire(redisKey, windowSeconds);
    if (count > limit) {
      const ttl = await r.ttl(redisKey);
      return { ok: false, remaining: 0, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds };
    }
    return { ok: true, remaining: Math.max(0, limit - count), retryAfterSeconds: 0 };
  }

  const now = Date.now();
  sweepMemory(now);
  const entry = mem.get(key);
  if (!entry || entry.resetAt < now) {
    mem.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "desconocida"
  );
}

// Guarda de una línea para endpoints públicos: devuelve la respuesta 429 ya
// lista si se ha superado el límite, o null si puede continuar.
export async function rateLimitFail(
  request: Request,
  opts: { bucket: string; limit: number; windowSeconds: number; extraKey?: string }
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const key = `${opts.bucket}:${opts.extraKey ? `${opts.extraKey}:` : ""}${ip}`;
  const result = await checkRateLimit(key, opts.limit, opts.windowSeconds);
  if (result.ok) return null;
  return NextResponse.json(
    { ok: false, error: "Demasiadas solicitudes. Inténtalo de nuevo en unos minutos." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  );
}

// Guarda específica para los formularios que, si autorizan contacto, pueden
// disparar una llamada automática real (Retell/Bland AI): limita tanto por
// IP (anti-spam genérico) como por el propio número de teléfono destino
// (anti-acoso — impide que alguien reciba llamadas repetidas aunque quien
// las solicite cambie de IP). Se comprueban los dos; el más restrictivo manda.
export async function callTriggerRateLimitFail(
  request: Request,
  bucket: string,
  telefono: string
): Promise<NextResponse | null> {
  const byIp = await rateLimitFail(request, { bucket, limit: 20, windowSeconds: 3600 });
  if (byIp) return byIp;
  if (!telefono) return null;
  const result = await checkRateLimit(`${bucket}:tel:${telefono}`, 3, 24 * 3600);
  if (result.ok) return null;
  return NextResponse.json(
    { ok: false, error: "Ya hemos recibido una solicitud reciente para este teléfono. Un asesor se pondrá en contacto." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  );
}
