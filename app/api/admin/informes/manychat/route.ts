import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { fetchManychatReport, sheetsReportConfigured } from "@/lib/sheetsReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Informe "Leads ManyChat" para /admin/informes/manychat: lee en vivo el
// DASHBOARD de la hoja de Google Sheets a través del Web App de Apps Script
// (server-side, el secreto nunca llega al navegador). ?refresh=1 salta la
// caché corta. Gate: módulo "informes".
export async function GET(request: Request) {
  const auth = await requireModule(request, "informes");
  if (!auth.ok) return auth.response;

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  const report = await fetchManychatReport({ refresh });

  return NextResponse.json({
    ok: report.ok,
    configured: sheetsReportConfigured(),
    report,
  });
}

export function POST() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
