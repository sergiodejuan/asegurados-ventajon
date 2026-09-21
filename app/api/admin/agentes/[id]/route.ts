import { NextResponse } from "next/server";
import { z } from "zod";
import { getAgent, updateAgent, deleteAgent, getAgentByEmail, createAuditLog } from "@/lib/store";
import { requireAdminRole } from "@/lib/agentAuth";
import { toPublicAgent, ADMIN_MODULES } from "@/lib/crm";

// Schema estricto (mass-assignment defense). Rechaza cualquier campo que no
// esté explícitamente aquí para que un cliente no pueda inyectar por ejemplo
// createdAt, id, sessionSecret o cualquier otro atributo interno.
const agentPatchSchema = z
  .object({
    nombre: z.string().max(120).optional(),
    email: z.string().max(200).optional(),
    password: z.string().max(200).optional(),
    fotoUrl: z.string().max(4096).optional(),
    rol: z.enum(["admin", "agente"]).optional(),
    permisos: z.array(z.string().max(60)).max(50).optional(),
    disponibilidad: z.unknown().optional(),
    activo: z.boolean().optional(),
  })
  .strict();

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

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }
  const parsed = agentPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Campos no válidos." }, { status: 400 });
  }
  const body = parsed.data;

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
    rol: body.rol,
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
