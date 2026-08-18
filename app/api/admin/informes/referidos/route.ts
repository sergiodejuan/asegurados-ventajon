import { NextResponse } from "next/server";
import { getReferralSummary, getReferralLandingConfig } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import { tremendousConfigured } from "@/lib/tremendous";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resumen agregado del programa "Amigos Ventajon" para
// /admin/informes/referidos — funnel, importes estimados y qué necesita
// atención manual. El detalle en vivo de un código concreto (con estado de
// Tremendous por order) sigue viviendo en GET /api/admin/referral/[code],
// gate "campana" — este resumen es de solo lectura, gate "informes".
export async function GET(request: Request) {
  const auth = await requireModule(request, "informes");
  if (!auth.ok) return auth.response;

  const [summary, cfg] = await Promise.all([getReferralSummary(), getReferralLandingConfig()]);

  return NextResponse.json({
    ok: true,
    summary,
    programaActivo: cfg.programaActivo,
    incentivo: cfg.incentivo,
    tremendousConfigured: tremendousConfigured(),
  });
}

export function POST() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
