import { NextResponse } from "next/server";
import { listLeads, storageMode } from "@/lib/store";
import { SOURCE_LABELS, STATUS_LABELS, STATUSES } from "@/lib/crm";
import { adminAuthFail } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") ?? undefined;
  const leads = await listLeads(source || undefined);

  return NextResponse.json({
    ok: true,
    storage: storageMode(),
    sources: SOURCE_LABELS,
    statuses: STATUSES,
    statusLabels: STATUS_LABELS,
    leads,
  });
}
