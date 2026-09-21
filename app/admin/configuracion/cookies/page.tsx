"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";
import type { CookieConsentConfig } from "@/lib/theme";

export default function AdminCookiesPage() {
  return (
    <AdminShell active="cookies">
      <CookiesAdmin />
    </AdminShell>
  );
}

function CookiesAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

  function setCookie<K extends keyof CookieConsentConfig>(key: K, value: CookieConsentConfig[K]) {
    setTheme((t) => ({ ...t, cookieConsent: { ...t.cookieConsent, [key]: value } }));
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold text-navy">Módulo de cookies</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Aviso a pantalla completa que se muestra a cada visitante nuevo (una vez por navegador) en todo
        el sitio público. No aparece dentro de este panel de administración.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-navy">Configuración</h2>
            <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-ink">
              <input type="checkbox" checked={theme.cookieConsent.enabled}
                onChange={(e) => setCookie("enabled", e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-navy" />
              Activo
            </label>
          </div>

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
      )}

      <SaveBar saving={saving} saved={saved} disabled={loading} onSave={() => save({ cookieConsent: theme.cookieConsent })} />
    </main>
  );
}
