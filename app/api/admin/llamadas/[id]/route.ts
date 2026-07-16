import { NextResponse } from "next/server";
import { getLlamada, updateLlamada, getLead } from "@/lib/store";
import { LLAMADA_STATUSES, type LlamadaStatus } from "@/lib/crm";
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
  const llamada = await getLlamada(params.id);
  if (!llamada) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  const lead = await getLead(llamada.leadId);
  return NextResponse.json({
    ok: true,
    llamada,
    lead: lead ? { id: lead.id, nombre: lead.nombre, telefono: lead.telefono, email: lead.email, status: lead.status } : null,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: {
    status?: string; note?: string; agente?: string;
    diaLlamada?: string; turnoLlamada?: string; fechaProgramada?: string; horaProgramada?: string;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const status =
    body.status && (LLAMADA_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as LlamadaStatus)
      : undefined;

  const result = await updateLlamada(params.id, {
    status, note: body.note, agente: body.agente,
    diaLlamada: body.diaLlamada, turnoLlamada: body.turnoLlamada,
    fechaProgramada: body.fechaProgramada, horaProgramada: body.horaProgramada,
  });
  if (!result) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  if (result.notifyText) {
    sendPushToLead(result.llamada.leadId, { title: BRAND_NAME, body: result.notifyText, url: "/area-cliente" })
      .catch((err) => console.error("[llamadas] push error", err));
  }

  return NextResponse.json({ ok: true, llamada: result.llamada });
}
