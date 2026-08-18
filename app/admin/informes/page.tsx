"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { PRESUPUESTO_STATUSES, PRESUPUESTO_STATUS_LABELS } from "@/lib/crm";

type Presupuesto = {
  id: string; producto: string; status: string; precioAprox: number | null;
  eleccion: { compania: string; precio: number | null } | null;
  closedBy: string;
};

function eur(n: number) {
  return n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";
}

const PRODUCTO_INFORME_LABELS: Record<string, string> = {
  salud: "Salud", vida: "Vida", auto: "Auto", decesos: "Decesos", hogar: "Hogar",
};

// Valor de un presupuesto ganado: el precio realmente elegido si existe,
// si no el orientativo del catálogo.
function valorGanado(p: Presupuesto): number {
  return p.eleccion?.precio ?? p.precioAprox ?? 0;
}

export default function AdminInformesPage() {
  return (
    <AdminShell active="informes">
      <InformesAdmin />
    </AdminShell>
  );
}

function InformesAdmin() {
  const { token } = useAdminToken();
  const [items, setItems] = useState<Presupuesto[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/presupuestos", { headers: { "x-admin-token": token } })
      .then((r) => r.json())
      .then((body) => { if (body.ok) setItems(body.presupuestos); })
      .finally(() => setLoaded(true));
  }, [token]);

  const funnel = useMemo(() => {
    return PRESUPUESTO_STATUSES.map((s) => ({
      key: s, label: PRESUPUESTO_STATUS_LABELS[s], count: items.filter((p) => p.status === s).length,
    }));
  }, [items]);

  const ganados = useMemo(() => items.filter((p) => p.status === "ganado"), [items]);

  const porCompania = useMemo(() => {
    const acc = new Map<string, number>();
    for (const p of ganados) {
      const key = p.eleccion?.compania || "Sin especificar";
      acc.set(key, (acc.get(key) ?? 0) + valorGanado(p));
    }
    return Array.from(acc.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [ganados]);

  const porProducto = useMemo(() => {
    const acc = new Map<string, number>();
    for (const p of ganados) {
      const key = PRODUCTO_INFORME_LABELS[p.producto] ?? (p.producto ? p.producto[0].toUpperCase() + p.producto.slice(1) : "Sin especificar");
      acc.set(key, (acc.get(key) ?? 0) + valorGanado(p));
    }
    return Array.from(acc.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [ganados]);

  const rankingAgentes = useMemo(() => {
    const acc = new Map<string, { count: number; value: number }>();
    for (const p of ganados) {
      const key = p.closedBy || "Sin identificar";
      const cur = acc.get(key) ?? { count: 0, value: 0 };
      cur.count += 1;
      cur.value += valorGanado(p);
      acc.set(key, cur);
    }
    return Array.from(acc.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.value - a.value);
  }, [ganados]);

  const totalValorGanado = ganados.reduce((acc, p) => acc + valorGanado(p), 0);
  const cerrados = items.filter((p) => p.status === "ganado" || p.status === "perdido").length;
  const winRate = cerrados ? Math.round((ganados.length / cerrados) * 100) : 0;

  if (!loaded) {
    return <main className="mx-auto max-w-3xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-16">
      <h1 className="text-[22px] font-extrabold text-navy">Informes</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Calculados sobre todos los presupuestos registrados. Los importes usan el precio elegido por el
        cliente cuando existe; si no, el orientativo del catálogo.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-navy">{items.length}</p>
          <p className="text-[11px] font-medium text-slate2">Presupuestos totales</p>
        </div>
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-emerald-700">{eur(totalValorGanado)}/mes</p>
          <p className="text-[11px] font-medium text-slate2">Ingresos ganados</p>
        </div>
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-navy">{winRate}%</p>
          <p className="text-[11px] font-medium text-slate2">Tasa de cierre</p>
        </div>
      </div>

      <ReportSection title="Embudo de conversión">
        <FunnelChart stages={funnel} />
      </ReportSection>

      <ReportSection title="Ingresos por compañía (€/mes, presupuestos ganados)">
        <BarList items={porCompania} formatValue={(v) => eur(v)} />
      </ReportSection>

      <ReportSection title="Ingresos por producto (€/mes, presupuestos ganados)">
        <BarList items={porProducto} formatValue={(v) => eur(v)} />
      </ReportSection>

      <ReportSection title="Ranking de agentes (presupuestos cerrados como ganados)">
        <BarList
          items={rankingAgentes.map((a) => ({ label: a.label, value: a.value }))}
          formatValue={(v, i) => `${eur(v)}/mes · ${rankingAgentes[i].count} cierre${rankingAgentes[i].count === 1 ? "" : "s"}`}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-slate2">
          &ldquo;Sin identificar&rdquo; son cierres registrados antes de que la persona se identificara como
          agente (ver el pie de la barra lateral del panel).
        </p>
      </ReportSection>

      <CodeoscopicSection />
      <PriceMatchSection />
    </main>
  );
}

/* ---------------- Sección Igualación de precio (price-match) --------------- */
type PriceMatchMetrics = {
  totalSolicitudes: number;
  precioMedioOfrecido: number | null;
  topCompeticion: { compania: string; solicitudes: number; precioMedio: number | null }[];
  cerrados: number;
  ratioCierre: number;
  ultimoSolicitadoAt: string;
};

function PriceMatchSection() {
  const { token } = useAdminToken();
  const [metrics, setMetrics] = useState<PriceMatchMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/informes/price-match", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo cargar."); setLoading(false); return; }
      setMetrics(body.metrics);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }

  const eurMes = (n: number | null) => n == null ? "—" : `${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })} €/mes`;

  return (
    <ReportSection title="Igualación de precio (rescate comercial)">
      {!metrics && !loading && (
        <div>
          <p className="text-[13px] leading-relaxed text-slate2">
            Solicitudes recibidas desde /precio-mejor-garantizado y desde el módulo de rescate en la comparativa.
            Ranking de compañías competidoras y ratio de cierre.
          </p>
          <button type="button" onClick={load} className="mt-3 rounded-card border border-hair bg-white px-4 py-2 text-[13px] font-semibold text-navy hover:bg-mist">
            Calcular métricas
          </button>
        </div>
      )}
      {loading && <p className="text-[13px] text-slate2">Calculando…</p>}
      {error && <p role="alert" className="text-[13px] font-medium text-brand-red">{error}</p>}
      {metrics && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-card border border-hair bg-white p-3">
              <p className="text-[20px] font-extrabold tnums text-navy">{metrics.totalSolicitudes}</p>
              <p className="text-[11px] font-medium text-slate2">Solicitudes totales</p>
            </div>
            <div className="rounded-card border border-hair bg-white p-3">
              <p className="text-[20px] font-extrabold tnums text-navy">{metrics.cerrados}</p>
              <p className="text-[11px] font-medium text-slate2">Cierres (con elección)</p>
              <p className="mt-0.5 text-[11px] tnums text-slate2/80">{Math.round(metrics.ratioCierre * 1000) / 10}%</p>
            </div>
            <div className="rounded-card border border-hair bg-white p-3">
              <p className="text-[20px] font-extrabold tnums text-emerald-700">{eurMes(metrics.precioMedioOfrecido)}</p>
              <p className="text-[11px] font-medium text-slate2">Precio medio traído por el cliente</p>
            </div>
            <div className="rounded-card border border-hair bg-white p-3">
              <p className="text-[13px] font-semibold tnums text-navy">
                {metrics.ultimoSolicitadoAt ? new Date(metrics.ultimoSolicitadoAt).toLocaleDateString("es-ES") : "—"}
              </p>
              <p className="text-[11px] font-medium text-slate2">Última solicitud</p>
            </div>
          </div>
          <div className="mt-5">
            <h4 className="text-[13px] font-bold text-navy">Compañías competidoras más frecuentes</h4>
            <div className="mt-2">
              <BarList
                items={metrics.topCompeticion.map((c) => ({ label: c.compania, value: c.solicitudes }))}
                formatValue={(v, i) => {
                  const c = metrics.topCompeticion[i];
                  return `${v} solicitud${v === 1 ? "" : "es"} · ${eurMes(c.precioMedio)}`;
                }}
              />
            </div>
          </div>
          <button type="button" onClick={load} className="mt-4 text-[12px] font-semibold text-navy underline">
            Recalcular
          </button>
        </>
      )}
    </ReportSection>
  );
}

