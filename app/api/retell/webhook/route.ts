import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { updateLead, claimOnce } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verificación de firma (ver https://docs.retellai.com/features/secure-webhook):
// cabecera "x-retell-signature" con formato "v=<timestamp>,d=<hmac-sha256 hex>",
// calculado como HMAC-SHA256(rawBody + timestamp, RETELL_API_KEY).
function verifySignature(rawBody: string, header: string | null, apiKey: string): boolean {
  if (!header) return false;
  const match = header.match(/^v=(\d+),d=(.+)$/);
  if (!match) return false;
  const [, ts, digest] = match;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", apiKey).update(rawBody + ts).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(digest, "hex"));
  } catch {
    return false;
  }
}

type RetellEvent = {
  event?: string;
  call?: {
    call_id?: string;
    metadata?: { leadId?: string; source?: string };
    call_analysis?: { call_successful?: boolean; call_summary?: string };
  };
};

export async function POST(request: Request) {
  const raw = await request.text();

  const apiKey = process.env.RETELL_API_KEY;
  // Fail-closed: si no hay API key configurada, no aceptamos ningún webhook.
  // Antes fail-open silenciosamente permitía a un atacante que conociera un
  // leadId inyectar actividad falsa en la ficha (ver auditoría, X-05).
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Verificación de firma no configurada (RETELL_API_KEY)." }, { status: 503 });
  }
  const sig = request.headers.get("x-retell-signature");
  if (!verifySignature(raw, sig, apiKey)) {
    return NextResponse.json({ ok: false, error: "Firma no válida." }, { status: 401 });
  }

  let body: RetellEvent;
  try { body = JSON.parse(raw); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  // Idempotencia: si Retell reintenta el mismo evento (call_id + event) por
  // fallo transitorio o alguien reenvía la petición dentro de la ventana de
  // firma (5 min), aceptamos con 200 pero NO ejecutamos updateLead de nuevo
  // para no duplicar la entrada de actividad en la ficha del lead.
  const callId = body.call?.call_id ?? "";
  const eventKind = body.event ?? "";
  if (callId && eventKind) {
    const idemKey = `idem:retell:${eventKind}:${callId}`;
    const first = await claimOnce(idemKey, 15 * 60 * 1000).catch(() => true);
    if (!first) return NextResponse.json({ ok: true, duplicate: true });
  }

  // Se registra solo en "call_analyzed" (evento final, con resumen) para no
  // duplicar la entrada de actividad con "call_ended".
  const leadId = body.call?.metadata?.leadId;
  if (body.event === "call_analyzed" && typeof leadId === "string") {
    const analysis = body.call?.call_analysis;
    const note = analysis?.call_summary
      ? `Llamada automática (Retell): ${analysis.call_summary}`
      : `Llamada automática (Retell) finalizada${analysis?.call_successful === false ? " (sin éxito)" : ""}.`;
    await updateLead(leadId, { contact: { channel: "llamada", note } }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
