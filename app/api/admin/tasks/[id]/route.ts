import { NextResponse } from "next/server";
import { z } from "zod";
import { updateTask, deleteTask, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Schema estricto: rechaza cualquier campo no listado para evitar
// mass-assignment de campos internos (createdAt, leadId, agente...).
const taskPatchSchema = z
  .object({
    completada: z.boolean().optional(),
    titulo: z.string().max(200).optional(),
    notas: z.string().max(4000).optional(),
    fecha: z.string().max(20).optional(),
    hora: z.string().max(10).optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireModule(request, "tareas");
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }
  const parsed = taskPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Campos no válidos." }, { status: 400 });
  }
  const body = parsed.data;

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
