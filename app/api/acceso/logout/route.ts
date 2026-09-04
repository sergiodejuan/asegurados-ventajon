import { NextResponse } from "next/server";
import { SITE_ACCESS_COOKIE } from "@/lib/siteAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/acceso/logout — borra la cookie de acceso y devuelve a /acceso.
// No requiere sesión; una petición sin cookie simplemente no hace nada
// visible al usuario.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SITE_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
