"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { DisenoSectionHeader } from "@/components/admin/DisenoSectionHeader";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";
import { COLOR_LABELS, DEFAULT_COLORS, type SiteColors } from "@/lib/theme";

export default function AdminDisenoColoresPage() {
  return (
    <AdminShell active="diseno-colores">
      <ColoresAdmin />
    </AdminShell>
  );
}

function ColoresAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

  function setColor(key: keyof SiteColors, value: string) {
    setTheme((t) => ({ ...t, colors: { ...t.colors, [key]: value } }));
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <DisenoSectionHeader
        title="Colores"
        description="Paleta de marca. Se aplica a toda la web (incluido este panel) al guardar."
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-navy">Paleta</h2>
            <button type="button" onClick={() => setTheme((t) => ({ ...t, colors: DEFAULT_COLORS }))} className="text-[12px] font-semibold text-slate2 underline">
              Restaurar por defecto
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.keys(COLOR_LABELS) as (keyof SiteColors)[]).map((key) => (
              <label key={key} className="flex items-center gap-3 rounded-card border border-hair p-2.5">
                <input type="color" value={theme.colors[key]} onChange={(e) => setColor(key, e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded border border-hair" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{COLOR_LABELS[key]}</p>
                  <p className="truncate text-[11px] tnums text-slate2">{theme.colors[key]}</p>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      <SaveBar saving={saving} saved={saved} disabled={loading} onSave={() => save({ colors: theme.colors })} />
    </main>
  );
}
