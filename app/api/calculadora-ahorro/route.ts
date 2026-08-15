import { NextResponse } from "next/server";
import { savingsCalculatorSchema } from "@/lib/schema";
import { upsertLead, createLlamada } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { setClientSessionCookie } from "@/lib/clientSession";
import { sendAreaClienteVerificationEmail } from "@/lib/clientVerification";
import { getSeoLandingPage, resolvePrice } from "@/lib/seoLandingPages";
import { callTriggerRateLimitFail, getClientIp } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { notifyTeamNewLead } from "@/lib/notifyTeam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Calculadora de ahorro embebida en las landings de captación SEO
// (/seguro-de-salud-*): envío ligero (teléfono + lo que paga ahora) para
// captar el lead aunque no llegue a completar el tarificador completo. El
// ahorro se recalcula aquí con el mismo precio de referencia que se le
// mostró en pantalla, para no fiarnos de un cálculo hecho en el cliente.
export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const parsed = savingsCalculatorSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  if (d.company) return NextResponse.json({ ok: true });

  const humano = await verifyTurnstile(d.turnstileToken, getClientIp(request));
  if (!humano) return NextResponse.json({ ok: false, error: "No hemos podido verificar la solicitud. Recarga la página e inténtalo de nuevo." }, { status: 403 });

  const limited = await callTriggerRateLimitFail(request, "calculadora-ahorro", d.telefono);
  if (limited) return limited;

  const page = getSeoLandingPage(d.slug);
  const precioBase = page ? await resolvePrice(page) : 35;
  const precioEstimado = precioBase * d.numAsegurados;
  const ahorro = d.pagoActual != null && d.pagoActual > precioEstimado ? Math.round(d.pagoActual - precioEstimado) : null;

  const source = "calculadora-ahorro";
  const consent = buildConsent(request, source, page?.path ?? "/",
    { privacidad: d.aceptaPrivacidad, contacto: d.autorizaContacto, comercial: false },
    d.consent);

  const { id, deduped } = await upsertLead(
    {
      nombre: d.nombre, telefono: d.telefono, producto: "salud",
      yaTieneSeguro: d.pagoActual != null, seguroActualImporte: d.pagoActual,
      numAsegurados: d.numAsegurados,
      aceptaPrivacidad: d.aceptaPrivacidad, autorizaContacto: d.autorizaContacto,
      utm: d.utm,
    },
    source,
    consent
  );

  const pagoTxt = d.pagoActual != null ? `Paga ${d.pagoActual} €/mes ahora mismo. ` : "";
  const ahorroTxt = ahorro != null ? `Ahorro estimado: ~${ahorro} €/mes.` : "Quiere ver si puede mejorar su precio actual.";
  await createLlamada({
    leadId: id, producto: "salud", source,
    motivo: `Calculadora de ahorro (${page?.badge ?? "landing SEO"}): ${pagoTxt}${d.numAsegurados} asegurado(s). ${ahorroTxt}`,
    diaLlamada: "Cualquier día", turnoLlamada: "Cualquier turno",
    nombre: d.nombre, telefono: d.telefono,
  }).catch((err) => console.error("[calculadora-ahorro] llamada error", err));

  // Ver comentario equivalente en app/api/lead/route.ts.
  if (deduped) await sendAreaClienteVerificationEmail(id);
  else setClientSessionCookie(id);

  await notifyTeamNewLead({
    leadId: id, source, nombre: d.nombre, telefono: d.telefono,
    producto: "salud",
    precioAprox: precioEstimado,
    aceptaComercial: false,
    extraNote: ahorro != null ? `Ahorro estimado ${ahorro} €/mes` : undefined,
  }).catch((err) => console.error("[calculadora-ahorro] notifyTeam error", err));

  return NextResponse.json({ ok: true, id, deduped, precioEstimado, ahorro });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
