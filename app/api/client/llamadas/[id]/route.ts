import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLlamada, updateLlamada } from "@/lib/store";
import { llamadaToClientView } from "@/lib/clientQuote";
import { CLIENT_SESSION_COOKIE, verifySessionToken } from "@/lib/clientSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Permite al propio cliente cancelar o reprogramar UNA de sus llamadas
// desde su área de cliente. Requiere sesión, y la llamada tiene que
// pertenecer a ese mismo lead (si no, 404 — nunca se revela que la llamada
// existe si es de otra persona).
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const token = cookies().get(CLIENT_SESSION_COOKIE)?.value;
  const leadId = verifySessionToken(token);
  if (!leadId) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  const llamada = await getLlamada(params.id);
  if (!llamada || llamada.leadId !== leadId) {
    return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  }
  if (llamada.status === "hecha" || llamada.status === "cancelada") {
    return NextResponse.json({ ok: false, error: "Esta llamada ya no está activa." }, { status: 409 });
  }

  let body: { action?: string; diaLlamada?: string; turnoLlamada?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  let result;
  if (body.action === "cancelar") {
    result = await updateLlamada(params.id, {
      status: "cancelada",
      note: "El cliente ha cancelado la llamada desde su área de cliente.",
    });
  } else if (body.action === "reprogramar") {
    if (!body.diaLlamada && !body.turnoLlamada) {
      return NextResponse.json({ ok: false, error: "Elige cuándo prefieres que te llamemos." }, { status: 400 });
    }
    result = await updateLlamada(params.id, {
      status: "programada",
      diaLlamada: body.diaLlamada, turnoLlamada: body.turnoLlamada,
      // Una reprogramación desde aquí sustituye la fecha/hora concreta que
      // pudiera haber fijado un agente: vuelve a quedar por concretar.
      fechaProgramada: "", horaProgramada: "",
      note: "El cliente ha reprogramado la llamada desde su área de cliente.",
    });
  } else {
    return NextResponse.json({ ok: false, error: "Acción no válida." }, { status: 400 });
  }

  if (!result) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true, llamada: llamadaToClientView(result.llamada) });
}
