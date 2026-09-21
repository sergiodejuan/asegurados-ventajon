import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { payReferidoBonus, payReferidorBonus } from "@/lib/referralPayouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/referral/[code]/retry
// Reintenta manualmente el pago de un bono concreto — cuando el cron ha
// agotado sus intentos o el asesor quiere forzar el envío tras una
// intervención manual. Body: { leadId: string; lado: "referido"|"referidor" }.
export async function POST(request: Request, { params }: { params: { code: string } }) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  let body: { leadId?: string; lado?: "referido" | "referidor" };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const code = decodeURIComponent(params.code);
  if (!body.leadId) return NextResponse.json({ ok: false, error: "Falta leadId." }, { status: 400 });
  if (body.lado !== "referido" && body.lado !== "referidor") {
    return NextResponse.json({ ok: false, error: "lado debe ser 'referido' o 'referidor'." }, { status: 400 });
  }

  const result = body.lado === "referido"
    ? await payReferidoBonus(code, body.leadId)
    : await payReferidorBonus(code, body.leadId);

  return NextResponse.json({ ok: result.ok, result });
}
