import { NextResponse } from "next/server";

// Guarda de autenticación para los webhooks que llama ManyChat (paso
// "External Request" de una automatización) para leer o actuar sobre los
// datos de un cliente por teléfono. Un secreto compartido simple (como
// ADMIN_TOKEN) porque ManyChat solo permite cabeceras estáticas, no firma
// HMAC — se manda como header fijo en la configuración del paso.
export function manychatAuthFail(request: Request): NextResponse | null {
  const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Configura MANYCHAT_WEBHOOK_SECRET en las variables de entorno." }, { status: 503 });
  }
  const token = request.headers.get("x-manychat-secret");
  if (token !== secret) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  return null;
}