/* ------------------------ Sección Codeoscopic ---------------------------- */
// Métricas específicas de la integración Codeoscopic Avant2: cobertura de la
// integración (cuántos leads tienen cotización real) y ranking de compañías
// tanto en cotización como en elección final del cliente.

type CodeoscopicMetrics = {
  totalPresupuestos: number;
  soloSalud: number;
  conInsuranceId: number;
  conSnapshot: number;
  snapshotCompleto: number;
  cotizacionesTotales: number;
  precioMedioMensual: number | null;
  topCompanias: { compania: string; cotizaciones: number; precioMedio: number | null }[];
  topElecciones: { compania: string; elecciones: number; precioMedio: number | null }[];
  ultimoSnapshotAt: string;
};

function CodeoscopicSection() {
  const { token } = useAdminToken();
  const [metrics, setMetrics] = useState<CodeoscopicMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/informes/codeoscopic", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo cargar."); setLoading(false); return; }
      setMetrics(body.metrics);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }

  const pct = (num: number, denom: number) => denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0;
  const eurMes = (n: number | null) => n == null ? "—" : `${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })} €/mes`;

  return (
    <ReportSection title="Codeoscopic (motor Avant2)">
      {!metrics && !loading && (
        <div>
          <p className="text-[13px] leading-relaxed text-slate2">
            Cobertura de la integración con Codeoscopic y ranking de compañías cotizadas y elegidas por el cliente.
            El cálculo escanea todos los presupuestos y puede tardar unos segundos en bases grandes.
          </p>
          <button type="button" onClick={load} className="mt-3 rounded-card border border-hair bg-white px-4 py-2 text-[13px] font-semibold text-navy hover:bg-mist">
            Calcular métricas
          </button>
        </div>
      )}
      {loading && <p className="text-[13px] text-slate2">Calculando…</p>}
      {error && <p role="alert" className="text-[13px] font-medium text-brand-red">{error}</p>}
      {metrics && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KpiCard label="Leads de salud" value={metrics.soloSalud.toString()} />
            <KpiCard label="Con cotización Codeoscopic" value={`${metrics.conInsuranceId}`} sub={`${pct(metrics.conInsuranceId, metrics.soloSalud)}%`} />
            <KpiCard label="Con snapshot cerrado" value={`${metrics.snapshotCompleto}`} sub={`${pct(metrics.snapshotCompleto, metrics.conSnapshot)}% de los que tienen`} />
            <KpiCard label="Cotizaciones totales" value={metrics.cotizacionesTotales.toString()} sub={`~${eurMes(metrics.precioMedioMensual)} de media`} />
          </div>
          {metrics.ultimoSnapshotAt && (
            <p className="mt-3 text-[11px] text-slate2">Último snapshot registrado: {new Date(metrics.ultimoSnapshotAt).toLocaleString("es-ES")}</p>
          )}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <h4 className="text-[13px] font-bold text-navy">Compañías con más cotizaciones</h4>
              <div className="mt-2">
                <BarList
                  items={metrics.topCompanias.map((c) => ({ label: c.compania, value: c.cotizaciones }))}
                  formatValue={(v, i) => {
                    const c = metrics.topCompanias[i];
                    return `${v} cotización${v === 1 ? "" : "es"} · ${eurMes(c.precioMedio)}`;
                  }}
                />
              </div>
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-navy">Compañías más elegidas por el cliente</h4>
              <div className="mt-2">
                <BarList
                  items={metrics.topElecciones.map((c) => ({ label: c.compania, value: c.elecciones }))}
                  formatValue={(v, i) => {
                    const c = metrics.topElecciones[i];
                    return `${v} elección${v === 1 ? "" : "es"} · ${eurMes(c.precioMedio)}`;
                  }}
                />
              </div>
            </div>
          </div>
          <button type="button" onClick={load} className="mt-4 text-[12px] font-semibold text-navy underline">
            Recalcular
          </button>
        </>
      )}
    </ReportSection>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-hair bg-white p-3">
      <p className="text-[20px] font-extrabold tnums text-navy">{value}</p>
      <p className="text-[11px] font-medium text-slate2">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] tnums text-slate2/80">{sub}</p>}
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-[20px] border border-hair bg-white p-5">
      <h2 className="text-[14px] font-bold text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Embudo: barras horizontales de magnitud (un único hue navy), salvo los
