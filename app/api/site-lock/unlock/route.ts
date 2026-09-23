import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import { rateLimitFail } from "@/lib/rateLimit";
import { getSiteLockConfig, createUnlockSession, SITE_LOCK_COOKIE, SITE_LOCK_UNLOCK_MAX_AGE } from "@/lib/siteLock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint público (sin token de admin): comprueba la contraseña del
// candado de mantenimiento y, si es correcta, deja una cookie de sesión de
// visitante. Limitado por IP para no permitir fuerza bruta contra la
// contraseña del candado.
export async function POST(request: Request) {
  const limited = await rateLimitFail(request, { bucket: "site-lock-unlock", limit: 10, windowSeconds: 600 });
  if (limited) return limited;

  let body: { password?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Solicitud no válida." }, { status: 400 }); }

  const password = typeof body.password === "string" ? body.password : "";
  const config = await getSiteLockConfig();

  if (!config.enabled) {
    // Nada que desbloquear: no es un error, simplemente no hace falta cookie.
    return NextResponse.json({ ok: true });
  }
  if (!config.passwordHash || !(await verifyPassword(password, config.passwordHash))) {
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta." }, { status: 401 });
  }

  const token = await createUnlockSession(config);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SITE_LOCK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SITE_LOCK_UNLOCK_MAX_AGE,
  });
  return res;
}
