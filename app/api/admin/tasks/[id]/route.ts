import { NextResponse } from "next/server";
import { updateTask, deleteTask, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireModule(request, "tareas");
  if (!auth.ok) return auth.response;

  let body: { completada?: boolean; titulo?: string; notas?: string; fecha?: string; hora?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const task = await updateTask(params.id, body);
  if (!task) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "tareas",
    entidad: "tarea", entidadId: task.id,
    resumen: body.completada !== undefined ? `Marcó "${task.titulo}" como ${body.completada ? "completada" : "pendiente"}.` : `Actualizó la tarea "${task.titulo}".`,
  });

  return NextResponse.json({ ok: true, task });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireModule(request, "tareas");
  if (!auth.ok) return auth.response;
  const removed = await deleteTask(params.id);
  if (!removed) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "eliminar", modulo: "tareas",
    entidad: "tarea", entidadId: params.id, resumen: "Eliminó una tarea.",
  });

  return NextResponse.json({ ok: true });
}
