import { NextResponse } from "next/server";
import { autoSchema } from "@/lib/schema";
import { upsertLead, createPresupuesto } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { retellConfigured, triggerOutboundCall } from "@/lib/retell";
import { blandConfigured, triggerBlandCall, humanizeUsoVehiculo, humanizeCobertura } from "@/lib/bland";
import { ageFromDob } from "@/lib/quote";

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

  const consent = buildConsent(request, "tarificador-auto", "/tarificador-auto",
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
    "tarificador-auto",
    consent
  );

  await createPresupuesto({
    id: submissionId, leadId: id, source: "tarificador-auto", producto: "auto",
    data: {
      codigoPostal: d.codigoPostal, tipoVehiculo: d.tipoVehiculo, matricula: d.matricula,
      marcaVehiculo: d.marcaVehiculo, modeloVehiculo: d.modeloVehiculo, anioVehiculo: d.anioVehiculo,
      usoVehiculo: d.usoVehiculo, antiguedadCarnet: d.antiguedadCarnet, coberturaDeseada: d.coberturaDeseada,
      fechaNacimiento: d.fechaNacimiento, sexo: d.sexo,
      yaTieneSeguro: d.yaTieneSeguro, seguroActualImporte: d.seguroActualImporte,
      seguroActualPeriodo: d.seguroActualPeriodo, seguroActualServicios: d.seguroActualServicios,
    },
    nombre: d.nombre, telefono: d.telefono, email: d.email,
  }).catch((err) => console.error("[auto] presupuesto error", err));

  const url = process.env.LEAD_WEBHOOK_URL;
  if (url) {
    try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, source: "tarificador-auto", ...d }) }); }
    catch (err) { console.error("[auto] webhook error", err); }
  }

  if (retellConfigured() && d.autorizaContacto) {
    const call = await triggerOutboundCall({
      toNumber: d.telefono,
      leadId: id,
      source: "tarificador-auto",
      dynamicVariables: { nombre: d.nombre, producto: "seguro de auto", codigo_postal: d.codigoPostal },
    });
    if (!call.ok) console.error("[auto] retell call error", call.error);
  }

  if (blandConfigured() && d.autorizaContacto) {
    const edad = ageFromDob(d.fechaNacimiento);
    const call = await triggerBlandCall({
      toNumber: d.telefono,
      leadId: id,
      source: "tarificador-auto",
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

  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
