import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/schema";
import {
  upsertLead, estimatePrecio,
  appendReferralConvertido, getReferralByCode, getReferralLandingConfig,
} from "@/lib/store";
import { sendReferralOptInEmail, sendReferralProgressEmail } from "@/lib/referralMail";
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
import { notifyTeamNewLead } from "@/lib/notifyTeam";

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
  // Prioridad de source: si el lead viene con código de referido (?ref=CODE)
  // el source es "referido" — pesa más que promoción o landing, porque
  // dice de dónde salió el LEAD, no la campaña de marketing que lo trajo.
  const source =
    (d.utm?.ref ? "referido" : null) ??
    promotionSourceFromUtm(d.utm) ??
    (d.origen === "asistente" ? "tarificador-salud-widget"
    : d.origen === "seo-landing" ? "tarificador-salud-seo"
    : d.origen === "lp-salud" || d.origen === "lp" ? "tarificador-salud-lp"
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
      nombre: d.nombre, apellido1: d.apellido1, apellido2: d.apellido2, telefono: d.telefono, email: d.email, codigoPostal: d.codigoPostal,
      documentoTipo: d.documentoTipo, documento: d.documento, codigoPostalReal: d.codigoPostalReal, fumador: d.fumador,
      aseguradosAdicionales: d.aseguradosAdicionales,
      inicio, numAsegurados: d.numAsegurados, fechaNacimiento: d.fechaNacimiento,
      sexo: d.sexo, coberturaDental: d.coberturaDental, yaTieneSeguro: d.yaTieneSeguro,
      seguroActualImporte: d.seguroActualImporte, seguroActualPeriodo: d.seguroActualPeriodo,
      seguroActualServicios: d.seguroActualServicios, producto: "salud",
      aceptaPrivacidad: d.aceptaPrivacidad, autorizaContacto: d.autorizaContacto, aceptaComercial: d.aceptaComercial,
      utm: d.utm, landingSlug: d.landingSlug,
    },
    source,
    consent
  );

  // Cambio 2026-08 (salud): un lead que solo tarifica NO crea presupuesto. El
  // presupuesto se crea cuando el usuario elige una opción ("Que te llamen",
  // ver /api/quote/interes). Aquí solo queda el lead "que ha tarificado" (su
  // actividad "form" ya lo refleja). El precio orientativo para ManyChat se
  // calcula directamente, sin necesidad de un presupuesto.
  const precioAprox = await estimatePrecio("salud", {
    codigoPostal: d.codigoPostal, inicio, numAsegurados: d.numAsegurados, fechaNacimiento: d.fechaNacimiento,
    sexo: d.sexo, coberturaDental: d.coberturaDental,
  }).catch(() => null);

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
      codigoPostalReal: d.codigoPostalReal,
      precioAprox,
      presupuestoId: undefined,
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
  }).catch((err) => console.error("[lead] comparativa summary email error (no bloqueante):", (err as Error).message));

  // Conversions API de Meta: solo si ha marcado la casilla de comunicaciones
  // comerciales (es un envío con fines publicitarios, no de gestión del
  // servicio) — mismo criterio de consentimiento que exige el propio píxel.
  if (d.aceptaComercial) {
    await sendMetaLeadEvent({ email: d.email, telefono: d.telefono, ...capiContextFromRequest(request) })
      .catch((err) => console.error("[lead] meta capi error (no bloqueante):", (err as Error).message));
  }

  // Si la ficha ya existía (mismo teléfono/email que un lead anterior), no
  // se concede sesión al instante: cualquiera que conociera ese contacto
  // podría "entrar" como esa persona. Se manda un enlace de verificación al
  // email YA guardado en la ficha en vez de autenticar sin más.
  // Best-effort: ni la verificación por email ni la cookie de sesión de
  // cliente deben tumbar el alta del lead. En particular, setClientSessionCookie
  // lanza si falta CLIENT_SESSION_SECRET en producción — un fallo de config no
  // puede impedir que el usuario vea su comparativa (el lead ya está creado).
  try {
    if (deduped) await sendAreaClienteVerificationEmail(id);
    else setClientSessionCookie(id);
  } catch (err) {
    console.error("[lead] sesión/verificación de cliente falló (no bloqueante):", (err as Error).message);
  }

  await notifyTeamNewLead({
    leadId: id, source, presupuestoId: undefined,
    aceptaComercial: d.aceptaComercial,
    extraNote: d.utm?.ref ? `Referido por código ${d.utm.ref}` : undefined,
  }).catch((err) => console.error("[lead] notifyTeam error", err));

  // Programa referidos: si llega con ?ref=CODE, registramos la conversión
  // y disparamos email de opt-in al amigo + email informativo al referidor.
  // Todo en best-effort: si algo falla no rompemos el flow del lead.
  if (d.utm?.ref) {
    try {
      const refCfg = await getReferralLandingConfig();
      const refDoc = await getReferralByCode(d.utm.ref);
      if (refCfg.programaActivo && refDoc && !refDoc.bloqueado) {
        // Anti-self-referral: no cuenta si el amigo es el propio referidor
        // (mismo lead id — impide granjear bonos con múltiples emails desde
        // la misma cuenta) ni si supera el cap anual.
        const now = new Date();
        const startYear = new Date(now.getFullYear(), 0, 1).getTime();
        const conversionesEsteAno = refDoc.convertidos.filter(
          (c) => Date.parse(c.cotizadoAt) >= startYear,
        ).length;
        if (id !== refDoc.referidorLeadId && conversionesEsteAno < refCfg.incentivo.capAnualPorReferidor) {
          await appendReferralConvertido(d.utm.ref, {
            leadId: id,
            nombre: d.nombre,
            producto: "salud",
            presupuestoId: "",
            status: "cotizado",
            cotizadoAt: new Date().toISOString(),
          });
          // Emails: al amigo (opt-in) y al referidor (progreso). Ambos
          // ignoran errores para no bloquear al usuario.
          sendReferralOptInEmail({
            toEmail: d.email,
            toNombre: d.nombre,
            code: d.utm.ref,
            leadId: id,
            referidorNombre: refDoc.referidorNombre,
            monto: refCfg.incentivo.montoReferido,
          }).catch((err) => console.error("[lead] referral opt-in email", err));
          sendReferralProgressEmail({
            toEmail: refDoc.referidorEmail,
            referidorNombre: refDoc.referidorNombre,
            amigoNombre: d.nombre,
            producto: "salud",
            monto: refCfg.incentivo.montoReferidor,
          }).catch((err) => console.error("[lead] referral progress email", err));
        }
      }
    } catch (err) {
      console.error("[lead] referral registration error", err);
    }
  }

  // Exponemos el leadId para que /comparativa pueda pedir cotizaciones reales
  // a Codeoscopic ancladas al lead (ver app/api/quote/create y
  // components/Comparativa.tsx). Ya no hay presupuesto en este punto: se crea
  // cuando el usuario elige una opción (/api/quote/interes).
  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
