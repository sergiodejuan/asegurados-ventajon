import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/schema";
import { upsertLead, createPresupuesto } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { retellConfigured, triggerOutboundCall } from "@/lib/retell";
import { blandConfigured, triggerBlandCall, humanizeInicio } from "@/lib/bland";
import { manychatConfigured, syncManychatLead } from "@/lib/manychat";
import { ageFromDob } from "@/lib/quote";

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

  const consent = buildConsent(request, "tarificador-salud", "/tarificador",
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
    "tarificador-salud",
    consent
  );

  const presupuesto = await createPresupuesto({
    id: submissionId, leadId: id, source: "tarificador-salud", producto: "salud",
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
    try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, source: "tarificador-salud", ...d }) }); }
    catch (err) { console.error("[lead] webhook error", err); }
  }

  if (retellConfigured() && d.autorizaContacto) {
    const call = await triggerOutboundCall({
      toNumber: d.telefono,
      leadId: id,
      source: "tarificador-salud",
      dynamicVariables: { nombre: d.nombre, producto: "seguro de salud", codigo_postal: d.codigoPostal },
    });
    if (!call.ok) console.error("[lead] retell call error", call.error);
  }

  if (blandConfigured() && d.autorizaContacto) {
    const edad = ageFromDob(d.fechaNacimiento);
    const call = await triggerBlandCall({
      toNumber: d.telefono,
      leadId: id,
      source: "tarificador-salud",
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
      source: "tarificador-salud",
      producto: "seguro de salud",
      email: d.email,
      codigoPostal: d.codigoPostal,
      precioAprox: presupuesto?.precioAprox,
      presupuestoId: submissionId,
      utm: d.utm,
    });
    if (!sync.ok) console.error("[lead] manychat sync error", sync.error);
  }

  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
