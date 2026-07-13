import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { updateLead } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verificación de firma (ver https://docs.bland.ai/tutorials/webhook-signing):
// cabecera "X-Webhook-Signature" con HMAC-SHA256(rawBody, secreto de firma),
// en hexadecimal. El secreto de firma se genera aparte en el Dev Portal
// (Account Settings → Keys → "Replace Secret"), no es la API key.
function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(header, "hex"));
  } catch {
    return false;
  }
}

// El esquema exacto del payload no está 100% verificado contra la documentación
// en vivo de Bland; se parsea de forma tolerante (varios nombres de campo
// posibles) y solo se actúa si se puede identificar el lead por metadata.leadId.
type BlandEvent = {
  call_id?: string;
  completed?: boolean;
  status?: string;
  summary?: string;
  analysis?: { summary?: string };
  metadata?: { leadId?: string; source?: string };
};

export async function POST(request: Request) {
  const raw = await request.text();

  const secret = process.env.BLAND_WEBHOOK_SECRET;
  if (secret) {
    const sig = request.headers.get("x-webhook-signature");
    if (!verifySignature(raw, sig, secret)) {
      return NextResponse.json({ ok: false, error: "Firma no válida." }, { status: 401 });
    }
  }

  let body: BlandEvent;
  try { body = JSON.parse(raw); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const leadId = body.metadata?.leadId;
  if (typeof leadId === "string") {
    const summary = body.summary ?? body.analysis?.summary;
    const note = summary ? `Llamada automática (Bland): ${summary}` : "Llamada automática (Bland) finalizada.";
    await updateLead(leadId, { contact: { channel: "llamada", note } }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
