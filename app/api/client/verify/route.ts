import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/clientVerification";
import { setClientSessionCookie } from "@/lib/clientSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Enlace de un solo clic desde el correo de verificación (ver
// lib/clientVerification.ts): confirma el token, concede la sesión y manda
// al área de cliente. Es un GET navegable a propósito, porque lo abre el
// cliente de correo del usuario, no un fetch de la propia web.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const leadId = await consumeVerificationToken(token);

  const dest = new URL("/area-cliente", request.url);
  if (!leadId) {
    dest.searchParams.set("error", "token-invalido");
    return NextResponse.redirect(dest);
  }

  setClientSessionCookie(leadId);
  dest.searchParams.set("verificado", "1");
  return NextResponse.redirect(dest);
}
