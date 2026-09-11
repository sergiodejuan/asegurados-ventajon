"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { DisenoSectionHeader } from "@/components/admin/DisenoSectionHeader";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";
import { ImageField } from "@/components/admin/ImageField";
import { PRODUCT_PAGES } from "@/lib/productPages";
import type { SiteTheme } from "@/lib/theme";

export default function AdminDisenoLoaderPage() {
  return (
    <AdminShell active="diseno-loader">
      <LoaderAdmin />
    </AdminShell>
  );
}

function LoaderAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

  function setField<K extends keyof SiteTheme["pageTransitionLoader"]>(key: K, value: SiteTheme["pageTransitionLoader"][K]) {
    setTheme((t) => ({ ...t, pageTransitionLoader: { ...t.pageTransitionLoader, [key]: value } }));
  }
  function setSubtitle(path: string, value: string) {
    setTheme((t) => ({ ...t, pageTransitionLoader: { ...t.pageTransitionLoader, subtitles: { ...t.pageTransitionLoader.subtitles, [path]: value } } }));
  }
  function setTip(index: number, value: string) {
    setTheme((t) => {
      const tips = [...t.pageTransitionLoader.tips];
      tips[index] = value;
      return { ...t, pageTransitionLoader: { ...t.pageTransitionLoader, tips } };
    });
  }
  function addTip() {
    setTheme((t) => ({ ...t, pageTransitionLoader: { ...t.pageTransitionLoader, tips: [...t.pageTransitionLoader.tips, ""] } }));
  }
  function removeTip(index: number) {
    setTheme((t) => ({ ...t, pageTransitionLoader: { ...t.pageTransitionLoader, tips: t.pageTransitionLoader.tips.filter((_, i) => i !== index) } }));
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <DisenoSectionHeader
        title="Loader entre páginas"
        description={`Pantalla de marca a página completa al navegar entre páginas generales (home, producto, promociones, actualidad…). No se muestra en tarificadores, comparativa, "quiero que me llamen" ni área de cliente, que ya tienen su propia carga.`}
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <label className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <input type="checkbox" checked={theme.pageTransitionLoader.enabled} onChange={(e) => setField("enabled", e.target.checked)} />
            Activado
          </label>

          <div className="mt-4">
            <ImageField
              label="Imagen del loader"
              hint='Si lo dejas vacío, se muestra el texto "mereces pagar menos" con la tipografía de marca.'
              value={theme.pageTransitionLoader.imageUrl}
              onChange={(v) => setField("imageUrl", v)}
              maxWidth={600} mime="image/png"
              preview="h-16"
            />
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Subtítulo por defecto</span>
            <input
              type="text"
              value={theme.pageTransitionLoader.defaultSubtitle}
              onChange={(e) => setField("defaultSubtitle", e.target.value)}
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]"
            />
          </label>

          <div className="mt-4">
            <p className="text-[12px] font-semibold text-ink">Subtítulo por página</p>
            <div className="mt-2 flex flex-col gap-2">
              {PRODUCT_PAGES.map((p) => (
                <label key={p.path} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-[12px] text-slate2">{p.badge}</span>
                  <input
                    type="text"
                    value={theme.pageTransitionLoader.subtitles[p.path] ?? ""}
                    onChange={(e) => setSubtitle(p.path, e.target.value)}
                    className="min-w-0 flex-1 rounded-card border border-hair bg-white px-3 py-2 text-[13px]"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-semibold text-ink">Sección &ldquo;¿Sabías que…?&rdquo;</p>
              <button type="button" onClick={addTip} className="text-[12px] font-semibold text-navy underline">Añadir</button>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {theme.pageTransitionLoader.tips.map((tip, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tip}
                    onChange={(e) => setTip(i, e.target.value)}
                    className="min-w-0 flex-1 rounded-card border border-hair bg-white px-3 py-2 text-[13px]"
                  />
                  <button type="button" onClick={() => removeTip(i)} className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <SaveBar saving={saving} saved={saved} disabled={loading} onSave={() => save({ pageTransitionLoader: theme.pageTransitionLoader })} />
    </main>
  );
}
