import { NextResponse } from "next/server";
import { listLandings, listLeads, getLandingCounters } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Estadísticas por landing para el dashboard de comparación
// (/admin/campanas/landings/comparar): vistas y clics de CTA (contadores
// diarios, ver lib/store.ts trackLandingEvent/getLandingCounters) + leads
// generados (filtrando la lista completa de leads por landingSlug y rango de
// fechas — mismo patrón in-memory que ya usa purgeStaleLeads sobre
// listLeads(), sin necesitar un índice nuevo por landing).
export async function GET(request: Request) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || daysAgoStr(30);
  const to = searchParams.get("to") || todayStr();

  const [landings, leads] = await Promise.all([listLandings(), listLeads()]);

  const stats = await Promise.all(landings.map(async (l) => {
    const counters = await getLandingCounters(l.slug, from, to);
    let views = 0, ctaCalcular = 0, ctaLlamar = 0;
    for (const day of Object.values(counters)) {
      views += day.view ?? 0;
      ctaCalcular += day.cta_calcular ?? 0;
      ctaLlamar += day.cta_llamar ?? 0;
    }
    const leadsCount = leads.filter((lead) => {
      if (lead.landingSlug !== l.slug) return false;
      const day = lead.createdAt.slice(0, 10);
      return day >= from && day <= to;
    }).length;
    const conversionRate = views > 0 ? leadsCount / views : null;
    return {
      id: l.id, slug: l.slug, producto: l.producto, status: l.status, h1: l.hero.h1,
      views, ctaCalcular, ctaLlamar, leads: leadsCount, conversionRate,
    };
  }));

  return NextResponse.json({ ok: true, from, to, stats });
}
