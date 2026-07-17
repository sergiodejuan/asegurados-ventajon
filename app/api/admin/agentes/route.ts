import { NextResponse } from "next/server";
import { listAgents, createAgent, getAgentByEmail, createAuditLog } from "@/lib/store";
import { requireAdminRole } from "@/lib/agentAuth";
import { toPublicAgent, ADMIN_MODULES, ADMIN_MODULE_LABELS, AGENT_ROLES, WORK_DAYS, WORK_DAY_LABELS } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminRole(request);
  if (!auth.ok) return auth.response;

  const agents = await listAgents();
  return NextResponse.json({
    ok: true,
    agents: agents.map(toPublicAgent),
    modules: ADMIN_MODULES, moduleLabels: ADMIN_MODULE_LABELS,
    roles: AGENT_ROLES, workDays: WORK_DAYS, workDayLabels: WORK_DAY_LABELS,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminRole(request);
  if (!auth.ok) return auth.response;

  let body: {
    nombre?: string; email?: string; password?: string; fotoUrl?: string;
    rol?: string; permisos?: string[]; disponibilidad?: unknown; activo?: boolean;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const nombre = (body.nombre ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!nombre) return NextResponse.json({ ok: false, error: "El nombre es obligatorio." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, error: "Revisa el email." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });

  const existing = await getAgentByEmail(email);
  if (existing) return NextResponse.json({ ok: false, error: "Ya existe un agente con ese email." }, { status: 409 });

  const rol = body.rol === "admin" ? "admin" : "agente";
  const permisos = Array.isArray(body.permisos) ? body.permisos.filter((p): p is (typeof ADMIN_MODULES)[number] => (ADMIN_MODULES as readonly string[]).includes(p) && p !== "agentes") : [];

  const agent = await createAgent({
    nombre, email, password, fotoUrl: body.fotoUrl ?? "", rol, permisos,
    disponibilidad: (body.disponibilidad as Parameters<typeof createAgent>[0]["disponibilidad"]) ?? undefined,
    activo: body.activo ?? true,
  });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "crear", modulo: "agentes",
    entidad: "agente", entidadId: agent.id, resumen: `Alta de agente: ${agent.nombre} (${agent.email}).`,
  });

  return NextResponse.json({ ok: true, agent: toPublicAgent(agent) });
}
