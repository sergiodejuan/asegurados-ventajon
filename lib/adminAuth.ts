import { NextResponse } from "next/server";

// Guarda de autenticación admin compartida por todas las rutas /api/admin/*.
// Modelo simple: un token compartido (ADMIN_TOKEN) enviado por cabecera o query.
export function adminAuthFail(request: Request): NextResponse | null {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Configura ADMIN_TOKEN en las variables de entorno." }, { status: 503 });
  }
  const token = request.headers.get("x-admin-token") || new URL(request.url).searchParams.get("token");
  if (token !== secret) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  return null;
}
