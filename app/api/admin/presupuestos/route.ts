import { NextResponse } from "next/server";
import { listPresupuestos, storageMode } from "@/lib/store";
import { PRESUPUESTO_STATUSES, PRESUPUESTO_STATUS_LABELS, SOURCE_LABELS } from "@/lib/crm";
import { adminAuthFail } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  const presupuestos = await listPresupuestos();

  return NextResponse.json({
    ok: true,
    storage: storageMode(),
    sources: SOURCE_LABELS,
    statuses: PRESUPUESTO_STATUSES,
    statusLabels: PRESUPUESTO_STATUS_LABELS,
    presupuestos,
  });
}
