import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/clientVerification";
import { setClientSessionCookie } from "@/lib/clientSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Consume el token de un solo uso enviado por email o WhatsApp (ver
// lib/clientVerification.ts) y concede la sesión. Es un POST a propósito,
// disparado solo por el clic explícito del usuario en la página intermedia
// /area-cliente/verificar — nunca por la simple carga del enlace del
// correo/WhatsApp: varios proveedores de correo (Gmail, Outlook...)
// escanean automáticamente los enlaces de un mensaje nada más llegar, y esa
// petición automática consumiría un token de un solo uso si el enlace en sí
// fuera un GET a este endpoint (como ocurría antes de este cambio).
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const token = typeof body.token === "string" ? body.token : "";
  const leadId = await consumeVerificationToken(token);
  if (!leadId) {
    return NextResponse.json({ ok: false, error: "Ese enlace ya no es válido o ha caducado. Pide uno nuevo con tu correo o teléfono." });
  }

  setClientSessionCookie(leadId);
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
