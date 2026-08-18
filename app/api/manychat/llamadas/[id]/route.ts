import { NextResponse } from "next/server";
import { getLlamada, updateLlamada, getLead, claimOnce } from "@/lib/store";
import { normalizePhone } from "@/lib/schema";
import { manychatAuthFail } from "@/lib/manychatAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Equivalente a /api/client/llamadas/[id] pero pensado para que lo llame
// ManyChat (sin cookie de sesión de navegador): la propiedad se verifica
// comparando el teléfono que manda ManyChat con el teléfono del lead dueño
// de la llamada, en vez de una cookie firmada.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = manychatAuthFail(request);
  if (denied) return denied;

  let body: { telefono?: string; action?: string; fechaProgramada?: string; turnoLlamada?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const telefono = body.telefono ? normalizePhone(body.telefono) : "";
  if (!telefono) return NextResponse.json({ ok: false, error: "Falta el teléfono." }, { status: 400 });

  const llamada = await getLlamada(params.id);
  if (!llamada) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  const lead = await getLead(llamada.leadId);
  if (!lead || lead.telefono !== telefono) {
    return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  }
  if (llamada.status === "hecha" || llamada.status === "cancelada") {
    return NextResponse.json({ ok: false, error: "Esta llamada ya no está activa." }, { status: 409 });
  }

  // Idempotencia: si ManyChat reintenta el mismo POST por timeout, no
  // ejecutamos la acción dos veces (que anotaría un log duplicado en la
  // ficha). Clave por llamada+acción+fecha; ventana 5 min.
  const idemKey = `idem:mc:${params.id}:${body.action}:${body.fechaProgramada ?? ""}:${body.turnoLlamada ?? ""}`;
  const first = await claimOnce(idemKey, 5 * 60 * 1000).catch(() => true);
  if (!first) return NextResponse.json({ ok: true, duplicate: true });

  let result;
  if (body.action === "cancelar") {
    result = await updateLlamada(params.id, {
      status: "cancelada",
      note: "El cliente ha cancelado la llamada desde WhatsApp (ManyChat).",
    });
  } else if (body.action === "reprogramar") {
    if (!body.fechaProgramada || !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaProgramada) || !body.turnoLlamada) {
      return NextResponse.json({ ok: false, error: "Elige un día y un turno." }, { status: 400 });
    }
    result = await updateLlamada(params.id, {
      status: "programada",
      turnoLlamada: body.turnoLlamada, fechaProgramada: body.fechaProgramada, horaProgramada: "",
      note: "El cliente ha reprogramado la llamada desde WhatsApp (ManyChat).",
    });
  } else {
    return NextResponse.json({ ok: false, error: "Acción no válida." }, { status: 400 });
  }

  if (!result) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true, llamada: result.llamada });
}
