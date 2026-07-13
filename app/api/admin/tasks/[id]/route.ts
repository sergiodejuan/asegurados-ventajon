import { NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/lib/store";
import { adminAuthFail } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: { completada?: boolean; titulo?: string; notas?: string; fecha?: string; hora?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const task = await updateTask(params.id, body);
  if (!task) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true, task });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const removed = await deleteTask(params.id);
  if (!removed) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
