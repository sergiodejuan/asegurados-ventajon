import { NextResponse } from "next/server";
import { listPresupuestos } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import type { Presupuesto } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

const COLUMNS: { key: string; get: (p: Presupuesto) => unknown }[] = [
  { key: "id", get: (p) => p.id },
  { key: "lead_id", get: (p) => p.leadId },
  { key: "creado", get: (p) => p.createdAt },
  { key: "actualizado", get: (p) => p.updatedAt },
  { key: "cerrado", get: (p) => p.closedAt },
  { key: "estado", get: (p) => p.status },
  { key: "producto", get: (p) => p.producto },
  { key: "precio_aprox", get: (p) => p.precioAprox },
  { key: "nombre", get: (p) => p.nombre },
  { key: "telefono", get: (p) => p.telefono },
  { key: "email", get: (p) => p.email },
  { key: "codigo_postal", get: (p) => p.data.codigoPostal },
  { key: "inicio", get: (p) => p.data.inicio },
  { key: "num_asegurados", get: (p) => p.data.numAsegurados },
  { key: "cobertura_dental", get: (p) => p.data.coberturaDental },
  { key: "motivo_vida", get: (p) => p.data.motivo },
  { key: "fumador", get: (p) => p.data.fumador },
  { key: "fecha_nacimiento", get: (p) => p.data.fechaNacimiento },
  { key: "sexo", get: (p) => p.data.sexo },
  { key: "ya_tiene_seguro", get: (p) => p.data.yaTieneSeguro },
  { key: "seguro_actual_importe", get: (p) => p.data.seguroActualImporte },
  { key: "num_notas", get: (p) => p.notas.length },
];

export async function GET(request: Request) {
  const auth = await requireModule(request, "presupuestos");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const producto = searchParams.get("producto");

  let presupuestos = await listPresupuestos();
  if (status) presupuestos = presupuestos.filter((p) => p.status === status);
  if (producto) presupuestos = presupuestos.filter((p) => p.producto === producto);

  const header = COLUMNS.map((c) => esc(c.key)).join(",");
  const rows = presupuestos.map((p) => COLUMNS.map((c) => esc(c.get(p))).join(","));
  const csv = "﻿" + [header, ...rows].join("\r\n"); // BOM para Excel

  const date = new Date().toISOString().slice(0, 10);
  const tag = [producto, status].filter(Boolean).join("-") || "todos";
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="presupuestos-asegurados-${tag}-${date}.csv"`,
    },
  });
}
