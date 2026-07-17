import { NextResponse } from "next/server";
import { listLeads, storageMode, listAgents } from "@/lib/store";
import { SOURCE_LABELS, STATUS_LABELS, STATUSES } from "@/lib/crm";
import { requireModule } from "@/lib/agentAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireModule(request, "leads");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") ?? undefined;
  const [leads, agentList] = await Promise.all([listLeads(source || undefined), listAgents()]);

  return NextResponse.json({
    ok: true,
    storage: storageMode(),
    sources: SOURCE_LABELS,
    statuses: STATUSES,
    statusLabels: STATUS_LABELS,
    leads,
    // Lista mínima (sin datos sensibles) para poder asignar leads a cartera
    // desde la propia lista — cualquiera con acceso a "leads" puede verla.
    agents: agentList.filter((a) => a.activo).map((a) => ({ id: a.id, nombre: a.nombre })),
  });
}
