import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/schema";
import { upsertLead } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { retellConfigured, triggerOutboundCall } from "@/lib/retell";

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

  const { id, deduped } = await upsertLead(
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

  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
