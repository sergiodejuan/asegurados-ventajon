import { NextResponse } from "next/server";
import { getPresupuesto, updatePresupuesto, getLead } from "@/lib/store";
import { PRESUPUESTO_STATUSES, type PresupuestoStatus } from "@/lib/crm";
import { adminAuthFail } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const presupuesto = await getPresupuesto(params.id);
  if (!presupuesto) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  const lead = await getLead(presupuesto.leadId);
  return NextResponse.json({
    ok: true,
    presupuesto,
    lead: lead ? { id: lead.id, nombre: lead.nombre, telefono: lead.telefono, email: lead.email, status: lead.status } : null,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: { status?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 });
  }

  const status =
    body.status && (PRESUPUESTO_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as PresupuestoStatus)
      : undefined;

  const presupuesto = await updatePresupuesto(params.id, { status, note: body.note });
  if (!presupuesto) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, presupuesto });
}
