import { NextResponse } from "next/server";
import { listLeads } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import { csvField as esc } from "@/lib/csv";
import type { Lead } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS: { key: string; get: (l: Lead) => unknown }[] = [
  { key: "id", get: (l) => l.id },
  { key: "creado", get: (l) => l.createdAt },
  { key: "actualizado", get: (l) => l.updatedAt },
  { key: "fuente_principal", get: (l) => l.source },
  { key: "fuentes", get: (l) => l.sources.join(" | ") },
  { key: "producto", get: (l) => l.producto },
  { key: "estado", get: (l) => l.status },
  { key: "proximo_paso", get: (l) => l.nextStep },
  { key: "nombre", get: (l) => l.nombre },
  { key: "telefono", get: (l) => l.telefono },
  { key: "email", get: (l) => l.email },
  { key: "codigo_postal", get: (l) => l.codigoPostal },
  { key: "inicio", get: (l) => l.inicio },
  { key: "num_asegurados", get: (l) => l.numAsegurados },
  { key: "cobertura_dental", get: (l) => (l.coberturaDental == null ? "" : l.coberturaDental ? "sí" : "no") },
  { key: "motivo_vida", get: (l) => l.motivo },
  { key: "fumador", get: (l) => (l.fumador == null ? "" : l.fumador ? "sí" : "no") },
  { key: "tipo_vehiculo", get: (l) => l.tipoVehiculo },
  { key: "matricula", get: (l) => l.matricula },
  { key: "marca_vehiculo", get: (l) => l.marcaVehiculo },
  { key: "modelo_vehiculo", get: (l) => l.modeloVehiculo },
  { key: "anio_vehiculo", get: (l) => l.anioVehiculo },
  { key: "uso_vehiculo", get: (l) => l.usoVehiculo },
  { key: "antiguedad_carnet", get: (l) => l.antiguedadCarnet },
  { key: "cobertura_deseada", get: (l) => l.coberturaDeseada },
  { key: "fecha_nacimiento", get: (l) => l.fechaNacimiento },
  { key: "sexo", get: (l) => l.sexo },
  { key: "ya_tiene_seguro", get: (l) => (l.yaTieneSeguro == null ? "" : l.yaTieneSeguro ? "sí" : "no") },
  { key: "seguro_actual_importe", get: (l) => l.seguroActualImporte },
  { key: "seguro_actual_periodo", get: (l) => l.seguroActualPeriodo },
  { key: "seguro_actual_servicios", get: (l) => (l.seguroActualServicios ?? []).join(" | ") },
  { key: "acepta_privacidad", get: (l) => (l.aceptaPrivacidad ? "sí" : "no") },
  { key: "autoriza_contacto", get: (l) => (l.autorizaContacto ? "sí" : "no") },
  { key: "acepta_comercial", get: (l) => (l.aceptaComercial ? "sí" : "no") },
  // Auditoría del último consentimiento
  { key: "consent_at", get: (l) => l.consents?.[0]?.at ?? "" },
  { key: "consent_ip", get: (l) => l.consents?.[0]?.ip ?? "" },
  { key: "consent_dispositivo", get: (l) => l.consents?.[0]?.userAgent ?? "" },
  { key: "consent_pagina", get: (l) => l.consents?.[0]?.page ?? "" },
  { key: "consent_privacidad_at", get: (l) => l.consents?.[0]?.privacidad?.at ?? "" },
  { key: "consent_contacto_at", get: (l) => l.consents?.[0]?.contacto?.at ?? "" },
  { key: "consent_comercial_at", get: (l) => l.consents?.[0]?.comercial?.at ?? "" },
  { key: "num_consentimientos", get: (l) => l.consents?.length ?? 0 },
  { key: "utm_source", get: (l) => l.utm?.source ?? "" },
  { key: "utm_medium", get: (l) => l.utm?.medium ?? "" },
  { key: "utm_campaign", get: (l) => l.utm?.campaign ?? "" },
  { key: "utm_content", get: (l) => l.utm?.content ?? "" },
  { key: "utm_term", get: (l) => l.utm?.term ?? "" },
  { key: "landing_page", get: (l) => l.utm?.landingPage ?? "" },
  { key: "referrer", get: (l) => l.utm?.referrer ?? "" },
];

export async function GET(request: Request) {
  const auth = await requireModule(request, "leads");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const producto = searchParams.get("producto");
  const status = searchParams.get("status");

  let leads = await listLeads(source || undefined);
  if (producto) leads = leads.filter((l) => l.producto === producto);
  if (status) leads = leads.filter((l) => l.status === status);

  const header = COLUMNS.map((c) => esc(c.key)).join(",");
  const rows = leads.map((l) => COLUMNS.map((c) => esc(c.get(l))).join(","));
  const csv = "\uFEFF" + [header, ...rows].join("\r\n"); // BOM para Excel

  const date = new Date().toISOString().slice(0, 10);
  const tag = [source, producto, status].filter(Boolean).join("-") || "todos";
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-asegurados-${tag}-${date}.csv"`,
    },
  });
}
