import { NextResponse } from "next/server";
import { decesosSchema } from "@/lib/schema";
import { upsertLead, createPresupuesto } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { retellConfigured, triggerOutboundCall } from "@/lib/retell";
import { blandConfigured, triggerBlandCall, humanizeParaQuien } from "@/lib/bland";
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

  const parsed = decesosSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  if (d.company) return NextResponse.json({ ok: true });

  const humano = await verifyTurnstile(d.turnstileToken, getClientIp(request));
  if (!humano) return NextResponse.json({ ok: false, error: "No hemos podido verificar la solicitud. Recarga la página e inténtalo de nuevo." }, { status: 403 });

  const limited = await callTriggerRateLimitFail(request, "tarificador-decesos", d.telefono);
  if (limited) return limited;

  // Mismo tarificador, pero completado desde el widget asistente en vez de
  // la página normal: se distingue en el source para poder medirlo aparte.
  // Si viene con el UTM de una promoción, esa fuente pesa más (ver /api/lead).
  const source = promotionSourceFromUtm(d.utm) ??
    (d.origen === "asistente" ? "tarificador-decesos-widget" : "tarificador-decesos");

  const consent = buildConsent(request, source, "/tarificador-decesos",
    { privacidad: d.aceptaPrivacidad, contacto: d.autorizaContacto, comercial: d.aceptaComercial },
    d.consent);

  const { id, deduped, submissionId } = await upsertLead(
    {
      nombre: d.nombre, telefono: d.telefono, email: d.email, codigoPostal: d.codigoPostal,
      paraQuien: d.paraQuien, numAsegurados: d.numAsegurados,
      fechaNacimiento: d.fechaNacimiento, sexo: d.sexo,
      yaTieneSeguro: d.yaTieneSeguro, seguroActualImporte: d.seguroActualImporte,
      seguroActualPeriodo: d.seguroActualPeriodo, seguroActualServicios: d.seguroActualServicios,
      producto: "decesos",
      aceptaPrivacidad: d.aceptaPrivacidad, autorizaContacto: d.autorizaContacto, aceptaComercial: d.aceptaComercial,
      utm: d.utm,
    },
    source,
    consent
  );

  const presupuesto = await createPresupuesto({
    id: submissionId, leadId: id, source, producto: "decesos",
    data: {
      codigoPostal: d.codigoPostal, paraQuien: d.paraQuien, numAsegurados: d.numAsegurados,
      fechaNacimiento: d.fechaNacimiento, sexo: d.sexo,
      yaTieneSeguro: d.yaTieneSeguro, seguroActualImporte: d.seguroActualImporte,
      seguroActualPeriodo: d.seguroActualPeriodo, seguroActualServicios: d.seguroActualServicios,
    },
    nombre: d.nombre, telefono: d.telefono, email: d.email,
  }).catch((err) => { console.error("[decesos] presupuesto error", err); return null; });

  const url = process.env.LEAD_WEBHOOK_URL;
  if (url) {
    try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, source, ...d }) }); }
    catch (err) { console.error("[decesos] webhook error", err); }
  }

  if (retellConfigured() && d.autorizaContacto) {
    const call = await triggerOutboundCall({
      toNumber: d.telefono,
      leadId: id,
      source,
      dynamicVariables: { nombre: d.nombre, producto: "seguro de decesos", codigo_postal: d.codigoPostal },
    });
    if (!call.ok) console.error("[decesos] retell call error", call.error);
  }

  if (blandConfigured() && d.autorizaContacto) {
    const edad = ageFromDob(d.fechaNacimiento);
    const call = await triggerBlandCall({
      toNumber: d.telefono,
      leadId: id,
      source,
      requestData: {
        nombre: d.nombre,
        producto: "seguro de decesos",
        codigo_postal: d.codigoPostal,
        ...(edad != null ? { edad: String(edad) } : {}),
        sexo: d.sexo,
        para_quien: humanizeParaQuien(d.paraQuien),
        num_asegurados: String(d.numAsegurados ?? 1),
        ya_tiene_seguro: d.yaTieneSeguro ? "sí" : "no",
        ...(d.yaTieneSeguro && d.seguroActualImporte != null
          ? { seguro_actual_importe: `${d.seguroActualImporte} €/${d.seguroActualPeriodo}` }
          : {}),
        contexto_llamada: "acaba de calcular su precio en el tarificador de decesos",
      },
    });
    if (!call.ok) console.error("[decesos] bland call error", call.error);
  }

  if (manychatConfigured() && d.autorizaContacto) {
    const sync = await syncManychatLead({
      toNumber: d.telefono,
      nombre: d.nombre,
      source,
      producto: "seguro de decesos",
      email: d.email,
      codigoPostal: d.codigoPostal,
      precioAprox: presupuesto?.precioAprox,
      presupuestoId: submissionId,
      servicioAdicional: "Sin extras adicionales",
      utm: d.utm,
    });
    if (!sync.ok) console.error("[decesos] manychat sync error", sync.error);
  }

  // Ver comentario equivalente en app/api/lead/route.ts.
  await sendComparativaSummaryEmail({
    leadId: id, quoteId: submissionId, producto: "decesos",
    nombre: d.nombre, email: d.email, numAsegurados: d.numAsegurados,
    whatsappSummarySent: manychatThankyouConfigured() && d.autorizaContacto,
  });

  if (d.aceptaComercial) {
    await sendMetaLeadEvent({ email: d.email, telefono: d.telefono, ...capiContextFromRequest(request) });
  }

  // Ver comentario equivalente en app/api/lead/route.ts.
  if (deduped) await sendAreaClienteVerificationEmail(id);
  else setClientSessionCookie(id);

  await notifyTeamNewLead({
    leadId: id, source, presupuestoId: presupuesto?.id,
    aceptaComercial: d.aceptaComercial,
  }).catch((err) => console.error("[decesos] notifyTeam error", err));

  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
