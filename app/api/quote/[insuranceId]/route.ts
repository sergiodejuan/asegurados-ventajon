import { NextRequest, NextResponse } from "next/server";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { rateLimitFail } from "@/lib/rateLimit";

// Polling endpoint: la comparativa lo llama cada N segundos hasta que las
// cotizaciones dejen de estar en estimate/procesándose. Es solo un proxy
// autenticado con caché de token — nada de escrituras.
export const maxDuration = 15;

export async function GET(req: NextRequest, ctx: { params: { insuranceId: string } }) {
  const { insuranceId } = ctx.params;
  if (!insuranceId) return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });

  if (!codeoscopicConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  // Ritmo razonable: 60 lecturas por minuto y por IP es más que suficiente
  // para un polling cada 3-5s por comparativa abierta. Evita que un cliente
  // bugueado martillee el endpoint.
  const limited = await rateLimitFail(req, { bucket: "quote-get", limit: 60, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const snapshot = await codeoscopicFetch<CodeoscopicInsurance>(`/insurances/${encodeURIComponent(insuranceId)}`);
    const quotes = [...(snapshot.mainQuotes ?? []), ...(snapshot.addonQuotes ?? [])];
    // "done" = todas las cotizaciones tienen premium y ninguna está en estado
    // en curso. Sirve al frontend como señal para parar el polling.
    const done = quotes.length > 0 && quotes.every((q) => typeof q.premium === "number" && !q.estimate);
    return NextResponse.json({ ok: true, insuranceId, done, snapshot });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[quote/get] Codeoscopic falló:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "codeoscopic_error", status }, { status: 502 });
  }
}
