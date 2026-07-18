import { NextResponse } from "next/server";
import { exitIntentSchema } from "@/lib/schema";
import { upsertLead, createLlamada } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { setClientSessionCookie } from "@/lib/clientSession";
import { sendAreaClienteVerificationEmail } from "@/lib/clientVerification";
import { callTriggerRateLimitFail, getClientIp } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCE = "exit-intent";

// Callback exprés ofrecido justo cuando el usuario va a abandonar un
// tarificador a medias. A propósito es el envío más ligero de toda la web
// (solo teléfono + un checkbox): cualquier fricción extra aquí significa
// perder el lead que se intenta salvar.
export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const parsed = exitIntentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  if (d.company) return NextResponse.json({ ok: true });

  const humano = await verifyTurnstile(d.turnstileToken, getClientIp(request));
  if (!humano) return NextResponse.json({ ok: false, error: "No hemos podido verificar la solicitud. Recarga la página e inténtalo de nuevo." }, { status: 403 });

  const limited = await callTriggerRateLimitFail(request, SOURCE, d.telefono);
  if (limited) return limited;

  const consent = buildConsent(request, SOURCE, "/tarificador",
    { privacidad: d.aceptaPrivacidad, contacto: d.autorizaContacto, comercial: false },
    d.consent);

  const { id, deduped } = await upsertLead(
    {
      nombre: d.nombre, telefono: d.telefono, codigoPostal: d.codigoPostal, producto: d.producto,
      aceptaPrivacidad: d.aceptaPrivacidad, autorizaContacto: d.autorizaContacto,
      utm: d.utm,
    },
    SOURCE,
    consent
  );

  await createLlamada({
    leadId: id, producto: d.producto, source: SOURCE,
    motivo: "Solicitud exprés (exit-intent): pidió que le llamáramos en menos de 5 minutos.",
    diaLlamada: "Cualquier día", turnoLlamada: "Cualquier turno",
    nombre: d.nombre, telefono: d.telefono, codigoPostal: d.codigoPostal,
  }).catch((err) => console.error("[exit-intent] llamada error", err));

  // Ver comentario equivalente en app/api/lead/route.ts.
  if (deduped) await sendAreaClienteVerificationEmail(id);
  else setClientSessionCookie(id);
  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
