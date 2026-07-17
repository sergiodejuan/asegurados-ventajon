import { NextResponse } from "next/server";
import { getLlamada, updateLlamada, getLead, getNpsResponse, createAuditLog } from "@/lib/store";
import { LLAMADA_STATUSES, type LlamadaStatus } from "@/lib/crm";
import { requireModule } from "@/lib/agentAuth";
import { sendPushToLead } from "@/lib/webPush";
import { BRAND_NAME } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireModule(request, "llamadas");
  if (!auth.ok) return auth.response;
  const llamada = await getLlamada(params.id);
  if (!llamada) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  const [lead, nps] = await Promise.all([getLead(llamada.leadId), getNpsResponse(params.id)]);
  return NextResponse.json({
    ok: true,
    llamada,
    lead: lead ? { id: lead.id, nombre: lead.nombre, telefono: lead.telefono, email: lead.email, status: lead.status } : null,
    nps,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireModule(request, "llamadas");
  if (!auth.ok) return auth.response;

  let body: {
    status?: string; note?: string;
    diaLlamada?: string; turnoLlamada?: string; fechaProgramada?: string; horaProgramada?: string;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const status =
    body.status && (LLAMADA_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as LlamadaStatus)
      : undefined;

  const result = await updateLlamada(params.id, {
    status, note: body.note, agente: auth.agentNombre,
    diaLlamada: body.diaLlamada, turnoLlamada: body.turnoLlamada,
    fechaProgramada: body.fechaProgramada, horaProgramada: body.horaProgramada,
  });
  if (!result) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  if (result.notifyText) {
    sendPushToLead(result.llamada.leadId, { title: BRAND_NAME, body: result.notifyText, url: result.notifyUrl || "/area-cliente" })
      .catch((err) => console.error("[llamadas] push error", err));
  }

  if (status || body.note || body.fechaProgramada !== undefined) {
    await createAuditLog({
      agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: body.note ? "comentar" : "actualizar", modulo: "llamadas",
      entidad: "llamada", entidadId: params.id,
      resumen: [status && `Cambió el estado a "${status}".`, body.fechaProgramada && "Reprogramó la llamada.", body.note && "Añadió una nota."].filter(Boolean).join(" "),
    });
  }

  return NextResponse.json({ ok: true, llamada: result.llamada });
}
