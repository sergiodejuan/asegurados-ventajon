import { NextResponse } from "next/server";
import { getPresupuesto, updatePresupuesto, getLead, getNpsResponse } from "@/lib/store";
import { PRESUPUESTO_STATUSES, type PresupuestoStatus } from "@/lib/crm";
import { adminAuthFail } from "@/lib/adminAuth";
import { sendPushToLead } from "@/lib/webPush";
import { BRAND_NAME } from "@/lib/brand";

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
  const [lead, nps] = await Promise.all([getLead(presupuesto.leadId), getNpsResponse(params.id)]);
  return NextResponse.json({
    ok: true,
    presupuesto,
    lead: lead ? { id: lead.id, nombre: lead.nombre, telefono: lead.telefono, email: lead.email, status: lead.status } : null,
    nps,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: { status?: string; note?: string; agente?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 });
  }

  const status =
    body.status && (PRESUPUESTO_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as PresupuestoStatus)
      : undefined;

  const result = await updatePresupuesto(params.id, { status, note: body.note, agente: body.agente });
  if (!result) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  if (result.notifyText) {
    sendPushToLead(result.presupuesto.leadId, { title: BRAND_NAME, body: result.notifyText, url: result.notifyUrl || "/area-cliente" })
      .catch((err) => console.error("[presupuestos] push error", err));
  }

  return NextResponse.json({ ok: true, presupuesto: result.presupuesto });
}
