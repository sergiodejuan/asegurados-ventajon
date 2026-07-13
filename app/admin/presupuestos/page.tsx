"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { fmt } from "@/lib/adminFormat";
import { StatTile, ViewToggle, FilterTab } from "@/components/admin/Widgets";

type Presupuesto = {
  id: string; leadId: string; createdAt: string; updatedAt: string; closedAt: string;
  source: string; producto: string; status: string; data: Record<string, unknown>;
  precioAprox: number | null; notas: { id: string; at: string; texto: string }[];
  nombre: string; telefono: string; email: string;
};

const STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-brand-red/10 text-brand-red-deep",
  en_seguimiento: "bg-navy/10 text-navy",
  enviado: "bg-sky-100 text-sky-700",
  negociando: "bg-amber-100 text-amber-700",
  ganado: "bg-emerald-100 text-emerald-700",
  perdido: "bg-slate-200 text-slate-600",
};

function eur(n: number) {
  return n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";
}

export default function AdminPresupuestosPage() {
  return (
    <AdminShell active="presupuestos">
      <PresupuestosCrm />
    </AdminShell>
  );
}

function PresupuestosCrm() {
  const { token } = useAdminToken();
  const [items, setItems] = useState<Presupuesto[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [storage, setStorage] = useState("");
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterProducto, setFilterProducto] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"lista" | "pipeline">("pipeline");

  const load = useCallback(async () => {
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/admin/presupuestos", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setItems(body.presupuestos); setStatuses(body.statuses); setStatusLabels(body.statusLabels);
      setStorage(body.storage); setLoadedOnce(true);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function exportCsv() {
    try {
      const params = new URLSearchParams();
      if (filterProducto !== "all") params.set("producto", filterProducto);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/admin/presupuestos/export?${params.toString()}`, { headers: { "x-admin-token": token } });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presupuestos-asegurados-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* noop */ }
  }

  const productos = useMemo(
    () => Array.from(new Set(items.map((p) => p.producto).filter(Boolean))).sort(),
    [items]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (filterProducto !== "all" && p.producto !== filterProducto) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (q) {
        const hay = `${p.nombre} ${p.telefono} ${p.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterProducto, filterStatus, search]);

  const kpis = useMemo(() => {
    const total = items.length;
    const statCounts: Record<string, number> = {};
    for (const s of statuses) statCounts[s] = items.filter((p) => p.status === s).length;
    const withPrice = items.filter((p) => p.precioAprox != null);
    const avg = withPrice.length ? withPrice.reduce((acc, p) => acc + (p.precioAprox ?? 0), 0) / withPrice.length : 0;
    const pipelineValue = items
      .filter((p) => p.status !== "ganado" && p.status !== "perdido")
      .reduce((acc, p) => acc + (p.precioAprox ?? 0), 0);
    const wonValue = items.filter((p) => p.status === "ganado").reduce((acc, p) => acc + (p.precioAprox ?? 0), 0);
    const closed = (statCounts["ganado"] ?? 0) + (statCounts["perdido"] ?? 0);
    const winRate = closed ? Math.round(((statCounts["ganado"] ?? 0) / closed) * 100) : 0;
    return { total, statCounts, avg, pipelineValue, wonValue, winRate };
  }, [items, statuses]);

  if (!loadedOnce) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10 text-center text-[14px] text-slate2">
        {error ? <p role="alert" className="font-medium text-brand-red">{error}</p> : loading ? "Cargando…" : null}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-navy">Presupuestos</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="rounded-pill border border-navy px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
            Exportar CSV (filtro actual)
          </button>
          <span className="rounded-pill bg-navy/10 px-2.5 py-1 text-[11px] font-semibold text-navy">
            {storage === "kv" ? "KV" : "memoria (dev)"}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-navy">{kpis.total}</p>
          <p className="text-[11px] font-medium text-slate2">Total presupuestos</p>
        </div>
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-navy">{eur(kpis.pipelineValue)}/mes</p>
          <p className="text-[11px] font-medium text-slate2">Valor en pipeline</p>
        </div>
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-emerald-700">{eur(kpis.wonValue)}/mes</p>
          <p className="text-[11px] font-medium text-slate2">Valor ganado</p>
        </div>
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-navy">{kpis.winRate}%</p>
          <p className="text-[11px] font-medium text-slate2">Tasa de cierre (ganado/cerrados)</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Todos" value={kpis.total} active={filterStatus === "all"} onClick={() => setFilterStatus("all")} />
        {statuses.map((s) => (
          <StatTile key={s} label={statusLabels[s] ?? s} value={kpis.statCounts[s] ?? 0}
            active={filterStatus === s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)} />
        ))}
      </div>
      <p className="mt-2 text-[12px] text-slate2">Ticket medio orientativo: <b className="text-ink">{eur(Math.round(kpis.avg))}/mes</b></p>

      {/* Filtros */}
      <div className="mt-5 flex flex-col gap-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email…"
          className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]"
        />
        {productos.length > 0 && (
          <div role="tablist" aria-label="Filtrar por producto" className="flex flex-wrap gap-2">
            <FilterTab label="Todos los productos" active={filterProducto === "all"} onClick={() => setFilterProducto("all")} small />
            {productos.map((p) => (
              <FilterTab key={p} label={p} active={filterProducto === p} onClick={() => setFilterProducto(p)} small />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-slate2">{visible.length} resultado{visible.length === 1 ? "" : "s"}</p>
          <div className="flex gap-1 rounded-pill border border-hair bg-white p-1">
            <ViewToggle label="Lista" active={view === "lista"} onClick={() => setView("lista")} />
            <ViewToggle label="Pipeline" active={view === "pipeline"} onClick={() => setView("pipeline")} />
          </div>
        </div>
      </div>

      {view === "pipeline" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {statuses.map((s) => {
            const col = visible.filter((p) => p.status === s);
            return (
              <div key={s} className="rounded-card border border-hair bg-white p-3">
                <p className="text-[12px] font-bold text-navy">{statusLabels[s] ?? s} ({col.length})</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {col.map((p) => (
                    <li key={p.id}>
                      <Link href={`/admin/presupuestos/${p.id}`} className="block w-full rounded-lg border border-hair bg-mist px-3 py-2 text-left transition-colors hover:bg-hair/60">
                        <p className="truncate text-[12px] font-semibold text-ink">{p.nombre || "Sin nombre"}</p>
                        <p className="truncate text-[11px] text-slate2 tnums capitalize">{p.producto}{p.precioAprox != null ? ` · ≈${Math.round(p.precioAprox)}€/mes` : ""}</p>
                      </Link>
                    </li>
                  ))}
                  {col.length === 0 && <li className="text-[11px] text-slate2">—</li>}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {visible.length === 0 && <li className="rounded-card border border-hair bg-white p-5 text-center text-[14px] text-slate2">No hay presupuestos con estos filtros.</li>}
          {visible.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/presupuestos/${p.id}`} className="flex w-full items-center justify-between gap-3 rounded-card border border-hair bg-white px-4 py-3.5 text-left transition-colors hover:bg-mist">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{p.nombre || "Sin nombre"}</p>
                  <p className="truncate text-[13px] text-slate2 tnums capitalize">
                    {p.telefono} · {p.producto}{p.precioAprox != null ? ` · ≈${Math.round(p.precioAprox)}€/mes` : ""} · {fmt(p.updatedAt)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[p.status] ?? "bg-slate-200"}`}>
                  {statusLabels[p.status] ?? p.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
