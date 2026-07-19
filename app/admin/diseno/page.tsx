"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { ImageField } from "@/components/admin/ImageField";
import {
  DEFAULT_THEME, COLOR_LABELS, DISPLAY_FONT_OPTIONS, BODY_FONT_OPTIONS, HERO_PAGE_KEYS,
  type SiteTheme, type SiteColors,
} from "@/lib/theme";
import { PARTNERS } from "@/lib/brand";
import { PRODUCT_PAGES } from "@/lib/productPages";

export default function AdminDisenoPage() {
  return (
    <AdminShell active="diseno">
      <DisenoAdmin />
    </AdminShell>
  );
}

function DisenoAdmin() {
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

  function setColor(key: keyof SiteColors, value: string) {
    setTheme((t) => ({ ...t, colors: { ...t.colors, [key]: value } }));
  }

  function setHero(key: string, value: string) {
    setTheme((t) => ({ ...t, heroImages: { ...t.heroImages, [key]: value } }));
  }

  function setPartnerLogo(name: string, value: string) {
    setTheme((t) => ({ ...t, partnerLogos: { ...t.partnerLogos, [name]: value } }));
  }

  function setLoaderField<K extends keyof SiteTheme["pageTransitionLoader"]>(key: K, value: SiteTheme["pageTransitionLoader"][K]) {
    setTheme((t) => ({ ...t, pageTransitionLoader: { ...t.pageTransitionLoader, [key]: value } }));
  }

  function setLoaderSubtitle(path: string, value: string) {
    setTheme((t) => ({ ...t, pageTransitionLoader: { ...t.pageTransitionLoader, subtitles: { ...t.pageTransitionLoader.subtitles, [path]: value } } }));
  }

  function setLoaderTip(index: number, value: string) {
    setTheme((t) => {
      const tips = [...t.pageTransitionLoader.tips];
      tips[index] = value;
      return { ...t, pageTransitionLoader: { ...t.pageTransitionLoader, tips } };
    });
  }

  function addLoaderTip() {
    setTheme((t) => ({ ...t, pageTransitionLoader: { ...t.pageTransitionLoader, tips: [...t.pageTransitionLoader.tips, ""] } }));
  }

  function removeLoaderTip(index: number) {
    setTheme((t) => ({ ...t, pageTransitionLoader: { ...t.pageTransitionLoader, tips: t.pageTransitionLoader.tips.filter((_, i) => i !== index) } }));
  }

  async function save() {
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(theme),
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

  async function resetColors() {
    setTheme((t) => ({ ...t, colors: DEFAULT_THEME.colors }));
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold text-navy">Diseño del sitio</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Colores, tipografías, logos, favicon y fotos de portada. Los cambios se aplican a toda la web (incluido este panel) al guardar.
        El módulo de cookies y el seguimiento (GTM) se configuran ahora en{" "}
        <a href="/admin/configuracion/cookies" className="font-semibold text-navy underline">Configuración</a>.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <div className="mt-5 flex flex-col gap-6">
          {/* Colores */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-navy">Colores</h2>
              <button type="button" onClick={resetColors} className="text-[12px] font-semibold text-slate2 underline">Restaurar por defecto</button>
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

          {/* Tipografías */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <h2 className="text-[15px] font-bold text-navy">Tipografías</h2>
            <label className="mt-3 block">
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

          {/* Logos y favicon */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <h2 className="text-[15px] font-bold text-navy">Logos y favicon</h2>
            <ImageField
              label="Logo del menú (navbar)"
              hint="Sin logo, se muestra el nombre de la marca en texto."
              value={theme.logoUrl}
              onChange={(v) => setTheme((t) => ({ ...t, logoUrl: v }))}
              maxWidth={480} mime="image/png"
              preview="h-9"
            />
            <ImageField
              label="Logo de páginas sin salida (comparativa, quiero que me llamen…)"
              hint="Si lo dejas vacío, se usa el logo del navbar; si tampoco hay, el nombre en texto."
              value={theme.minimalLogoUrl}
              onChange={(v) => setTheme((t) => ({ ...t, minimalLogoUrl: v }))}
              maxWidth={480} mime="image/png"
              preview="h-9"
            />
            <ImageField
              label="Favicon"
              hint="Icono de la pestaña del navegador. Usa una imagen cuadrada (ideal 512×512)."
              value={theme.faviconUrl}
              onChange={(v) => setTheme((t) => ({ ...t, faviconUrl: v }))}
              maxWidth={128} mime="image/png"
              preview="h-8 w-8"
            />
          </section>

          {/* Fotos de portada */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <h2 className="text-[15px] font-bold text-navy">Fotos de portada (H1)</h2>
            <p className="mt-1 text-[12px] text-slate2">Sin foto, se muestra el fondo de marca con icono, como ahora.</p>
            <div className="mt-3 flex flex-col gap-4">
              {HERO_PAGE_KEYS.map((p) => (
                <ImageField
                  key={p.key}
                  label={p.label}
                  value={theme.heroImages[p.key] ?? ""}
                  onChange={(v) => setHero(p.key, v)}
                  maxWidth={1400} mime="image/jpeg"
                  preview="h-20 w-32"
                  wide
                />
              ))}
            </div>
          </section>

          {/* Logos de aseguradoras aliadas */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <h2 className="text-[15px] font-bold text-navy">Aseguradoras aliadas (logos)</h2>
            <p className="mt-1 text-[12px] text-slate2">
              Se muestran junto al nombre en la home y en &ldquo;Quiénes somos&rdquo;. Sin logo, solo se ve el nombre.
            </p>
            <div className="mt-3 flex flex-col gap-4">
              {PARTNERS.map((name) => (
                <ImageField
                  key={name}
                  label={name}
                  value={theme.partnerLogos[name] ?? ""}
                  onChange={(v) => setPartnerLogo(name, v)}
                  maxWidth={300} mime="image/png"
                  preview="h-9"
                />
              ))}
            </div>
          </section>

          {/* Loader entre páginas */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-navy">Loader entre páginas</h2>
              <label className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={theme.pageTransitionLoader.enabled}
                  onChange={(e) => setLoaderField("enabled", e.target.checked)}
                />
                Activado
              </label>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate2">
              Pantalla de marca a página completa que aparece al navegar entre páginas generales (home, producto, promociones, actualidad…). No se muestra en tarificadores, comparativa, &ldquo;quiero que me llamen&rdquo; ni área de cliente, que ya tienen su propia carga.
            </p>

            <ImageField
              label="Imagen del loader"
              hint='Si lo dejas vacío, se muestra el texto "mereces pagar menos" con la tipografía de marca.'
              value={theme.pageTransitionLoader.imageUrl}
              onChange={(v) => setLoaderField("imageUrl", v)}
              maxWidth={600} mime="image/png"
              preview="h-16"
            />

            <label className="mt-3 block">
              <span className="mb-1 block text-[12px] font-semibold text-ink">Subtítulo por defecto</span>
              <input
                type="text"
                value={theme.pageTransitionLoader.defaultSubtitle}
                onChange={(e) => setLoaderField("defaultSubtitle", e.target.value)}
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
                      onChange={(e) => setLoaderSubtitle(p.path, e.target.value)}
                      className="min-w-0 flex-1 rounded-card border border-hair bg-white px-3 py-2 text-[13px]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-ink">Sección &ldquo;¿Sabías que…?&rdquo;</p>
                <button type="button" onClick={addLoaderTip} className="text-[12px] font-semibold text-navy underline">Añadir</button>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {theme.pageTransitionLoader.tips.map((tip, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tip}
                      onChange={(e) => setLoaderTip(i, e.target.value)}
                      className="min-w-0 flex-1 rounded-card border border-hair bg-white px-3 py-2 text-[13px]"
                    />
                    <button type="button" onClick={() => removeLoaderTip(i)} className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
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
