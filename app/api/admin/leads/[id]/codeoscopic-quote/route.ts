import { NextResponse } from "next/server";
import { getLead } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { buildHealthPayload } from "@/lib/codeoscopicMap";
import { summarizeInsurance } from "@/lib/codeoscopicSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pide una cotización real a Codeoscopic para un lead ANTES de que exista un
// presupuesto que la contenga — a diferencia de app/api/quote/create (que
// exige un presupuestoId ya creado, para el flujo público del tarificador),
// aquí un agente quiere ver precios reales primero y decidir qué
// compañía/precio guardar al crear el presupuesto manual desde /admin (ver
// components/admin/CreatePresupuestoModal.tsx). El payload sale del mismo
// mapper (lib/codeoscopicMap.ts), que solo lee del lead — nunca del
// presupuesto —, así que no hace falta que exista uno todavía. El polling
// posterior de esta cotización reutiliza GET /api/quote/[insuranceId] tal
// cual (ya acepta identidad de admin sin necesitar un presupuestoId).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "presupuestos");
  if (!auth.ok) return auth.response;

  if (!codeoscopicConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  const mapped = await buildHealthPayload(lead, null);
  if (!mapped.ok) return NextResponse.json({ ok: false, reason: mapped.reason });

  try {
    const created = await codeoscopicFetch<CodeoscopicInsurance>("/insurances", {
      method: "POST",
      body: mapped.payload,
    });
    if (!created?.id) {
      return NextResponse.json({ ok: false, reason: "codeoscopic_sin_id" }, { status: 502 });
    }
    const summary = summarizeInsurance(created);
    return NextResponse.json({ ok: true, insuranceId: created.id, summary });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[leads/codeoscopic-quote] Codeoscopic falló:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "codeoscopic_error", status }, { status: 502 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
