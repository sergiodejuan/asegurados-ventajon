"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import {
  DEVICE_LABELS, DAYPART_LABELS,
  type LandingDevice, type LandingDaypart,
} from "@/lib/landings";

type CounterTotals = { views: number; ctaCalcular: number; ctaLlamar: number };
type LandingStat = {
  id: string; slug: string; producto: string; status: "borrador" | "publicado"; h1: string;
  views: number; ctaCalcular: number; ctaLlamar: number; leads: number; conversionRate: number | null;
  byDevice: Record<LandingDevice, CounterTotals>;
  byDaypart: Record<LandingDaypart, CounterTotals>;
};

type Segment = "total" | "device" | "daypart";
const DEVICE_ORDER: LandingDevice[] = ["mobile", "tablet", "desktop"];
const DAYPART_ORDER: LandingDaypart[] = ["madrugada", "manana", "tarde", "noche"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function pct(n: number | null) {
  if (n === null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

const PRODUCTO_LABELS: Record<string, string> = {
  salud: "Salud", vida: "Vida", auto: "Auto", decesos: "Decesos", hogar: "Hogar",
};

export default function AdminLandingsComparePage() {
  return (
    <AdminShell active="landings-comparar">
      <Dashboard />
    </AdminShell>
  );
}

function Dashboard() {
  const { token } = useAdminToken();
  const [from, setFrom] = useState(daysAgoStr(30));
  const [to, setTo] = useState(todayStr());
  const [segment, setSegment] = useState<Segment>("total");
  const [stats, setStats] = useState<LandingStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/admin/landings/stats?${params.toString()}`, { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setStats(body.stats);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [from, to, token]);

  useEffect(() => { load(); }, [load]);

  // Ordenadas por leads generados (de más a menos) — la comparación que
  // más importa primero, sin necesidad de un control de orden aparte.
  const sorted = [...stats].sort((a, b) => b.leads - a.leads);
  const maxLeads = Math.max(1, ...sorted.map((s) => s.leads));

  return (
    <main className="mx-auto max-w-4xl px-5 py-6 pb-24">
      <a href="/admin/campanas/landings" className="text-[13px] font-semibold text-navy">← Volver al listado</a>
      <div className="mt-3">
        <h1 className="text-[22px] font-extrabold text-navy">Comparar landings</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-slate2">
          Vistas, clics por tipo de CTA y leads generados por cada landing en el rango de fechas elegido —
          para decidir qué variante (por ramo o por público objetivo) convierte mejor.
        </p>
      </div>

      {/* Filtro de fechas — única fila, encima de la tabla */}
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-card border border-hair bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink">Desde</span>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
            className="rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink">Hasta</span>
          <input type="date" value={to} min={from} max={todayStr()} onChange={(e) => setTo(e.target.value)}
            className="rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums" />
        </label>
        <div className="flex gap-2">
          {[7, 30, 90].map((n) => (
            <button key={n} type="button" onClick={() => { setFrom(daysAgoStr(n)); setTo(todayStr()); }}
              className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
              {n} días
            </button>
          ))}
        </div>
        <label className="ml-auto block">
          <span className="mb-1 block text-[12px] font-semibold text-ink">Segmentar por</span>
          <select value={segment} onChange={(e) => setSegment(e.target.value as Segment)}
            className="rounded-card border border-hair bg-white px-3 py-2 text-[13px]">
            <option value="total">Total (sin segmentar)</option>
            <option value="device">Dispositivo</option>
            <option value="daypart">Franja horaria</option>
          </select>
        </label>
      </div>
      {segment !== "total" && (
        <p className="mt-2 text-[12px] leading-relaxed text-slate2">
          El desglose por {segment === "device" ? "dispositivo" : "franja horaria"} solo cubre vistas y clics de CTA — los leads y la
          conversión se muestran siempre en total, ya que no se puede saber con qué vista o clic concreto se corresponde cada lead.
        </p>
      )}

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}
      {!loading && sorted.length === 0 && <p className="mt-6 text-[13px] text-slate2">Todavía no hay landings.</p>}

      {!loading && sorted.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-card border border-hair bg-white">
          <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead className="bg-mist text-[11px] font-bold uppercase tracking-wide text-slate2">
              <tr>
                <th className="px-4 py-3">Landing</th>
                <th className="px-4 py-3">Ramo</th>
                <th className="px-4 py-3 text-right">Vistas</th>
                <th className="px-4 py-3 text-right">Clic calcular</th>
                <th className="px-4 py-3 text-right">Clic llamar</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">Conversión</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="border-t border-hair">
                  <td className="px-4 py-3">
                    <a href={`/admin/campanas/landings/${s.id}`} className="font-semibold text-navy hover:underline">
                      {s.h1 || `/lp/${s.slug}`}
                    </a>
                    <p className="text-[11px] text-slate2">
                      /lp/{s.slug}
                      {s.status === "borrador" && <span className="ml-1.5 rounded-pill bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Borrador</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-pill bg-navy/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-navy">
                      {PRODUCTO_LABELS[s.producto] ?? s.producto}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tnums text-ink">{s.views.toLocaleString("es-ES")}</td>
                  <td className="px-4 py-3 text-right tnums text-ink">{s.ctaCalcular.toLocaleString("es-ES")}</td>
                  <td className="px-4 py-3 text-right tnums text-ink">{s.ctaLlamar.toLocaleString("es-ES")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="h-1.5 rounded-full bg-brand-red" style={{ width: `${Math.max(4, (s.leads / maxLeads) * 40)}px` }} aria-hidden="true" />
                      <span className="tnums font-semibold text-ink">{s.leads.toLocaleString("es-ES")}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tnums font-semibold text-emerald-700">{pct(s.conversionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && segment !== "total" && sorted.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          {sorted.map((s) => (
            <SegmentBreakdownCard key={s.id} stat={s} segment={segment} />
          ))}
        </div>
      )}
    </main>
  );
}

// Desglose de una landing por dispositivo o franja horaria: barra por
// bucket sobre "vistas" (la métrica de arriba del funnel, la que tiene
// sentido comparar por dónde/cuándo se ve la landing), con clics de
// calcular/llamar como cifras secundarias debajo de cada barra.
function SegmentBreakdownCard({ stat, segment }: { stat: LandingStat; segment: "device" | "daypart" }) {
  const buckets = segment === "device"
    ? DEVICE_ORDER.map((k) => ({ key: k, label: DEVICE_LABELS[k], totals: stat.byDevice[k] }))
    : DAYPART_ORDER.map((k) => ({ key: k, label: DAYPART_LABELS[k], totals: stat.byDaypart[k] }));
  const maxViews = Math.max(1, ...buckets.map((b) => b.totals.views));

  return (
    <div className="rounded-card border border-hair bg-white p-4">
      <p className="text-[13px] font-bold text-navy">{stat.h1 || `/lp/${stat.slug}`}</p>
      <p className="text-[11px] text-slate2">/lp/{stat.slug}</p>
      <div className="mt-3 flex flex-col gap-2">
        {buckets.map((b) => (
          <div key={b.key} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-[12px] font-medium text-ink">{b.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-navy" style={{ width: `${(b.totals.views / maxViews) * 100}%` }} />
            </div>
            <span className="w-14 shrink-0 text-right tnums text-[12px] font-semibold text-ink">{b.totals.views.toLocaleString("es-ES")}</span>
            <span className="w-32 shrink-0 text-right text-[11px] text-slate2">
              calc {b.totals.ctaCalcular.toLocaleString("es-ES")} · llam {b.totals.ctaLlamar.toLocaleString("es-ES")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
