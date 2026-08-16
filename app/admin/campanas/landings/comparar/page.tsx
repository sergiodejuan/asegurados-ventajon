"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type LandingStat = {
  id: string; slug: string; producto: string; status: "borrador" | "publicado"; h1: string;
  views: number; ctaCalcular: number; ctaLlamar: number; leads: number; conversionRate: number | null;
};

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
      </div>

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
    </main>
  );
}
