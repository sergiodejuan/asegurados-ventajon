"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { DisenoSectionHeader } from "@/components/admin/DisenoSectionHeader";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";
import { DISPLAY_FONT_OPTIONS, BODY_FONT_OPTIONS } from "@/lib/theme";

export default function AdminDisenoTipografiaPage() {
  return (
    <AdminShell active="diseno-tipografia">
      <TipografiaAdmin />
    </AdminShell>
  );
}

function TipografiaAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <DisenoSectionHeader
        title="Tipografías"
        description="Fuente de titulares y de texto general de toda la web."
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Titulares (H1, H2…)</span>
            <select value={theme.displayFont} onChange={(e) => setTheme((t) => ({ ...t, displayFont: e.target.value }))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]">
              {DISPLAY_FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Texto general</span>
            <select value={theme.bodyFont} onChange={(e) => setTheme((t) => ({ ...t, bodyFont: e.target.value }))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]">
              {BODY_FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <p className="mt-2 text-[11px] leading-relaxed text-slate2">
            Las fuentes por defecto están optimizadas (carga instantánea). Las demás se cargan desde Google Fonts al elegirlas.
          </p>
        </section>
      )}

      <SaveBar saving={saving} saved={saved} disabled={loading}
        onSave={() => save({ displayFont: theme.displayFont, bodyFont: theme.bodyFont })} />
    </main>
  );
}
