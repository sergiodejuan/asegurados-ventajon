import { NextResponse } from "next/server";
import { listLeads, storageMode } from "@/lib/store";
import { SOURCE_LABELS, STATUS_LABELS, STATUSES } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function auth(request: Request): NextResponse | null {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Configura ADMIN_TOKEN en las variables de entorno." },
      { status: 503 }
    );
  }
  if (request.headers.get("x-admin-token") !== secret) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = auth(request);
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
