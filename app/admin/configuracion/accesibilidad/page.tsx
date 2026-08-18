"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";

export default function AdminAccesibilidadPage() {
  return (
    <AdminShell active="accesibilidad">
      <AccesibilidadAdmin />
    </AdminShell>
  );
}

function AccesibilidadAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

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

      <SaveBar saving={saving} saved={saved} disabled={loading} onSave={() => save({ accessibilityWidget: theme.accessibilityWidget })} />
    </main>
  );
}
