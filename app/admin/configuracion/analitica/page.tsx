"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";

export default function AdminAnaliticaPage() {
  return (
    <AdminShell active="analitica">
      <AnaliticaAdmin />
    </AdminShell>
  );
}

function AnaliticaAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold text-navy">Analítica</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Mide visitas, conversiones y campañas. Cada módulo respeta el aviso de cookies: GA4 no mide hasta que el
        visitante acepta analíticas, y el píxel de Meta no carga hasta que acepta marketing.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <div className="mt-5 flex flex-col gap-5">
          {/* GA4 */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-navy">Google Analytics 4</h2>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <span className="text-[12px] font-semibold text-slate2">{theme.ga4.enabled ? "Activado" : "Desactivado"}</span>
                <input
                  type="checkbox" checked={theme.ga4.enabled}
                  onChange={(e) => setTheme((t) => ({ ...t, ga4: { ...t.ga4, enabled: e.target.checked } }))}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-hair transition-colors checked:bg-navy relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
                />
              </label>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate2">
              Medición directa vía gtag.js, con Consent Mode v2 (el estándar que exige Google en la UE): el guion se
              carga siempre, pero no mide nada hasta que el visitante acepta cookies analíticas — antes de eso, Google
              solo recibe la señal de "sin consentimiento", sin datos personales.
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-[13px] font-semibold text-ink">ID de medición</span>
              <input
                value={theme.ga4.measurementId}
                onChange={(e) => setTheme((t) => ({ ...t, ga4: { ...t.ga4, measurementId: e.target.value.trim() } }))}
                placeholder="G-XXXXXXXXXX"
                className="w-full max-w-xs rounded-card border border-hair bg-white px-4 py-3 text-[14px] tnums"
              />
            </label>
            <p className="mt-3 text-[11px] leading-relaxed text-slate2">
              Lo encuentras en GA4 → Administrar → Flujos de datos → tu flujo web. Si ya usas GTM (abajo) para cargar
              GA4 dentro del contenedor, no actives este módulo a la vez para el mismo ID: duplicarías las visitas.
            </p>
          </section>

          {/* Meta Pixel */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-navy">Meta Pixel (Facebook/Instagram Ads)</h2>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <span className="text-[12px] font-semibold text-slate2">{theme.metaPixel.enabled ? "Activado" : "Desactivado"}</span>
                <input
                  type="checkbox" checked={theme.metaPixel.enabled}
                  onChange={(e) => setTheme((t) => ({ ...t, metaPixel: { ...t.metaPixel, enabled: e.target.checked } }))}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-hair transition-colors checked:bg-navy relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
                />
              </label>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate2">
              El píxel de navegador mide visitas y construye audiencias de remarketing; solo carga si el visitante
              acepta cookies de marketing. El evento de conversión ("Lead", al enviar un formulario con la casilla de
              comunicaciones comerciales marcada) se manda además desde el servidor mediante la Conversions API, para
              que la conversión se registre igual aunque el navegador tenga bloqueador de anuncios.
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-[13px] font-semibold text-ink">ID del píxel</span>
              <input
                value={theme.metaPixel.pixelId}
                onChange={(e) => setTheme((t) => ({ ...t, metaPixel: { ...t.metaPixel, pixelId: e.target.value.trim() } }))}
                placeholder="123456789012345"
                className="w-full max-w-xs rounded-card border border-hair bg-white px-4 py-3 text-[14px] tnums"
              />
            </label>
            <p className="mt-3 text-[11px] leading-relaxed text-slate2">
              Lo encuentras en Meta Business Suite → Administrador de eventos → tu píxel → Configuración. Para activar
              el envío de conversiones desde el servidor, pide en el mismo sitio un token de la Conversions API y
              pégalo como variable de entorno <code className="rounded bg-mist px-1 py-0.5">META_CAPI_ACCESS_TOKEN</code> en
              Vercel (no aquí: es un dato sensible, no algo que deba viajar al navegador). Sin ese token, el píxel de
              cliente sigue funcionando igual.
            </p>
          </section>

          {/* GTM */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <h2 className="text-[15px] font-bold text-navy">Google Tag Manager</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate2">
              Alternativa a configurar GA4/Meta directamente: pega aquí el ID de tu contenedor y gestiona las
              etiquetas desde GTM. Solo se carga para visitantes que hayan aceptado cookies analíticas o de marketing.
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-[13px] font-semibold text-ink">ID de contenedor GTM</span>
              <input
                value={theme.gtmId}
                onChange={(e) => setTheme((t) => ({ ...t, gtmId: e.target.value.trim() }))}
                placeholder="GTM-XXXXXXX"
                className="w-full max-w-xs rounded-card border border-hair bg-white px-4 py-3 text-[14px] tnums"
              />
            </label>
            <p className="mt-3 text-[12px] leading-relaxed text-slate2">
              El sitio ya envía eventos a <code className="rounded bg-mist px-1 py-0.5">dataLayer</code> listos para
              configurar en GTM/GA4/Meta: <code className="rounded bg-mist px-1 py-0.5">page_view</code> (navegación),{" "}
              <code className="rounded bg-mist px-1 py-0.5">generate_lead</code> (tarificador y &ldquo;quiero que me
              llamen&rdquo;) y <code className="rounded bg-mist px-1 py-0.5">whatsapp_click</code>. Estos mismos
              eventos ya llegan también a GA4 y Meta Pixel directos si los activas arriba — no hace falta duplicar la
              configuración en GTM para ellos. El{" "}
              <a href="/admin/utm" className="font-semibold text-navy underline">dashboard de UTM</a> del panel
              muestra la atribución interna (origen, campaña, página de aterrizaje) de cada lead.
            </p>
          </section>
        </div>
      )}

      <SaveBar saving={saving} saved={saved} disabled={loading}
        onSave={() => save({ gtmId: theme.gtmId, ga4: theme.ga4, metaPixel: theme.metaPixel })} />
    </main>
  );
}
