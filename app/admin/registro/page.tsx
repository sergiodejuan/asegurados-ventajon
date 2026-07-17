"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { FilterTab } from "@/components/admin/Widgets";
import { fmt } from "@/lib/adminFormat";

type AuditLog = {
  id: string; at: string; agenteId: string; agenteNombre: string; action: string;
  modulo: string; entidad: string; entidadId: string; resumen: string;
};
type AgentOption = { id: string; nombre: string };

const ACTION_LABELS: Record<string, string> = {
  crear: "Creó", actualizar: "Actualizó", eliminar: "Eliminó", login: "Inició sesión", asignar: "Asignó", comentar: "Comentó",
};
const ACTION_COLORS: Record<string, string> = {
  crear: "bg-emerald-100 text-emerald-700", actualizar: "bg-navy/10 text-navy", eliminar: "bg-brand-red/10 text-brand-red-deep",
  login: "bg-slate-200 text-slate-600", asignar: "bg-amber-100 text-amber-700", comentar: "bg-navy/10 text-navy",
};

export default function AdminRegistroPage() {
  return (
    <AdminShell active="registro">
      <RegistroAdmin />
    </AdminShell>
  );
}

function RegistroAdmin() {
  const { token } = useAdminToken();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [filterAgente, setFilterAgente] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filterAgente !== "all") params.set("agenteId", filterAgente);
      const res = await fetch(`/api/admin/registro?${params}`, { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo cargar."); setLoading(false); return; }
      setLogs(body.logs);
      setAgents(body.agents);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token, filterAgente]);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <h1 className="text-[22px] font-extrabold text-navy">Registro de actividad</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Historial de acciones de todo el equipo en el panel — quién hizo qué y cuándo, igual que en cualquier CRM.
      </p>

      <div role="tablist" aria-label="Filtrar por agente" className="mt-4 flex flex-wrap gap-2">
        <FilterTab label="Todos" active={filterAgente === "all"} onClick={() => setFilterAgente("all")} />
        {agents.map((a) => (
          <FilterTab key={a.id} label={a.nombre} active={filterAgente === a.id} onClick={() => setFilterAgente(a.id)} />
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      <ol className="mt-4 flex flex-col gap-2.5">
        {logs.map((l) => (
          <li key={l.id} className="flex items-start gap-3 rounded-card border border-hair bg-white p-3.5 shadow-soft">
            <span className={`mt-0.5 shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-bold ${ACTION_COLORS[l.action] ?? "bg-slate-200"}`}>
              {ACTION_LABELS[l.action] ?? l.action}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-relaxed text-ink">
                <span className="font-semibold">{l.agenteNombre}</span>{l.resumen ? ` — ${l.resumen}` : ` ${ACTION_LABELS[l.action]?.toLowerCase() ?? l.action} en ${l.entidad}.`}
              </p>
              <p className="mt-0.5 text-[11px] text-slate2">{fmt(l.at)}</p>
            </div>
          </li>
        ))}
        {!loading && logs.length === 0 && <p className="text-[14px] text-slate2">Sin actividad todavía.</p>}
      </ol>
    </main>
  );
}
