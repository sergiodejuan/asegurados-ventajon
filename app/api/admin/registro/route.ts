import { NextResponse } from "next/server";
import { listAuditLogs, listAgents } from "@/lib/store";
import { requireAdminRole } from "@/lib/agentAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Registro histórico general de acciones en el panel — solo visible para
// administradores (muestra la actividad de todo el equipo, no solo la
// propia).
export async function GET(request: Request) {
  const auth = await requireAdminRole(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const agenteId = url.searchParams.get("agenteId") ?? undefined;
  const modulo = url.searchParams.get("modulo") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 200) || 200;

  const [logs, agents] = await Promise.all([listAuditLogs({ agenteId, modulo, limit }), listAgents()]);
  return NextResponse.json({ ok: true, logs, agents: agents.map((a) => ({ id: a.id, nombre: a.nombre })) });
}
