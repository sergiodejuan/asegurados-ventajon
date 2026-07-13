import { NextResponse } from "next/server";
import { listTasks, createTask } from "@/lib/store";
import { adminAuthFail } from "@/lib/adminAuth";
import type { TaskDraft } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const leadId = new URL(request.url).searchParams.get("leadId");
  const all = await listTasks();
  const tasks = leadId ? all.filter((t) => t.leadId === leadId) : all;
  return NextResponse.json({ ok: true, tasks });
}

export async function POST(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: TaskDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.titulo?.trim()) return NextResponse.json({ ok: false, error: "Falta el título." }, { status: 400 });
  if (!body.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) {
    return NextResponse.json({ ok: false, error: "Fecha no válida." }, { status: 400 });
  }

  const task = await createTask(body);
  return NextResponse.json({ ok: true, task });
}
