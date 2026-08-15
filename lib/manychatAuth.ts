import crypto from "node:crypto";
import { NextResponse } from "next/server";

// Guarda de autenticación para los webhooks que llama ManyChat (paso
// "External Request" de una automatización) para leer o actuar sobre los
// datos de un cliente por teléfono. Un secreto compartido simple (como
// ADMIN_TOKEN) porque ManyChat solo permite cabeceras estáticas, no firma
// HMAC — se manda como header fijo en la configuración del paso.
//
// La comparación entre header recibido y secreto se hace con
// crypto.timingSafeEqual: aunque el impacto real de un timing side-channel
// sobre un !== en JS es limitado, la comparación timing-safe es trivial
// (ver auditoría, hallazgo C-01) y elimina la clase de ataque entera.
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function manychatAuthFail(request: Request): NextResponse | null {
  const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Configura MANYCHAT_WEBHOOK_SECRET en las variables de entorno." }, { status: 503 });
  }
  const token = request.headers.get("x-manychat-secret");
  if (!token || !safeEquals(token, secret)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  return null;
}
