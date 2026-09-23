"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type SiteLockStatus = { enabled: boolean; hasPassword: boolean; updatedAt: string; updatedBy: string };

export default function AdminBloqueoWebPage() {
  return (
    <AdminShell active="bloqueo-web">
      <BloqueoWebAdmin />
    </AdminShell>
  );
}

function BloqueoWebAdmin() {
  const { token } = useAdminToken();
  const [status, setStatus] = useState<SiteLockStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/site-lock", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo cargar."); setLoading(false); return; }
      setStatus({ enabled: body.enabled, hasPassword: body.hasPassword, updatedAt: body.updatedAt, updatedBy: body.updatedBy });
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function toggleEnabled() {
    if (!status) return;
    setToggling(true); setError(null);
    try {
      const res = await fetch("/api/admin/site-lock", {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ enabled: !status.enabled }),
      });
      const body = await res.json();
      if (res.ok && body.ok) setStatus({ enabled: body.enabled, hasPassword: body.hasPassword, updatedAt: body.updatedAt, updatedBy: body.updatedBy });
      else setError(body.error ?? "No se pudo actualizar.");
    } catch { setError("Error de conexión."); }
    setToggling(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null); setPwSaved(false);
    if (password.length < 8) { setPwError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirm) { setPwError("Las contraseñas no coinciden."); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/site-lock", {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ password }),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setStatus({ enabled: body.enabled, hasPassword: body.hasPassword, updatedAt: body.updatedAt, updatedBy: body.updatedBy });
        setPassword(""); setConfirm("");
        setPwSaved(true); setTimeout(() => setPwSaved(false), 1800);
      } else {
        setPwError(body.error ?? "No se pudo guardar.");
      }
    } catch { setPwError("Error de conexión."); }
    setPwSaving(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="text-[22px] font-extrabold text-navy">Bloqueo de la web</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Restringe el acceso público a toda la web (excepto este panel de administración) tras una
        contraseña. Útil para mantenimiento o antes de un lanzamiento. El resto del equipo con acceso
        al panel sigue entrando con normalidad — solo se pide contraseña a los visitantes.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && status && (
        <>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-card border border-hair bg-white p-4 shadow-soft">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink">
                {status.enabled ? "Web bloqueada" : "Web accesible al público"}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate2">
                {status.enabled
                  ? "Cualquier visitante debe introducir la contraseña para navegar por la web."
                  : "La web funciona con normalidad para cualquier visitante."}
                {status.updatedAt && (
                  <> {" "}· Última actualización: {new Date(status.updatedAt).toLocaleString("es-ES")}{status.updatedBy ? ` por ${status.updatedBy}` : ""}.</>
                )}
              </p>
            </div>
            <button
              type="button" onClick={toggleEnabled} disabled={toggling || (!status.enabled && !status.hasPassword)}
              className={`shrink-0 rounded-pill px-4 py-2 text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                status.enabled ? "bg-brand-red text-white" : "bg-navy text-white"
              }`}
            >
              {toggling ? "…" : status.enabled ? "Desactivar" : "Activar"}
            </button>
          </div>
          {!status.enabled && !status.hasPassword && (
            <p className="mt-2 text-[12px] text-slate2">Configura antes una contraseña para poder activar el bloqueo.</p>
          )}

          <form onSubmit={savePassword} className="mt-5 rounded-card border border-hair bg-white p-4 shadow-soft">
            <h2 className="text-[14px] font-semibold text-ink">{status.hasPassword ? "Cambiar contraseña" : "Configurar contraseña"}</h2>
            <p className="mt-1 text-[12px] text-slate2">Es la contraseña que deberán introducir los visitantes mientras la web esté bloqueada.</p>
            <label htmlFor="site-lock-new" className="sr-only">Nueva contraseña</label>
            <input
              id="site-lock-new" type="password" autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Nueva contraseña"
              className="mt-3 w-full rounded-card border border-hair bg-white px-3.5 py-2.5 text-[14px]"
            />
            <label htmlFor="site-lock-confirm" className="sr-only">Repite la contraseña</label>
            <input
              id="site-lock-confirm" type="password" autoComplete="new-password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="Repite la contraseña"
              className="mt-2.5 w-full rounded-card border border-hair bg-white px-3.5 py-2.5 text-[14px]"
            />
            {pwError && <p role="alert" className="mt-2.5 text-[13px] font-medium text-brand-red">{pwError}</p>}
            <button
              type="submit" disabled={pwSaving || !password || !confirm}
              className="mt-3.5 rounded-card bg-navy px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pwSaving ? "Guardando…" : pwSaved ? "Guardado ✓" : "Guardar contraseña"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
