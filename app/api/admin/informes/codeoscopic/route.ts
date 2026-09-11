import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { computeCodeoscopicMetrics } from "@/lib/store";

// Métricas Codeoscopic para /admin/informes. Va bajo el permiso "informes"
// porque es agregado analítico, no operativa comercial.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const auth = await requireModule(request, "informes");
  if (!auth.ok) return auth.response;
  try {
    const metrics = await computeCodeoscopicMetrics();
    return NextResponse.json({ ok: true, metrics });
  } catch (err) {
    console.error("[informes/codeoscopic] fallo", (err as Error).message);
    return NextResponse.json({ ok: false, error: "No se pudieron calcular las métricas." }, { status: 500 });
  }
}
