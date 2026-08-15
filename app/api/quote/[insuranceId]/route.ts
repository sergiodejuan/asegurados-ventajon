import { NextRequest, NextResponse } from "next/server";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { summarizeInsurance } from "@/lib/codeoscopicSnapshot";
import { getPresupuesto, setPresupuestoCodeoscopicSnapshot } from "@/lib/store";
import { rateLimitFail } from "@/lib/rateLimit";

// Polling endpoint: la comparativa lo llama cada N segundos hasta que las
// cotizaciones dejen de estar en estimate/procesándose. Además refresca el
// snapshot en el presupuesto (si el frontend nos pasa el ?pid=...), para que
// el back office lo lea sin depender de que Codeoscopic responda otra vez.
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

  const pid = req.nextUrl.searchParams.get("pid") ?? "";

  try {
    const snapshot = await codeoscopicFetch<CodeoscopicInsurance>(`/insurances/${encodeURIComponent(insuranceId)}`);
    const summary = summarizeInsurance(snapshot);
    // Persistimos el snapshot en el presupuesto solo si el frontend nos dio
    // el pid Y ese pid ya tiene registrado este mismo insuranceId. Sin la
    // verificación cruzada, cualquiera podría escribir snapshots ajenos.
    if (pid) {
      const p = await getPresupuesto(pid);
      const savedId = typeof p?.data?.codeoscopicInsuranceId === "string" ? p.data.codeoscopicInsuranceId : "";
      if (savedId && savedId === insuranceId) {
        await setPresupuestoCodeoscopicSnapshot(pid, summary);
      }
    }
    return NextResponse.json({ ok: true, insuranceId, done: summary.done, snapshot, summary });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[quote/get] Codeoscopic falló:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "codeoscopic_error", status }, { status: 502 });
  }
}
