"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type PublicConfig = {
  enabled: boolean;
  hasPassword: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export default function AdminAccesoPage() {
  return (
    <AdminShell active="site-access">
      <AccesoAdmin />
    </AdminShell>
  );
}

function AccesoAdmin() {
  const { token } = useAdminToken();
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", "x-admin-token": token }),
    [token],
  );

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/site-access", { headers, cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "No se pudo cargar la configuración.");
      setConfig(body.config);
      setEnabled(body.config.enabled);
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    setError(null); setMessage(null);
    if (password && password !== passwordRepeat) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    const payload: Record<string, unknown> = { enabled };
    if (password) payload.password = password;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-access", { method: "PUT", headers, body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "No se pudo guardar.");
      setConfig(body.config);
      setEnabled(body.config.enabled);
      setPassword(""); setPasswordRepeat("");
      setMessage("Configuración guardada. Los cambios pueden tardar hasta 30 segundos en aplicarse en todas las regiones.");
    } catch (e) {
      setError((e as Error).message);
    } finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold text-ink">Bloqueo de la web con contraseña</h1>
        <p className="mt-1 text-[14px] text-slate2">
          Cuando está activo, cualquier visitante que llegue a la web verá una
          pantalla que exige contraseña antes de servir cualquier página. El
          panel de administración y los webhooks de integraciones (Retell,
          Bland, Manychat, Tremendous) siguen accesibles porque tienen su
          propia autenticación.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[24px] border border-hair bg-white p-6 text-[14px] text-slate2 shadow-card">Cargando…</div>
      ) : (
        <>
          <section className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-bold text-ink">Estado</h2>
                <p className="mt-1 text-[13px] text-slate2">
                  {config?.hasPassword
                    ? "Hay una contraseña configurada."
                    : "Todavía no hay contraseña — configura una antes de activar el bloqueo."}
                </p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-5 w-5 accent-navy"
                />
                <span className="text-[14px] font-semibold text-ink">
                  {enabled ? "Bloqueo activo" : "Bloqueo desactivado"}
                </span>
              </label>
            </div>
            {config?.updatedAt && (
              <p className="mt-3 text-[12px] text-slate2">
                Última modificación: {new Date(config.updatedAt).toLocaleString("es-ES")}{" "}
                {config.updatedBy ? `por ${config.updatedBy}` : ""}
              </p>
            )}
          </section>

          <section className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <h2 className="text-[16px] font-bold text-ink">Contraseña</h2>
            <p className="mt-1 text-[13px] text-slate2">
              Mínimo 14 caracteres, con mayúscula, minúscula, dígito y símbolo.
              Compártela sólo por un canal seguro. Si dejas los campos vacíos,
              se mantiene la contraseña actual.
            </p>

            <label className="mt-4 block text-[13px] font-semibold text-ink">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-navy"
              placeholder={config?.hasPassword ? "Dejar en blanco para mantener la actual" : "Al menos 14 caracteres"}
            />

            <label className="mt-4 block text-[13px] font-semibold text-ink">Repetir contraseña</label>
            <input
              type="password"
              value={passwordRepeat}
              onChange={(e) => setPasswordRepeat(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-navy"
            />
          </section>

          {error && (
            <div className="rounded-card border border-brand-red/40 bg-brand-red/5 p-3 text-[13px] font-semibold text-brand-red">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-card border border-navy/20 bg-navy/5 p-3 text-[13px] font-semibold text-navy">
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-pill bg-navy px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
