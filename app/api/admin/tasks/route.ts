import { NextResponse } from "next/server";
import { listTasks, createTask, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import type { TaskDraft } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireModule(request, "tareas");
  if (!auth.ok) return auth.response;
  const leadId = new URL(request.url).searchParams.get("leadId");
  const all = await listTasks();
  const tasks = leadId ? all.filter((t) => t.leadId === leadId) : all;
  return NextResponse.json({ ok: true, tasks });
}

export async function POST(request: Request) {
  const auth = await requireModule(request, "tareas");
  if (!auth.ok) return auth.response;

  let body: TaskDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.titulo?.trim()) return NextResponse.json({ ok: false, error: "Falta el título." }, { status: 400 });
  if (!body.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) {
    return NextResponse.json({ ok: false, error: "Fecha no válida." }, { status: 400 });
  }

  const task = await createTask({ ...body, agente: body.agente || auth.agentNombre });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "crear", modulo: "tareas",
    entidad: "tarea", entidadId: task.id, resumen: `Creó la tarea "${task.titulo}".`,
  });

  return NextResponse.json({ ok: true, task });
}
