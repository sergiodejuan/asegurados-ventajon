"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { DEFAULT_THEME, type SiteTheme } from "@/lib/theme";

export default function AdminAccesibilidadPage() {
  return (
    <AdminShell active="accesibilidad">
      <AccesibilidadAdmin />
    </AdminShell>
  );
}

function AccesibilidadAdmin() {
  const { token } = useAdminToken();
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/theme", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setTheme(body.theme);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ accessibilityWidget: theme.accessibilityWidget }),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setTheme(body.theme);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      } else {
        setError(body.error ?? "No se pudo guardar.");
      }
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold text-navy">Accesibilidad</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Botón flotante visible en todo el sitio público (centrado a la izquierda de la pantalla) con
        ajustes de tamaño de texto, alto contraste, subrayado de enlaces, fuente de lectura fácil,
        cursor grande y espaciado — pensado para personas con dificultades de visión. Cada visitante
        guarda sus propias preferencias en su navegador; no aparece dentro de este panel de administración.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-navy">Widget de accesibilidad</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-slate2">
                Desactívalo solo si vas a sustituirlo por otra herramienta de accesibilidad.
              </p>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[12px] font-semibold text-ink">
              <input
                type="checkbox" checked={theme.accessibilityWidget.enabled}
                onChange={(e) => setTheme((t) => ({ ...t, accessibilityWidget: { ...t.accessibilityWidget, enabled: e.target.checked } }))}
                className="h-4 w-4 cursor-pointer accent-navy"
              />
              Activo
            </label>
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-end gap-3">
          <button onClick={save} disabled={saving || loading}
            className="flex items-center justify-center rounded-card bg-navy px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40">
            {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </main>
  );
}
