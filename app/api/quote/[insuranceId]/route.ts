import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { summarizeInsurance } from "@/lib/codeoscopicSnapshot";
import { getPresupuesto, setPresupuestoCodeoscopicSnapshot } from "@/lib/store";
import { rateLimitFail } from "@/lib/rateLimit";
import { CLIENT_SESSION_COOKIE, verifySessionToken } from "@/lib/clientSession";
import { resolveIdentity } from "@/lib/agentAuth";

// Polling endpoint: la comparativa lo llama cada N segundos hasta que las
// cotizaciones dejen de estar en estimate/procesándose. Además refresca el
// snapshot en el presupuesto (si el frontend nos pasa el ?pid=...), para que
// el back office lo lea sin depender de que Codeoscopic responda otra vez.
//
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

  const pid = req.nextUrl.searchParams.get("pid") ?? "";

  // Autorización estricta: admin O cliente-dueño del presupuesto asociado.
  // Requerimos SIEMPRE presupuestoId (pid) para poder verificar propiedad —
  // sin él no podemos decidir si el usuario tiene derecho a ese snapshot.
  const identity = await resolveIdentity(req).catch(() => null);
  const isAdmin = !!identity;
  if (!isAdmin) {
    if (!pid) {
      return NextResponse.json({ ok: false, reason: "missing_pid" }, { status: 400 });
    }
    const clientLeadId = verifySessionToken(cookies().get(CLIENT_SESSION_COOKIE)?.value);
    if (!clientLeadId) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }
    const presupuesto = await getPresupuesto(pid).catch(() => null);
    if (!presupuesto || presupuesto.leadId !== clientLeadId) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }
    const savedId = typeof presupuesto.data?.codeoscopicInsuranceId === "string"
      ? presupuesto.data.codeoscopicInsuranceId : "";
    if (savedId !== insuranceId) {
      return NextResponse.json({ ok: false, reason: "insurance_not_in_presupuesto" }, { status: 403 });
    }
  }

  try {
    const snapshot = await codeoscopicFetch<CodeoscopicInsurance>(`/insurances/${encodeURIComponent(insuranceId)}`);
    const summary = summarizeInsurance(snapshot);
    // Persistir snapshot solo si pid vale y coincide con el insurance (misma
    // regla que antes; admin puede persistir por pid arbitrario si lo pasa).
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
