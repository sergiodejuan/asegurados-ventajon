"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import {
  DEFAULT_THEME, COLOR_LABELS, DISPLAY_FONT_OPTIONS, BODY_FONT_OPTIONS, HERO_PAGE_KEYS,
  type SiteTheme, type SiteColors, type CookieConsentConfig,
} from "@/lib/theme";
import { PARTNERS } from "@/lib/brand";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function resizeImageFile(file: File, maxWidth: number, mime: "image/png" | "image/jpeg", quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL(mime, mime === "image/jpeg" ? quality : undefined));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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

  function setCookie<K extends keyof CookieConsentConfig>(key: K, value: CookieConsentConfig[K]) {
    setTheme((t) => ({ ...t, cookieConsent: { ...t.cookieConsent, [key]: value } }));
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

          {/* Módulo de cookies */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-navy">Módulo de cookies</h2>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-ink">
                <input type="checkbox" checked={theme.cookieConsent.enabled}
                  onChange={(e) => setCookie("enabled", e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-navy" />
                Activo
              </label>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate2">
              Aviso a pantalla completa que se muestra a cada visitante nuevo (una vez por navegador) en todo
              el sitio público. No aparece dentro de este panel de administración.
            </p>

            <label className="mt-4 block">
              <span className="mb-1 block text-[12px] font-semibold text-ink">Título</span>
              <input value={theme.cookieConsent.heading} onChange={(e) => setCookie("heading", e.target.value)}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-[12px] font-semibold text-ink">Texto explicativo</span>
              <textarea value={theme.cookieConsent.body} onChange={(e) => setCookie("body", e.target.value)} rows={5}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
            </label>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-[12px] font-semibold text-ink">Botón aceptar</span>
                <input value={theme.cookieConsent.acceptLabel} onChange={(e) => setCookie("acceptLabel", e.target.value)}
                  className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
              </label>
              <label>
                <span className="mb-1 block text-[12px] font-semibold text-ink">Botón rechazar</span>
                <input value={theme.cookieConsent.rejectLabel} onChange={(e) => setCookie("rejectLabel", e.target.value)}
                  className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
              </label>
              <label>
                <span className="mb-1 block text-[12px] font-semibold text-ink">Botón configurar</span>
                <input value={theme.cookieConsent.configureLabel} onChange={(e) => setCookie("configureLabel", e.target.value)}
                  className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-[12px] font-semibold text-ink">Enlace política de privacidad</span>
                <input value={theme.cookieConsent.privacyHref} onChange={(e) => setCookie("privacyHref", e.target.value)}
                  className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
              </label>
              <label>
                <span className="mb-1 block text-[12px] font-semibold text-ink">Enlace política de cookies</span>
                <input value={theme.cookieConsent.cookiesHref} onChange={(e) => setCookie("cookiesHref", e.target.value)}
                  className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
              </label>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-[12px] font-semibold text-navy">Textos de las categorías (panel &ldquo;Configurar cookies&rdquo;)</summary>
              <div className="mt-3 flex flex-col gap-3">
                {(["necessary", "analytics", "marketing"] as const).map((cat) => {
                  const labelKey = `${cat}Label` as keyof CookieConsentConfig;
                  const descKey = `${cat}Desc` as keyof CookieConsentConfig;
                  return (
                    <div key={cat} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label>
                        <span className="mb-1 block text-[11px] font-semibold text-ink">Nombre</span>
                        <input value={theme.cookieConsent[labelKey] as string} onChange={(e) => setCookie(labelKey, e.target.value)}
                          className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
                      </label>
                      <label>
                        <span className="mb-1 block text-[11px] font-semibold text-ink">Descripción</span>
                        <input value={theme.cookieConsent[descKey] as string} onChange={(e) => setCookie(descKey, e.target.value)}
                          className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
                      </label>
                    </div>
                  );
                })}
              </div>
            </details>
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

function ImageField({
  label, hint, value, onChange, maxWidth, mime, preview, wide,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  maxWidth: number; mime: "image/png" | "image/jpeg"; preview: string; wide?: boolean;
}) {
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    if (file.size > MAX_FILE_BYTES) { setErr("El archivo pesa demasiado (máx. 10 MB)."); return; }
    setProcessing(true);
    try { onChange(await resizeImageFile(file, maxWidth, mime)); }
    catch { setErr("No se pudo procesar la imagen."); }
    setProcessing(false);
  }

  return (
    <label className="mt-3 block first:mt-0">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      <div className={`flex items-center gap-3 ${wide ? "" : ""}`}>
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={`shrink-0 rounded border border-hair bg-mist object-contain p-1 ${preview}`} />
        )}
        <div className="min-w-0 flex-1">
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="text-[13px]" />
          {processing && <span className="ml-2 text-[12px] text-slate2">Procesando…</span>}
        </div>
        {value && (
          <button type="button" onClick={() => { onChange(""); if (fileRef.current) fileRef.current.value = ""; }}
            className="shrink-0 text-[12px] font-semibold text-brand-red underline">
            Quitar
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-slate2">{hint}</p>}
      {err && <p role="alert" className="mt-1 text-[11px] font-medium text-brand-red">{err}</p>}
    </label>
  );
}
