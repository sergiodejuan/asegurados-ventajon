import { NextResponse } from "next/server";
import { autoSchema } from "@/lib/schema";
import { upsertLead, createPresupuesto } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { retellConfigured, triggerOutboundCall } from "@/lib/retell";
import { blandConfigured, triggerBlandCall, humanizeUsoVehiculo, humanizeCobertura } from "@/lib/bland";
import { manychatConfigured, manychatThankyouConfigured, syncManychatLead } from "@/lib/manychat";
import { setClientSessionCookie } from "@/lib/clientSession";
import { sendAreaClienteVerificationEmail } from "@/lib/clientVerification";
import { sendComparativaSummaryEmail } from "@/lib/comparativaEmail";
import { sendMetaLeadEvent, capiContextFromRequest } from "@/lib/metaCapi";
import { ageFromDob } from "@/lib/quote";
import { callTriggerRateLimitFail } from "@/lib/rateLimit";
import { promotionSourceFromUtm } from "@/lib/promotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const parsed = autoSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  if (d.company) return NextResponse.json({ ok: true });

  const limited = await callTriggerRateLimitFail(request, "tarificador-auto", d.telefono);
  if (limited) return limited;

  // Mismo tarificador, pero completado desde el widget asistente en vez de
  // la página normal: se distingue en el source para poder medirlo aparte.
  // Si viene con el UTM de una promoción, esa fuente pesa más (ver /api/lead).
  const source = promotionSourceFromUtm(d.utm) ??
    (d.origen === "asistente" ? "tarificador-auto-widget" : "tarificador-auto");

  const consent = buildConsent(request, source, "/tarificador-auto",
    { privacidad: d.aceptaPrivacidad, contacto: d.autorizaContacto, comercial: d.aceptaComercial },
    d.consent);

  const { id, deduped, submissionId } = await upsertLead(
    {
      nombre: d.nombre, telefono: d.telefono, email: d.email, codigoPostal: d.codigoPostal,
      tipoVehiculo: d.tipoVehiculo, matricula: d.matricula, marcaVehiculo: d.marcaVehiculo,
      modeloVehiculo: d.modeloVehiculo, anioVehiculo: d.anioVehiculo, usoVehiculo: d.usoVehiculo,
      antiguedadCarnet: d.antiguedadCarnet, coberturaDeseada: d.coberturaDeseada,
      fechaNacimiento: d.fechaNacimiento, sexo: d.sexo,
      yaTieneSeguro: d.yaTieneSeguro, seguroActualImporte: d.seguroActualImporte,
      seguroActualPeriodo: d.seguroActualPeriodo, seguroActualServicios: d.seguroActualServicios,
      producto: "auto",
      aceptaPrivacidad: d.aceptaPrivacidad, autorizaContacto: d.autorizaContacto, aceptaComercial: d.aceptaComercial,
      utm: d.utm,
    },
    source,
    consent
  );

  const presupuesto = await createPresupuesto({
    id: submissionId, leadId: id, source, producto: "auto",
    data: {
      codigoPostal: d.codigoPostal, tipoVehiculo: d.tipoVehiculo, matricula: d.matricula,
      marcaVehiculo: d.marcaVehiculo, modeloVehiculo: d.modeloVehiculo, anioVehiculo: d.anioVehiculo,
      usoVehiculo: d.usoVehiculo, antiguedadCarnet: d.antiguedadCarnet, coberturaDeseada: d.coberturaDeseada,
      fechaNacimiento: d.fechaNacimiento, sexo: d.sexo,
      yaTieneSeguro: d.yaTieneSeguro, seguroActualImporte: d.seguroActualImporte,
      seguroActualPeriodo: d.seguroActualPeriodo, seguroActualServicios: d.seguroActualServicios,
    },
    nombre: d.nombre, telefono: d.telefono, email: d.email,
  }).catch((err) => { console.error("[auto] presupuesto error", err); return null; });

  const url = process.env.LEAD_WEBHOOK_URL;
  if (url) {
    try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, source, ...d }) }); }
    catch (err) { console.error("[auto] webhook error", err); }
  }

  if (retellConfigured() && d.autorizaContacto) {
    const call = await triggerOutboundCall({
      toNumber: d.telefono,
      leadId: id,
      source,
      dynamicVariables: { nombre: d.nombre, producto: "seguro de auto", codigo_postal: d.codigoPostal },
    });
    if (!call.ok) console.error("[auto] retell call error", call.error);
  }

  if (blandConfigured() && d.autorizaContacto) {
    const edad = ageFromDob(d.fechaNacimiento);
    const call = await triggerBlandCall({
      toNumber: d.telefono,
      leadId: id,
      source,
      requestData: {
        nombre: d.nombre,
        producto: "seguro de auto",
        codigo_postal: d.codigoPostal,
        ...(edad != null ? { edad: String(edad) } : {}),
        sexo: d.sexo,
        tipo_vehiculo: d.tipoVehiculo,
        ...(d.matricula ? { matricula: d.matricula } : {}),
        ...(d.marcaVehiculo ? { vehiculo: `${d.marcaVehiculo} ${d.modeloVehiculo ?? ""}`.trim() } : {}),
        uso_vehiculo: humanizeUsoVehiculo(d.usoVehiculo),
        cobertura_deseada: humanizeCobertura(d.coberturaDeseada),
        ya_tiene_seguro: d.yaTieneSeguro ? "sí" : "no",
        ...(d.yaTieneSeguro && d.seguroActualImporte != null
          ? { seguro_actual_importe: `${d.seguroActualImporte} €/${d.seguroActualPeriodo}` }
          : {}),
        contexto_llamada: "acaba de calcular su precio en el tarificador de auto",
      },
    });
    if (!call.ok) console.error("[auto] bland call error", call.error);
  }

  if (manychatConfigured() && d.autorizaContacto) {
    const sync = await syncManychatLead({
      toNumber: d.telefono,
      nombre: d.nombre,
      source,
      producto: "seguro de auto",
      email: d.email,
      codigoPostal: d.codigoPostal,
      precioAprox: presupuesto?.precioAprox,
      presupuestoId: submissionId,
      servicioAdicional: (() => { const c = humanizeCobertura(d.coberturaDeseada); return c.charAt(0).toUpperCase() + c.slice(1); })(),
      utm: d.utm,
    });
    if (!sync.ok) console.error("[auto] manychat sync error", sync.error);
  }

  // Ver comentario equivalente en app/api/lead/route.ts.
  await sendComparativaSummaryEmail({
    leadId: id, quoteId: submissionId, producto: "auto",
    nombre: d.nombre, email: d.email, antiguedadCarnet: d.antiguedadCarnet, coberturaDeseada: d.coberturaDeseada,
    whatsappSummarySent: manychatThankyouConfigured() && d.autorizaContacto,
  });

  if (d.aceptaComercial) {
    await sendMetaLeadEvent({ email: d.email, telefono: d.telefono, ...capiContextFromRequest(request) });
  }

  // Ver comentario equivalente en app/api/lead/route.ts.
  if (deduped) await sendAreaClienteVerificationEmail(id);
  else setClientSessionCookie(id);
  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
