import { NextResponse } from "next/server";
import { listLlamadas, createLlamada, storageMode, createAuditLog } from "@/lib/store";
import { LLAMADA_STATUSES, LLAMADA_STATUS_LABELS, SOURCE_LABELS } from "@/lib/crm";
import { requireModule } from "@/lib/agentAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireModule(request, "llamadas");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId");
  const producto = url.searchParams.get("producto");
  const status = url.searchParams.get("status");
  const agente = url.searchParams.get("agente");
  const from = url.searchParams.get("from"); // yyyy-mm-dd
  const to = url.searchParams.get("to"); // yyyy-mm-dd

  let llamadas = await listLlamadas();
  if (leadId) llamadas = llamadas.filter((l) => l.leadId === leadId);
  if (producto) llamadas = llamadas.filter((l) => l.producto === producto);
  if (status) llamadas = llamadas.filter((l) => l.status === status);
  if (agente) llamadas = llamadas.filter((l) => l.agente === agente);
  if (from) { const t = Date.parse(`${from}T00:00:00`); llamadas = llamadas.filter((l) => Date.parse(l.createdAt) >= t); }
  if (to) { const t = Date.parse(`${to}T23:59:59`); llamadas = llamadas.filter((l) => Date.parse(l.createdAt) <= t); }

  return NextResponse.json({
    ok: true,
    storage: storageMode(),
    sources: SOURCE_LABELS,
    statuses: LLAMADA_STATUSES,
    statusLabels: LLAMADA_STATUS_LABELS,
    llamadas,
  });
}

// Llamada registrada a mano por un agente desde la ficha de un lead ya
// existente (p.ej. si el cliente lo pide por otra vía, no a través de un
// formulario propio).
export async function POST(request: Request) {
  const auth = await requireModule(request, "llamadas");
  if (!auth.ok) return auth.response;

  let body: {
    leadId?: string; producto?: string; motivo?: string; diaLlamada?: string; turnoLlamada?: string;
    nombre?: string; telefono?: string; codigoPostal?: string;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.leadId?.trim()) return NextResponse.json({ ok: false, error: "Falta el lead." }, { status: 400 });

  const llamada = await createLlamada({
    leadId: body.leadId.trim(),
    producto: body.producto, source: "admin-manual", motivo: body.motivo,
    diaLlamada: body.diaLlamada, turnoLlamada: body.turnoLlamada,
    nombre: body.nombre, telefono: body.telefono, codigoPostal: body.codigoPostal,
  });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "crear", modulo: "llamadas",
    entidad: "llamada", entidadId: llamada.id, resumen: `Registró una llamada manual${llamada.producto ? ` de ${llamada.producto}` : ""}.`,
  });

  return NextResponse.json({ ok: true, llamada });
}
