import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/schema";
import { upsertLead, createPresupuesto } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { retellConfigured, triggerOutboundCall } from "@/lib/retell";
import { blandConfigured, triggerBlandCall, humanizeInicio } from "@/lib/bland";
import { manychatConfigured, manychatThankyouConfigured, syncManychatLead } from "@/lib/manychat";
import { setClientSessionCookie } from "@/lib/clientSession";
import { sendAreaClienteVerificationEmail } from "@/lib/clientVerification";
import { sendComparativaSummaryEmail } from "@/lib/comparativaEmail";
import { sendMetaLeadEvent, capiContextFromRequest } from "@/lib/metaCapi";
import { ageFromDob } from "@/lib/quote";
import { callTriggerRateLimitFail, getClientIp } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { promotionSourceFromUtm } from "@/lib/promotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  if (d.company) return NextResponse.json({ ok: true }); // honeypot

  const humano = await verifyTurnstile(d.turnstileToken, getClientIp(request));
  if (!humano) return NextResponse.json({ ok: false, error: "No hemos podido verificar la solicitud. Recarga la página e inténtalo de nuevo." }, { status: 403 });

  // Este envío puede disparar una llamada automática real (Retell/Bland AI)
  // si autoriza contacto: limita por IP y, sobre todo, por el teléfono
  // destino, para que no se pueda usar el formulario para acosar a un
  // tercero con llamadas repetidas.
  const limited = await callTriggerRateLimitFail(request, "tarificador-salud", d.telefono);
  if (limited) return limited;

  // Mismo tarificador, pero completado desde el widget asistente o desde una
  // landing de captación SEO (/seguro-de-salud-*) en vez de la página normal:
  // se distingue en el source para poder medirlo aparte. Si el envío llega
  // con el UTM de una promoción, esa es la fuente que queda en el lead —
  // pesa más que el origen genérico, porque dice de qué promoción concreta vino.
  const source =
    promotionSourceFromUtm(d.utm) ??
    (d.origen === "asistente" ? "tarificador-salud-widget"
    : d.origen === "seo-landing" ? "tarificador-salud-seo"
    : "tarificador-salud");

  // La página exacta de origen viaja en el Referer del navegador — útil para
  // saber desde cuál de las landings SEO llegó este lead concreto sin tener
  // que crear un source distinto por cada una.
  const referer = request.headers.get("referer") || "";
  let pageOrigen = "/tarificador";
  try { if (referer) pageOrigen = new URL(referer).pathname; } catch { /* referer no parseable, se deja el valor por defecto */ }

  const consent = buildConsent(request, source, pageOrigen,
    { privacidad: d.aceptaPrivacidad, contacto: d.autorizaContacto, comercial: d.aceptaComercial },
    d.consent);

  const inicio = d.inicio === "fecha_personalizada" && d.fechaInicioPersonalizada
    ? d.fechaInicioPersonalizada
    : d.inicio;

  const { id, deduped, submissionId } = await upsertLead(
    {
      nombre: d.nombre, telefono: d.telefono, email: d.email, codigoPostal: d.codigoPostal,
      inicio, numAsegurados: d.numAsegurados, fechaNacimiento: d.fechaNacimiento,
      sexo: d.sexo, coberturaDental: d.coberturaDental, yaTieneSeguro: d.yaTieneSeguro,
      seguroActualImporte: d.seguroActualImporte, seguroActualPeriodo: d.seguroActualPeriodo,
      seguroActualServicios: d.seguroActualServicios, producto: "salud",
      aceptaPrivacidad: d.aceptaPrivacidad, autorizaContacto: d.autorizaContacto, aceptaComercial: d.aceptaComercial,
      utm: d.utm,
    },
    source,
    consent
  );

  const presupuesto = await createPresupuesto({
    id: submissionId, leadId: id, source, producto: "salud",
    data: {
      codigoPostal: d.codigoPostal, inicio, numAsegurados: d.numAsegurados, fechaNacimiento: d.fechaNacimiento,
      sexo: d.sexo, coberturaDental: d.coberturaDental, yaTieneSeguro: d.yaTieneSeguro,
      seguroActualImporte: d.seguroActualImporte, seguroActualPeriodo: d.seguroActualPeriodo,
      seguroActualServicios: d.seguroActualServicios,
    },
    nombre: d.nombre, telefono: d.telefono, email: d.email,
  }).catch((err) => { console.error("[lead] presupuesto error", err); return null; });

  const url = process.env.LEAD_WEBHOOK_URL;
  if (url) {
    try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, source, ...d }) }); }
    catch (err) { console.error("[lead] webhook error", err); }
  }

  if (retellConfigured() && d.autorizaContacto) {
    const call = await triggerOutboundCall({
      toNumber: d.telefono,
      leadId: id,
      source,
      dynamicVariables: { nombre: d.nombre, producto: "seguro de salud", codigo_postal: d.codigoPostal },
    });
    if (!call.ok) console.error("[lead] retell call error", call.error);
  }

  if (blandConfigured() && d.autorizaContacto) {
    const edad = ageFromDob(d.fechaNacimiento);
    const call = await triggerBlandCall({
      toNumber: d.telefono,
      leadId: id,
      source,
      requestData: {
        nombre: d.nombre,
        producto: "seguro de salud",
        codigo_postal: d.codigoPostal,
        ...(edad != null ? { edad: String(edad) } : {}),
        sexo: d.sexo,
        num_asegurados: String(d.numAsegurados),
        cobertura_dental: d.coberturaDental ? "sí" : "no",
        ya_tiene_seguro: d.yaTieneSeguro ? "sí" : "no",
        ...(d.yaTieneSeguro && d.seguroActualImporte != null
          ? { seguro_actual_importe: `${d.seguroActualImporte} €/${d.seguroActualPeriodo}` }
          : {}),
        ...(humanizeInicio(inicio) ? { inicio: humanizeInicio(inicio) } : {}),
        contexto_llamada: "acaba de calcular su precio en el tarificador de salud",
      },
    });
    if (!call.ok) console.error("[lead] bland call error", call.error);
  }

  if (manychatConfigured() && d.autorizaContacto) {
    const sync = await syncManychatLead({
      toNumber: d.telefono,
      nombre: d.nombre,
      source,
      producto: "seguro de salud",
      email: d.email,
      codigoPostal: d.codigoPostal,
      precioAprox: presupuesto?.precioAprox,
      presupuestoId: submissionId,
      servicioAdicional: d.coberturaDental ? "Cobertura dental" : "Sin cobertura dental",
      utm: d.utm,
    });
    if (!sync.ok) console.error("[lead] manychat sync error", sync.error);
  }

  // Correo con el resumen de la comparativa + CTA de "solicitar llamada" por
  // cada aseguradora — mismo momento en el que ya se sincroniza con ManyChat
  // y se dispara la llamada automática. No-op sin RESEND_API_KEY o sin email.
  await sendComparativaSummaryEmail({
    leadId: id, quoteId: submissionId, producto: "salud",
    nombre: d.nombre, email: d.email, numAsegurados: d.numAsegurados, coberturaDental: d.coberturaDental,
    whatsappSummarySent: manychatThankyouConfigured() && d.autorizaContacto,
  });

  // Conversions API de Meta: solo si ha marcado la casilla de comunicaciones
  // comerciales (es un envío con fines publicitarios, no de gestión del
  // servicio) — mismo criterio de consentimiento que exige el propio píxel.
  if (d.aceptaComercial) {
    await sendMetaLeadEvent({ email: d.email, telefono: d.telefono, ...capiContextFromRequest(request) });
  }

  // Si la ficha ya existía (mismo teléfono/email que un lead anterior), no
  // se concede sesión al instante: cualquiera que conociera ese contacto
  // podría "entrar" como esa persona. Se manda un enlace de verificación al
  // email YA guardado en la ficha en vez de autenticar sin más.
  if (deduped) await sendAreaClienteVerificationEmail(id);
  else setClientSessionCookie(id);
  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
