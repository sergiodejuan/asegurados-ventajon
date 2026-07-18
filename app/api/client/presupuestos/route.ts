import { NextResponse } from "next/server";
import { findClientPresupuestos } from "@/lib/store";
import { sendAreaClienteVerificationEmail, sendAreaClienteVerificationWhatsApp } from "@/lib/clientVerification";
import { rateLimitFail } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint público (sin token admin) para que un cliente recupere el acceso
// a su área de cliente desde otro dispositivo, identificándose con su
// correo, su móvil o su número de presupuesto.
//
// Importante: un teléfono, un email o un número de presupuesto NO son un
// secreto — cualquiera que los conozca podría escribirlos aquí. Por eso este
// endpoint YA NO concede sesión ni devuelve los presupuestos al momento
// (como hacía antes): solo manda un enlace de un solo uso al email que YA
// estaba guardado en la ficha (nunca a uno nuevo que llegue en la propia
// petición). Sin ese clic, no hay acceso — ver lib/clientVerification.ts.
//
// channel: "email" (por defecto) o "whatsapp" — este segundo se ofrece en
// el área de cliente como alternativa manual si el email falla o el
// cliente lo prefiere, nunca como reintento automático.
export async function POST(request: Request) {
  const limited = await rateLimitFail(request, { bucket: "client-recover", limit: 10, windowSeconds: 3600 });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const identifier = typeof body.identifier === "string" ? body.identifier.slice(0, 160) : "";
  if (!identifier.trim()) {
    return NextResponse.json({ ok: false, error: "Introduce tu correo, tu teléfono o tu número de presupuesto." }, { status: 400 });
  }
  const channel = body.channel === "whatsapp" ? "whatsapp" : "email";

  const found = await findClientPresupuestos(identifier);
  if (!found) {
    return NextResponse.json({ ok: false, error: "No hemos encontrado ningún presupuesto con ese dato. Revisa que esté bien escrito." });
  }

  const { sent } = channel === "whatsapp"
    ? await sendAreaClienteVerificationWhatsApp(found.leadId)
    : await sendAreaClienteVerificationEmail(found.leadId);
  if (!sent) {
    return NextResponse.json({
      ok: false,
      error: channel === "whatsapp"
        ? "No hemos podido enviarte el enlace por WhatsApp. Prueba por email o escríbenos y te ayudamos a acceder."
        : "No hemos podido enviarte un enlace de verificación. Prueba por WhatsApp o escríbenos y te ayudamos a acceder.",
    });
  }

  return NextResponse.json({ ok: true, verificationSent: true, channel });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
