import { NextResponse } from "next/server";
import { verifyReferralOptInToken } from "@/lib/referralTokens";
import { updateReferralConvertidoStatus } from "@/lib/store";
import { payReferidoBonus } from "@/lib/referralPayouts";
import { rateLimitFail } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint de doble opt-in del referido. El referido recibe email con
// link `/api/referral/opt-in?token=…`; al hacer clic:
//   1. Se valida el token (HMAC-signed, TTL 14 días, single-use).
//   2. Se actualiza el status del ReferralConvertido a "opt-in".
//   3. Redirect a página de gracias con confirmación visual.
//
// El pago del bono al AMIGO se dispara desde admin (o cron) al detectar
// status="opt-in" — no es automático desde aquí para poder hacer batch
// diario con menos coste operativo. En Fase 2 se automatiza vía Tremendous.
//
// Se acepta GET (link desde email) y POST (por si se quiere confirmar
// desde el propio panel del cliente).
async function handle(request: Request, token: string | undefined | null) {
  const limited = await rateLimitFail(request, { bucket: "referral-optin", limit: 20, windowSeconds: 300 });
  if (limited) return limited;

  const verified = verifyReferralOptInToken(token);
  if (!verified) {
    return NextResponse.redirect(new URL("/referidos/opt-in?ok=0", request.url), 302);
  }

  const updated = await updateReferralConvertidoStatus(verified.code, verified.leadId, {
    status: "opt-in",
    optInAt: new Date().toISOString(),
  });
  void updated;

  // Pago automático del bono al amigo vía Tremendous. Best-effort: si falla
  // (Tremendous caído, saldo insuficiente, etc.), dejamos el status en
  // "opt-in" con retryCount++ y el cron/admin puede reintentar. Nunca
  // bloquea la redirección al usuario — para él el opt-in ya fue exitoso.
  payReferidoBonus(verified.code, verified.leadId).catch((err) => {
    console.error("[referral opt-in] payReferidoBonus error", err);
  });

  // Redirect a página con feedback. Aunque el updated venga null (código
  // borrado, lead removido), consideramos el opt-in "hecho" para no dar
  // pistas a bots — la página de gracias es la misma.
  return NextResponse.redirect(new URL("/referidos/opt-in?ok=1", request.url), 302);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  return handle(request, token);
}

export async function POST(request: Request) {
  let body: { token?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }
  return handle(request, body.token);
}
