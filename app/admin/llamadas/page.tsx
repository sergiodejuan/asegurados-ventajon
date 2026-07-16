"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { fmt } from "@/lib/adminFormat";
import { StatTile, FilterTab } from "@/components/admin/Widgets";

type Llamada = {
  id: string; leadId: string; createdAt: string; updatedAt: string; status: string;
  producto: string; source: string; presupuestoId: string; motivo: string;
  diaLlamada: string; turnoLlamada: string; fechaProgramada: string; horaProgramada: string;
  agente: string; notas: { id: string; at: string; texto: string }[];
  nombre: string; telefono: string; codigoPostal: string;
};

const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-brand-red/10 text-brand-red-deep",
  programada: "bg-navy/10 text-navy",
  hecha: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-slate-200 text-slate-600",
};

function cuando(l: Llamada): string {
  if (l.fechaProgramada) return `${l.fechaProgramada}${l.horaProgramada ? ` · ${l.horaProgramada}` : ""}`;
  const partes = [l.diaLlamada, l.turnoLlamada].filter(Boolean);
  return partes.length ? partes.join(" · ") : "Sin programar";
}

export default function AdminLlamadasPage() {
  return (
    <AdminShell active="llamadas">
      <LlamadasCrm />
    </AdminShell>
  );
}

function LlamadasCrm() {
  const { token } = useAdminToken();
  const [items, setItems] = useState<Llamada[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [storage, setStorage] = useState("");
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterProducto, setFilterProducto] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAgente, setFilterAgente] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/admin/llamadas", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setItems(body.llamadas); setStatuses(body.statuses); setStatusLabels(body.statusLabels);
      setStorage(body.storage); setLoadedOnce(true);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const productos = useMemo(
    () => Array.from(new Set(items.map((l) => l.producto).filter(Boolean))).sort(),
    [items]
  );
  const agentes = useMemo(
    () => Array.from(new Set(items.map((l) => l.agente).filter(Boolean))).sort(),
    [items]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((l) => {
      if (filterProducto !== "all" && l.producto !== filterProducto) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (filterAgente !== "all" && l.agente !== filterAgente) return false;
      if (from && l.createdAt.slice(0, 10) < from) return false;
      if (to && l.createdAt.slice(0, 10) > to) return false;
      if (q) {
        const hay = `${l.nombre} ${l.telefono} ${l.motivo}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterProducto, filterStatus, filterAgente, from, to, search]);

  const statCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const s of statuses) acc[s] = items.filter((l) => l.status === s).length;
    return acc;
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
        <h1 className="text-[22px] font-extrabold text-navy">Llamadas solicitadas</h1>
        <span className="rounded-pill bg-navy/10 px-2.5 py-1 text-[11px] font-semibold text-navy">
          {storage === "kv" ? "KV" : "memoria (dev)"}
        </span>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Todas" value={items.length} active={filterStatus === "all"} onClick={() => setFilterStatus("all")} />
        {statuses.map((s) => (
          <StatTile key={s} label={statusLabels[s] ?? s} value={statCounts[s] ?? 0}
            active={filterStatus === s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)} />
        ))}
      </div>

      {/* Filtros */}
      <div className="mt-5 flex flex-col gap-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o motivo…"
          className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]"
        />
        {productos.length > 0 && (
          <div role="tablist" aria-label="Filtrar por ramo" className="flex flex-wrap gap-2">
            <FilterTab label="Todos los ramos" active={filterProducto === "all"} onClick={() => setFilterProducto("all")} small />
            {productos.map((p) => (
              <FilterTab key={p} label={p} active={filterProducto === p} onClick={() => setFilterProducto(p)} small />
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-ink">Desde</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-ink">Hasta</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
          </label>
          {agentes.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-ink">Agente</span>
              <select value={filterAgente} onChange={(e) => setFilterAgente(e.target.value)}
                className="rounded-card border border-hair bg-white px-3 py-2 text-[13px]">
                <option value="all">Todos</option>
                {agentes.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          )}
          {(from || to || filterAgente !== "all") && (
            <button type="button" onClick={() => { setFrom(""); setTo(""); setFilterAgente("all"); }}
              className="rounded-pill border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
              Quitar filtros de fecha/agente
            </button>
          )}
        </div>
        <p className="text-[13px] text-slate2">{visible.length} resultado{visible.length === 1 ? "" : "s"}</p>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {visible.length === 0 && <li className="rounded-card border border-hair bg-white p-5 text-center text-[14px] text-slate2">No hay llamadas con estos filtros.</li>}
        {visible.map((l) => (
          <li key={l.id}>
            <Link href={`/admin/llamadas/${l.id}`} className="flex items-center justify-between gap-3 rounded-card border border-hair bg-white px-4 py-3.5 text-left transition-colors hover:bg-mist">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-ink">{l.nombre || "Sin nombre"}</p>
                <p className="truncate text-[13px] text-slate2 tnums capitalize">
                  {l.telefono} · {l.producto || "sin ramo"} · {cuando(l)}{l.agente ? ` · ${l.agente}` : ""} · {fmt(l.createdAt)}
                </p>
              </div>
              <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[l.status] ?? "bg-slate-200"}`}>
                {statusLabels[l.status] ?? l.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
