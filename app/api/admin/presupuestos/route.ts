import { NextResponse } from "next/server";
import { listPresupuestos, storageMode, createManualPresupuesto, createAuditLog } from "@/lib/store";
import { PRESUPUESTO_STATUSES, PRESUPUESTO_STATUS_LABELS, SOURCE_LABELS } from "@/lib/crm";
import { requireModule } from "@/lib/agentAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireModule(request, "presupuestos");
  if (!auth.ok) return auth.response;

  const leadId = new URL(request.url).searchParams.get("leadId");
  const all = await listPresupuestos();
  const presupuestos = leadId ? all.filter((p) => p.leadId === leadId) : all;

  return NextResponse.json({
    ok: true,
    storage: storageMode(),
    sources: SOURCE_LABELS,
    statuses: PRESUPUESTO_STATUSES,
    statusLabels: PRESUPUESTO_STATUS_LABELS,
    presupuestos,
  });
}

// Presupuesto creado a mano por un agente, vinculado a un lead ya existente
// (desde el catálogo de productos o con datos completamente personalizados).
export async function POST(request: Request) {
  const auth = await requireModule(request, "presupuestos");
  if (!auth.ok) return auth.response;

  let body: {
    leadId?: string; producto?: string; compania?: string; precio?: number;
    condiciones?: string; servicios?: string[]; codeoscopicInsuranceId?: string;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.leadId) return NextResponse.json({ ok: false, error: "Falta el lead." }, { status: 400 });
  if (body.producto !== "salud" && body.producto !== "vida" && body.producto !== "auto" && body.producto !== "decesos") {
    return NextResponse.json({ ok: false, error: "Producto no válido." }, { status: 400 });
  }
  if (!body.compania?.trim()) return NextResponse.json({ ok: false, error: "Falta la aseguradora." }, { status: 400 });

  const presupuesto = await createManualPresupuesto({
    leadId: body.leadId, producto: body.producto, compania: body.compania.trim(),
    precio: typeof body.precio === "number" && !Number.isNaN(body.precio) ? body.precio : null,
    condiciones: body.condiciones, servicios: body.servicios,
    codeoscopicInsuranceId: typeof body.codeoscopicInsuranceId === "string" ? body.codeoscopicInsuranceId : undefined,
  });
  if (!presupuesto) return NextResponse.json({ ok: false, error: "Lead no encontrado." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "crear", modulo: "presupuestos",
    entidad: "presupuesto", entidadId: presupuesto.id, resumen: `Creó un presupuesto manual de ${presupuesto.producto} con ${body.compania}.`,
  });

  return NextResponse.json({ ok: true, presupuesto });
}
