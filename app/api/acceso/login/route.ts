import { NextResponse } from "next/server";
import { getSiteAccessConfig } from "@/lib/store";
import { verifyPassword } from "@/lib/password";
import { rateLimitFail } from "@/lib/rateLimit";
import { signAccessCookie, SITE_ACCESS_COOKIE, SITE_ACCESS_DEFAULT_TTL_DAYS } from "@/lib/siteAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/acceso/login  { password: string, next?: "/ruta" }
//
// Verifica la contraseña del bloqueo global contra el hash scrypt guardado
// en KV y, si es válida, planta la cookie firmada HMAC que el middleware
// Edge acepta como pase. Retorna { ok, next } — el cliente redirige a esa
// URL para forzar que el middleware vea la cookie recién plantada.
export async function POST(request: Request) {
  // Anti-fuerza-bruta: 8 intentos por IP cada 15 minutos. Suficiente
  // para tolerar tecleos torpes de usuarios legítimos sin abrir la
  // puerta a barridos de diccionario.
  const limited = await rateLimitFail(request, {
    bucket: "site-access-login",
    limit: 8,
    windowSeconds: 15 * 60,
  });
  if (limited) return limited;

  let body: { password?: string; next?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ ok: false, error: "Introduce la contraseña." }, { status: 400 });
  }

  const cfg = await getSiteAccessConfig();
  if (!cfg.enabled || !cfg.passwordHash) {
    // El gate no está activo — no revelamos el estado, respondemos como
    // si la contraseña fuese incorrecta. Un visitante que llega aquí
    // manualmente no debe descubrir si el modo cerrado está activo.
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta." }, { status: 401 });
  }

  const ok = await verifyPassword(password, cfg.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta." }, { status: 401 });
  }

  const token = await signAccessCookie();
  const next = typeof body.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//")
    ? body.next
    : "/";
  const res = NextResponse.json({ ok: true, next });
  res.cookies.set(SITE_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SITE_ACCESS_DEFAULT_TTL_DAYS * 86400,
  });
  return res;
}
