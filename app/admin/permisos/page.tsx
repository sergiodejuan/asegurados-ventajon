"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type Agent = { id: string; nombre: string; email: string; rol: "admin" | "agente"; permisos: string[]; activo: boolean };

export default function AdminPermisosPage() {
  return (
    <AdminShell active="permisos">
      <PermisosAdmin />
    </AdminShell>
  );
}

function PermisosAdmin() {
  const { token } = useAdminToken();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [moduleLabels, setModuleLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/agentes", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo cargar."); setLoading(false); return; }
      setAgents(body.agents);
      setModules((body.modules as string[]).filter((m) => m !== "agentes"));
      setModuleLabels(body.moduleLabels);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function toggleRol(a: Agent) {
    const rol = a.rol === "admin" ? "agente" : "admin";
    setSavingId(a.id);
    const res = await fetch(`/api/admin/agentes/${a.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-token": token }, body: JSON.stringify({ rol }),
    });
    const body = await res.json();
    if (res.ok && body.ok) setAgents((prev) => prev.map((x) => (x.id === a.id ? body.agent : x)));
    setSavingId(null);
  }

  async function togglePermiso(a: Agent, modulo: string) {
    const permisos = a.permisos.includes(modulo) ? a.permisos.filter((p) => p !== modulo) : [...a.permisos, modulo];
    setAgents((prev) => prev.map((x) => (x.id === a.id ? { ...x, permisos } : x)));
    setSavingId(a.id);
    const res = await fetch(`/api/admin/agentes/${a.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-token": token }, body: JSON.stringify({ permisos }),
    });
    const body = await res.json();
    if (res.ok && body.ok) setAgents((prev) => prev.map((x) => (x.id === a.id ? body.agent : x)));
    setSavingId(null);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="text-[22px] font-extrabold text-navy">Permisos</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Qué secciones del panel puede ver y usar cada agente. Un <b className="text-ink">Administrador</b> tiene acceso a todo siempre, incluida la gestión de agentes y permisos — ese acceso no se puede quitar desde esta tabla, solo cambiando su rol.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && agents.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-card border border-hair bg-white shadow-soft">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-hair bg-mist text-left">
                <th className="px-3 py-2.5 font-semibold text-ink">Agente</th>
                <th className="px-3 py-2.5 font-semibold text-ink">Rol</th>
                {modules.map((m) => (
                  <th key={m} className="px-2 py-2.5 text-center font-semibold text-ink">{moduleLabels[m] ?? m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className={`border-b border-hair last:border-0 ${savingId === a.id ? "opacity-60" : ""}`}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-ink">{a.nombre}</p>
                    <p className="text-[11px] text-slate2">{a.email}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleRol(a)}
                      className={`rounded-pill px-2.5 py-1 text-[11px] font-bold transition-colors ${a.rol === "admin" ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
                      {a.rol === "admin" ? "Administrador" : "Agente"}
                    </button>
                  </td>
                  {modules.map((m) => (
                    <td key={m} className="px-2 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={a.rol === "admin" || a.permisos.includes(m)}
                        disabled={a.rol === "admin"}
                        onChange={() => togglePermiso(a, m)}
                        className="h-4 w-4 cursor-pointer accent-navy disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && agents.length === 0 && (
        <p className="mt-6 text-[14px] text-slate2">Todavía no hay agentes. Da de alta al equipo desde <a href="/admin/agentes" className="font-semibold text-navy underline">Agentes</a>.</p>
      )}
    </main>
  );
}
