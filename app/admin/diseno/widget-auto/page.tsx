"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { DisenoSectionHeader } from "@/components/admin/DisenoSectionHeader";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";
import type { SiteTheme } from "@/lib/theme";

const WIDGET_ICON_OPTIONS = [
  { value: "car", label: "Coche" },
  { value: "shield", label: "Escudo" },
  { value: "compare", label: "Comparar" },
  { value: "doc", label: "Documento" },
  { value: "pin", label: "Ubicación" },
  { value: "life", label: "Vida" },
  { value: "flower", label: "Flor" },
  { value: "home", label: "Casa" },
];

export default function AdminDisenoWidgetAutoPage() {
  return (
    <AdminShell active="diseno-widget-auto">
      <WidgetAutoAdmin />
    </AdminShell>
  );
}

function WidgetAutoAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

  function setField<K extends keyof SiteTheme["autoWidget"]>(key: K, value: SiteTheme["autoWidget"][K]) {
    setTheme((t) => ({ ...t, autoWidget: { ...t.autoWidget, [key]: value } }));
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <DisenoSectionHeader
        title="Widget de seguro de auto (home)"
        description="Tarjeta flotante de captación en la esquina inferior derecha de la home (solo escritorio)."
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <label className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <input type="checkbox" checked={theme.autoWidget.enabled} onChange={(e) => setField("enabled", e.target.checked)} />
            Activado
          </label>

          <label className="mt-4 block max-w-[160px]">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Aparece a los (segundos)</span>
            <input
              type="number" min={0} max={120} value={theme.autoWidget.delaySeconds}
              onChange={(e) => setField("delaySeconds", Math.max(0, Math.min(120, Number(e.target.value) || 0)))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums"
            />
          </label>
          <label className="mt-3 block max-w-xs">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Icono</span>
            <select value={theme.autoWidget.icon} onChange={(e) => setField("icon", e.target.value)}
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]">
              {WIDGET_ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Texto</span>
            <textarea value={theme.autoWidget.title} onChange={(e) => setField("title", e.target.value)} rows={2}
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px] leading-relaxed" />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Botón · texto</span>
              <input type="text" value={theme.autoWidget.ctaLabel} onChange={(e) => setField("ctaLabel", e.target.value)}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Botón · enlace</span>
              <input type="text" value={theme.autoWidget.ctaHref} onChange={(e) => setField("ctaHref", e.target.value)}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
          </div>
        </section>
      )}

      <SaveBar saving={saving} saved={saved} disabled={loading} onSave={() => save({ autoWidget: theme.autoWidget })} />
    </main>
  );
}
