import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { updateLead } from "@/lib/store";

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
  if (apiKey) {
    const sig = request.headers.get("x-retell-signature");
    if (!verifySignature(raw, sig, apiKey)) {
      return NextResponse.json({ ok: false, error: "Firma no válida." }, { status: 401 });
    }
  }

  let body: RetellEvent;
  try { body = JSON.parse(raw); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

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
