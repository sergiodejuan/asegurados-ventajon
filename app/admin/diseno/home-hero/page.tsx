"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { DisenoSectionHeader } from "@/components/admin/DisenoSectionHeader";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";
import type { SiteTheme } from "@/lib/theme";

export default function AdminDisenoHomeHeroPage() {
  return (
    <AdminShell active="diseno-home-hero">
      <HomeHeroAdmin />
    </AdminShell>
  );
}

function HomeHeroAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

  function setField<K extends keyof SiteTheme["homeHero"]>(key: K, value: SiteTheme["homeHero"][K]) {
    setTheme((t) => ({ ...t, homeHero: { ...t.homeHero, [key]: value } }));
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <DisenoSectionHeader
        title="Hero de la portada (Home)"
        description="Etiqueta, titular, subtítulo y botones de la cabecera de la home."
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Etiqueta pequeña (encima del titular)</span>
            <input type="text" value={theme.homeHero.eyebrow} onChange={(e) => setField("eyebrow", e.target.value)}
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Titular (H1)</span>
            <textarea value={theme.homeHero.headline} onChange={(e) => setField("headline", e.target.value)} rows={2}
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[16px] font-bold leading-snug" />
            <p className="mt-1 text-[11px] leading-relaxed text-slate2">Pon un salto de línea donde quieras forzar el corte de línea.</p>
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Subtítulo</span>
            <textarea value={theme.homeHero.subheadline} onChange={(e) => setField("subheadline", e.target.value)} rows={3}
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px] leading-relaxed" />
          </label>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Botón principal · texto</span>
              <input type="text" value={theme.homeHero.ctaPrimaryLabel} onChange={(e) => setField("ctaPrimaryLabel", e.target.value)}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Botón principal · enlace</span>
              <input type="text" value={theme.homeHero.ctaPrimaryHref} onChange={(e) => setField("ctaPrimaryHref", e.target.value)}
                placeholder="Vacío = abre el selector de seguros"
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate2">
            Si dejas el enlace del botón principal vacío, mantiene su comportamiento actual (abre la ventana con
            todas las opciones de seguro). Si escribes una URL, se convierte en un enlace normal a esa página.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Botón secundario · texto</span>
              <input type="text" value={theme.homeHero.ctaSecondaryLabel} onChange={(e) => setField("ctaSecondaryLabel", e.target.value)}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Botón secundario · enlace</span>
              <input type="text" value={theme.homeHero.ctaSecondaryHref} onChange={(e) => setField("ctaSecondaryHref", e.target.value)}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
          </div>
        </section>
      )}

      <SaveBar saving={saving} saved={saved} disabled={loading} onSave={() => save({ homeHero: theme.homeHero })} />
    </main>
  );
}
