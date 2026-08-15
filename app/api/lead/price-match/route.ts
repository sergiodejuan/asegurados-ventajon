import { NextResponse } from "next/server";
import { priceMatchSchema } from "@/lib/schema";
import { upsertLead } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { setClientSessionCookie } from "@/lib/clientSession";
import { sendAreaClienteVerificationEmail } from "@/lib/clientVerification";
import { sendMetaLeadEvent, capiContextFromRequest } from "@/lib/metaCapi";
import { callTriggerRateLimitFail, getClientIp } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { notifyTeamNewLead } from "@/lib/notifyTeam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint del flujo "igualación de precio" (/precio-mejor-garantizado y del
// módulo de rescate dentro de la comparativa). Recibe el precio que el
// usuario ya tiene (compañía + importe + periodicidad, opcionalmente una
// captura del presupuesto), crea/actualiza el lead con source="price-match"
// y guarda el bloque `priceMatch` en la ficha para que el asesor lo trabaje.
//
// El origen concreto (landing dedicada vs comparativa) se distingue en el
// campo `origen`: 'landing' → source="price-match"; 'comparativa' →
// source="price-match-comparativa". Los dos aparecen en /admin/utm y se
// pueden medir por separado.
export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  // El campo `origen` puede llegar en el body para distinguir dónde se envió
  // el formulario. No forma parte del schema estricto — lo leemos aparte.
  const origen = typeof (raw as { origen?: unknown } | null)?.origen === "string"
    ? (raw as { origen: string }).origen
    : "landing";

  const parsed = priceMatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  if (d.company) return NextResponse.json({ ok: true }); // honeypot

  const humano = await verifyTurnstile(d.turnstileToken, getClientIp(request));
  if (!humano) return NextResponse.json({ ok: false, error: "No hemos podido verificar la solicitud. Recarga la página e inténtalo de nuevo." }, { status: 403 });

  const source = origen === "comparativa" ? "price-match-comparativa" : "price-match";
  const limited = await callTriggerRateLimitFail(request, source, d.telefono);
  if (limited) return limited;

  const referer = request.headers.get("referer") || "";
  let pageOrigen = "/precio-mejor-garantizado";
  try { if (referer) pageOrigen = new URL(referer).pathname; } catch { /* referer no parseable */ }

  const consent = buildConsent(request, source, pageOrigen,
    { privacidad: d.aceptaPrivacidad, contacto: d.autorizaContacto, comercial: d.aceptaComercial },
    d.consent);

  const now = new Date().toISOString();
  const { id, deduped } = await upsertLead(
    {
      nombre: d.nombre, telefono: d.telefono, email: d.email, codigoPostal: d.codigoPostal,
      producto: d.producto,
      priceMatch: {
        companiaActual: d.companiaActual,
        precioActual: d.precioActual,
        periodicidad: d.periodicidad,
        capturaUrl: d.capturaUrl ?? "",
        comentario: d.comentario ?? "",
        solicitadoAt: now,
      },
      aceptaPrivacidad: d.aceptaPrivacidad, autorizaContacto: d.autorizaContacto, aceptaComercial: d.aceptaComercial,
      utm: d.utm,
    },
    source,
    consent
  );

  // Conversions API de Meta: solo si acepta comunicaciones comerciales
  // (mismo criterio de consentimiento que el resto de la web).
  if (d.aceptaComercial) {
    await sendMetaLeadEvent({ email: d.email, telefono: d.telefono, ...capiContextFromRequest(request) });
  }

  // Área de cliente sin registro: si la ficha ya existía, mandamos enlace de
  // verificación al email guardado (evita suplantación); si es nueva, damos
  // sesión al momento. Mismo criterio que /api/lead.
  if (deduped) await sendAreaClienteVerificationEmail(id);
  else setClientSessionCookie(id);

  await notifyTeamNewLead({
    leadId: id, source, nombre: d.nombre, telefono: d.telefono, email: d.email,
    producto: d.producto, codigoPostal: d.codigoPostal,
    precioAprox: d.precioActual,
    aceptaComercial: d.aceptaComercial,
    extraNote: `Igualación de precio · ${d.companiaActual} · ${d.precioActual} €/${d.periodicidad}`,
  }).catch((err) => console.error("[price-match] notifyTeam error", err));

  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
