import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { computePriceMatchMetrics } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const auth = await requireModule(request, "informes");
  if (!auth.ok) return auth.response;
  try {
    const metrics = await computePriceMatchMetrics();
    return NextResponse.json({ ok: true, metrics });
  } catch (err) {
    console.error("[informes/price-match] fallo", (err as Error).message);
    return NextResponse.json({ ok: false, error: "No se pudieron calcular las métricas." }, { status: 500 });
  }
}
