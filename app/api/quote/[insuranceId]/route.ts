import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { summarizeInsurance, filterInsuranceByHiddenBrands } from "@/lib/codeoscopicSnapshot";
import { getLead, getHiddenBrands } from "@/lib/store";
import { rateLimitFail } from "@/lib/rateLimit";
import { CLIENT_SESSION_COOKIE, verifySessionToken } from "@/lib/clientSession";
import { resolveIdentity } from "@/lib/agentAuth";
import { verifyQuoteAccessToken } from "@/lib/quoteTokens";

// Polling endpoint: la comparativa lo llama cada N segundos hasta que las
// cotizaciones dejen de estar en estimate/procesándose. Además refresca el
// snapshot en el presupuesto (si el frontend nos pasa el ?pid=...), para que
// el back office lo lea sin depender de que Codeoscopic responda otra vez.
// Auditoría consultora — hallazgo API1:2023 BOLA: antes cualquiera con un
// insuranceId podía leer el snapshot (nombre + DOB + tarifas del lead
// ajeno). Ahora requerimos: admin (token/sesión) O sesión de cliente cuyo
// leadId sea dueño del presupuesto al que pertenece este insuranceId.
export const maxDuration = 15;

export async function GET(req: NextRequest, ctx: { params: { insuranceId: string } }) {
  const { insuranceId } = ctx.params;
  if (!insuranceId) return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });

  if (!codeoscopicConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const limited = await rateLimitFail(req, { bucket: "quote-get", limit: 60, windowSeconds: 60 });
  if (limited) return limited;

  // Autorización estricta: admin O el cliente dueño del LEAD al que pertenece
  // este insurance. La tarificación cuelga del lead (no de un presupuesto):
  // se carga el lead de la sesión de cliente y se comprueba que su
  // codeoscopicInsuranceId coincide con el que se pide. Así un id de otro
  // cliente nunca expone su cotización (API1:2023 BOLA).
  // Tres formas válidas de autorización, en orden de preferencia:
  // 1) admin (token o sesión de agente).
  // 2) cookie de sesión de cliente (flujo web habitual).
  // 3) ?token=<quoteAccessToken>: token HMAC firmado que el flow de
  // ManyChat envía al usuario por WhatsApp. Sirve exactamente lo
  // mismo — dueño del lead ligado al insurance — sin necesidad de
  // que el visitante entre por el flow web y coja la cookie.
  const identity = await resolveIdentity(req).catch(() => null);
  const isAdmin = !!identity;
  if (!isAdmin) {
    let ownerLeadId: string | null = verifySessionToken(cookies().get(CLIENT_SESSION_COOKIE)?.value);
    if (!ownerLeadId) {
      const tokenParam = req.nextUrl.searchParams.get("token");
      const fromToken = verifyQuoteAccessToken(tokenParam);
      if (fromToken) ownerLeadId = fromToken.leadId;
    }
    if (!ownerLeadId) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }
    const lead = await getLead(ownerLeadId).catch(() => null);
    if (!lead || lead.codeoscopicInsuranceId !== insuranceId) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }
  }

  try {
    const snapshot = await codeoscopicFetch<CodeoscopicInsurance>(`/insurances/${encodeURIComponent(insuranceId)}`);
    const summary = summarizeInsurance(snapshot);
    // El público solo ve las marcas visibles del catálogo; el admin ve todas.
    const snapshotOut = isAdmin ? snapshot : filterInsuranceByHiddenBrands(snapshot, await getHiddenBrands("salud"));
    return NextResponse.json({ ok: true, insuranceId, done: summary.done, snapshot: snapshotOut, summary });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[quote/get] Codeoscopic falló:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "codeoscopic_error", status }, { status: 502 });
  }
}