// estados terminales (ganado/perdido) que usan los colores de estado ya
// establecidos en el resto del panel admin (verde = bueno, rojo = crítico).
function FunnelChart({ stages }: { stages: { key: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="flex flex-col gap-2.5">
      {stages.map((s) => {
        const pct = Math.round((s.count / max) * 100);
        const barColor = s.key === "ganado" ? "bg-emerald-500" : s.key === "perdido" ? "bg-brand-red" : s.key === "caducado" ? "bg-slate-300" : "bg-navy";
        return (
          <div key={s.key} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-[12px] font-medium text-slate2">{s.label}</span>
            <div className="h-5 flex-1 overflow-hidden rounded-full bg-mist">
              <div className={`h-5 rounded-full ${barColor} transition-[width]`} style={{ width: `${Math.max(pct, s.count > 0 ? 4 : 0)}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right text-[13px] font-bold tnums text-ink">{s.count}</span>
          </div>
        );
      })}
    </div>
  );
}

// Lista de barras ordenadas por magnitud, un único hue (navy) — el color no
// necesita variar por categoría porque cada barra ya está identificada por
// su etiqueta directa, no hay varias series simultáneas que distinguir.
function BarList({
  items, formatValue,
}: { items: { label: string; value: number }[]; formatValue: (v: number, i: number) => string }) {
  if (items.length === 0) return <p className="text-[13px] text-slate2">Sin datos todavía.</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => {
        const pct = Math.max(4, Math.round((it.value / max) * 100));
        return (
          <div key={it.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-medium text-ink">{it.label}</span>
              <span className="shrink-0 text-[12px] font-semibold tnums text-slate2">{formatValue(it.value, i)}</span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-mist">
              <div className="h-3 rounded-full bg-navy" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
