import { NextResponse } from "next/server";
import { getAgent, updateAgent, deleteAgent, getAgentByEmail, createAuditLog } from "@/lib/store";
import { requireAdminRole } from "@/lib/agentAuth";
import { toPublicAgent, ADMIN_MODULES } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminRole(request);
  if (!auth.ok) return auth.response;

  const agent = await getAgent(params.id);
  if (!agent) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, agent: toPublicAgent(agent) });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminRole(request);
  if (!auth.ok) return auth.response;

  let body: {
    nombre?: string; email?: string; password?: string; fotoUrl?: string;
    rol?: string; permisos?: string[]; disponibilidad?: unknown; activo?: boolean;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (body.email) {
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, error: "Revisa el email." }, { status: 400 });
    const existing = await getAgentByEmail(email);
    if (existing && existing.id !== params.id) return NextResponse.json({ ok: false, error: "Ya existe un agente con ese email." }, { status: 409 });
  }
  if (body.password && body.password.length < 8) {
    return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  const permisos = Array.isArray(body.permisos)
    ? body.permisos.filter((p): p is (typeof ADMIN_MODULES)[number] => (ADMIN_MODULES as readonly string[]).includes(p) && p !== "agentes")
    : undefined;

  const agent = await updateAgent(params.id, {
    nombre: body.nombre, email: body.email, password: body.password || undefined, fotoUrl: body.fotoUrl,
    rol: body.rol === "admin" ? "admin" : body.rol === "agente" ? "agente" : undefined,
    permisos, disponibilidad: body.disponibilidad as Parameters<typeof updateAgent>[1]["disponibilidad"],
    activo: body.activo,
  });
  if (!agent) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "agentes",
    entidad: "agente", entidadId: agent.id, resumen: `Actualizó la ficha de ${agent.nombre}.`,
  });

  return NextResponse.json({ ok: true, agent: toPublicAgent(agent) });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminRole(request);
  if (!auth.ok) return auth.response;

  const agent = await getAgent(params.id);
  const removed = await deleteAgent(params.id);
  if (!removed) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "eliminar", modulo: "agentes",
    entidad: "agente", entidadId: params.id, resumen: `Eliminó al agente ${agent?.nombre ?? params.id}.`,
  });

  return NextResponse.json({ ok: true });
}
