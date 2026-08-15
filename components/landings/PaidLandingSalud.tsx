"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { buildTarificadorHref, type PaidLandingSaludConfig } from "@/lib/paidLandingSalud";
import { IconByName, Phone, Check, Star, ChevronDown } from "@/components/icons";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { CallRequestForm } from "@/components/CallRequestForm";

// Resalta en rojo el fragmento del H1 que coincide con `highlight`
// (case-insensitive, primera coincidencia). El resto queda en navy. Sin
// coincidencia, todo se pinta en navy — degradación silenciosa para no
// romper si el admin cambia el H1 y se olvida del highlight.
function highlightH1(h1: string, highlight: string) {
  if (!highlight) return <span>{h1}</span>;
  const idx = h1.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx < 0) return <span>{h1}</span>;
  const before = h1.slice(0, idx);
  const match = h1.slice(idx, idx + highlight.length);
  const after = h1.slice(idx + highlight.length);
  return (
    <>
      {before}<span className="text-brand-red">{match}</span>{after}
    </>
  );
}

// Landing PAID de salud (/lp/salud). Réplica del layout de la landing de
// Línea Directa Salud pero con paleta y voz de marca Asegurados Ventajon.
// Toda la copia, imágenes, precios, partners, beneficios y filas de la
// comparativa vienen del store (config) — se editan sin desplegar desde
// /admin/campanas/lp-salud.

export function PaidLandingSalud({ config, logoUrl }: { config: PaidLandingSaludConfig; logoUrl?: string }) {
  const [showAllRows, setShowAllRows] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);

  function trackCta(kind: string, productId?: string) {
    pushDataLayerEvent("landing_cta_click", {
      landing: "lp-salud",
      cta: kind,
      producto: productId ?? "",
      utm_campaign: config.utm.campaign,
    });
  }

  function openCall(productId?: string) {
    setCallModalOpen(true);
    trackCta("call_request", productId);
  }

  const initialRows = config.comparativa.initialVisibleRows || config.comparativa.rows.length;
  const visibleRows = showAllRows ? config.comparativa.rows : config.comparativa.rows.slice(0, initialRows);
  const hasHiddenRows = config.comparativa.rows.length > initialRows;
  const phoneHref = `tel:${config.phone.replace(/\s+/g, "")}`;

  return (
    <div className="bg-white text-ink">
      {/* Sticky top bar — logo de la marca (si hay) o wordmark textual, y
          teléfono comercial visible siempre. Alto ampliado a 56px para que
          el logo se vea a un tamaño usable y el táctil sea cómodo. */}
      <header className="sticky top-0 z-40 border-b border-hair bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={BRAND_NAME} className="h-9 w-auto max-w-[170px] object-contain" />
          ) : (
            <span translate="no" className="font-display text-[15px] font-extrabold text-navy">{BRAND_NAME}</span>
          )}
          <a
            href={phoneHref}
            onClick={() => trackCta("phone_top")}
            className="inline-flex items-center gap-1.5 rounded-pill bg-brand-red px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-brand-red-deep"
          >
            <Phone width={16} height={16} />
            <span className="tnums">{config.phone}</span>
          </a>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-5xl px-4 pb-32 md:pb-16">
        {/* ---------------------- HERO ---------------------- */}
        {/* Un solo bloque centrado en todos los tamaños (como la referencia
            de Línea Directa): texto arriba y imagen debajo, cero grid a dos
            columnas. Botones a ancho completo en móvil para maximizar
            área táctil y CTR — min-h 52px cumple accesibilidad WCAG. */}
        <section className="pt-6 text-center md:pt-10">
          {config.hero.kicker && (
            <p className="text-[12px] font-bold uppercase tracking-wide text-brand-red">{config.hero.kicker}</p>
          )}
          <h1 className="mx-auto mt-1 max-w-3xl text-[30px] font-extrabold leading-[1.15] text-navy md:text-[44px]">
            {highlightH1(config.hero.h1, config.hero.h1Highlight)}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[18px] font-bold text-ink md:text-[20px]">{config.hero.priceHighlight}</p>
          {config.hero.socialProof && (
            <p className="mx-auto mt-2 max-w-2xl text-[14px] text-slate2">{config.hero.socialProof}</p>
          )}
          <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
            <Link
              href={buildTarificadorHref(config)}
              onClick={() => trackCta("hero_calcular")}
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-card bg-brand-red px-6 text-[16px] font-semibold text-white shadow-soft transition-colors hover:bg-brand-red-deep"
            >
              {config.hero.ctaCalcularLabel}
            </Link>
            <button
              type="button"
              onClick={() => openCall("salud")}
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-card border-2 border-navy bg-white px-6 text-[16px] font-semibold text-navy transition-colors hover:bg-mist"
            >
              {config.hero.ctaLlamarLabel}
            </button>
          </div>
          <div className="mx-auto mt-8 max-w-3xl">
            {config.hero.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.hero.imageUrl} alt="" className="w-full rounded-[24px] object-cover" />
            ) : (
              <div className="grid aspect-[4/3] w-full place-items-center rounded-[24px] bg-mist text-[13px] font-semibold text-slate2">
                Sube la imagen del hero desde /admin
              </div>
            )}
          </div>
        </section>

        {/* ---------------------- POR QUÉ ELEGIR ---------------------- */}
        <section className="mt-14 md:mt-20">
          <h2 className="text-center text-[22px] font-extrabold leading-tight text-navy md:text-[28px]">
            {config.porQueElegir.title}
          </h2>
          {config.porQueElegir.subtitle && (
            <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] leading-relaxed text-slate2">
              {config.porQueElegir.subtitle}
            </p>
          )}
          {config.porQueElegir.partners.length > 0 && (
            <ul className="mt-7 grid grid-cols-3 items-center justify-items-center gap-4 md:grid-cols-6 md:gap-6">
              {config.porQueElegir.partners.map((p, i) => (
                <li key={`${p.name}-${i}`} className="flex h-14 w-full items-center justify-center">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="max-h-12 w-auto max-w-[110px] object-contain opacity-80 transition-opacity hover:opacity-100" />
                  ) : (
                    <span className="text-center text-[11px] font-semibold text-slate2">{p.name}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link href={buildTarificadorHref(config)} onClick={() => trackCta("porque_calcular")}
              className="inline-flex items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white sm:min-w-[220px]">
              {config.hero.ctaCalcularLabel}
            </Link>
            <button type="button" onClick={() => openCall()}
              className="inline-flex items-center justify-center rounded-card border-2 border-navy px-5 py-3.5 text-[15px] font-semibold text-navy sm:min-w-[220px]">
              {config.hero.ctaLlamarLabel}
            </button>
          </div>
        </section>

        {/* ---------------------- BENEFICIOS ---------------------- */}
        <section className="mt-14 md:mt-20">
          <h2 className="text-center text-[22px] font-extrabold text-navy md:text-[28px]">{config.beneficios.title}</h2>
          <ul className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
            {config.beneficios.items.map((b, i) => (
              <li key={i} className="flex items-start gap-3 rounded-card border border-hair bg-white p-4 shadow-soft">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                  <IconByName name={b.icon || "shield"} width={22} height={22} />
                </span>
                <p className="text-[14px] leading-relaxed text-ink">{b.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------- BANNER INTERMEDIO ---------------------- */}
        {/* Banner navy centrado (como la referencia). Si hay imagen configurada,
            se usa como background con overlay oscuro para mantener legibilidad
            del texto blanco; sin imagen, fondo navy plano. */}
        <section className="mt-14 md:mt-20">
          <div
            className="relative overflow-hidden rounded-[24px] bg-navy text-center text-white"
            style={config.bannerIntermedio.imageUrl ? {
              backgroundImage: `linear-gradient(rgba(13,21,58,0.82), rgba(13,21,58,0.82)), url("${config.bannerIntermedio.imageUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            } : undefined}
          >
            <div className="mx-auto max-w-2xl px-6 py-12 md:px-10 md:py-16">
              <h2 className="text-[24px] font-extrabold leading-tight md:text-[32px]">{config.bannerIntermedio.title}</h2>
              {config.bannerIntermedio.subtitle && (
                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/85 md:text-[16px]">{config.bannerIntermedio.subtitle}</p>
              )}
              <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
                <Link href={buildTarificadorHref(config)} onClick={() => trackCta("banner_calcular")}
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-card bg-brand-red px-6 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
                  {config.hero.ctaCalcularLabel}
                </Link>
                <button type="button" onClick={() => openCall()}
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-card border-2 border-white bg-transparent px-6 text-[16px] font-semibold text-white transition-colors hover:bg-white/10">
                  {config.hero.ctaLlamarLabel}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------- PRODUCTOS (3 tarjetas) ---------------------- */}
        <section className="mt-14 md:mt-20">
          <h2 className="text-center text-[22px] font-extrabold text-navy md:text-[28px]">{config.productos.title}</h2>
          {config.productos.intro && (
            <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] leading-relaxed text-slate2">
              {config.productos.intro}
            </p>
          )}
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {config.productos.items.map((p) => {
              const hasBg = !!p.imageUrl;
              // Con imagen de fondo (estilo referencia LD): tarjeta oscura con
              // background image + gradiente sólido para legibilidad. Todo el
              // texto en blanco, precio en rojo para máximo contraste. Sin
              // imagen, fallback a la tarjeta blanca clásica.
              return (
                <li
                  key={p.id}
                  className={`flex min-h-[380px] flex-col overflow-hidden rounded-[20px] ${hasBg ? "text-white" : "border border-hair bg-white shadow-soft"}`}
                  style={hasBg ? {
                    backgroundImage: `linear-gradient(180deg, rgba(13,21,58,0.25) 0%, rgba(13,21,58,0.65) 55%, rgba(13,21,58,0.92) 100%), url("${p.imageUrl}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  } : undefined}
                >
                  <div className={`mt-auto flex flex-col p-6 ${hasBg ? "" : ""}`}>
                    <h3 className={`text-[22px] font-extrabold ${hasBg ? "text-white" : "text-navy"}`}>{p.title}</h3>
                    <p className={`mt-2 text-[12px] font-semibold uppercase tracking-wide ${hasBg ? "text-white/80" : "text-slate2"}`}>{p.priceLabel}</p>
                    <p className={`mt-0.5 text-[22px] font-extrabold tnums ${hasBg ? "text-white" : "text-brand-red"}`}>{p.price}</p>
                    <p className={`mt-3 text-[14px] leading-relaxed ${hasBg ? "text-white/90" : "text-ink"}`}>{p.description}</p>
                    <div className="mt-5">
                      {p.ctaAction === "calcular" ? (
                        <Link href={buildTarificadorHref(config, p.id)} onClick={() => trackCta("producto_calcular", p.id)}
                          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-card bg-brand-red px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
                          {p.ctaLabel}
                        </Link>
                      ) : (
                        <button type="button" onClick={() => openCall(p.id)}
                          className={`inline-flex min-h-[48px] w-full items-center justify-center rounded-card border-2 px-5 text-[15px] font-semibold transition-colors ${hasBg ? "border-white bg-transparent text-white hover:bg-white/10" : "border-navy bg-white text-navy hover:bg-mist"}`}>
                          {p.ctaLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------------------- CONTRATA POR TELÉFONO ---------------------- */}
        <section className="mt-14 md:mt-20">
          <div className="rounded-[20px] bg-mist p-6 text-center md:p-10">
            <h2 className="text-[20px] font-extrabold text-navy md:text-[24px]">{config.contrataTelefono.title}</h2>
            <button type="button" onClick={() => openCall()}
              className="mt-5 inline-flex items-center justify-center rounded-card bg-emerald-600 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-700">
              {config.contrataTelefono.ctaLabel}
            </button>
            <p className="mt-4 text-[15px] text-slate2">
              o llama al{" "}
              <a href={phoneHref} onClick={() => trackCta("phone_middle")} className="font-bold tnums text-navy underline">
                {config.phone}
              </a>
            </p>
          </div>
        </section>

        {/* ---------------------- COMPARATIVA ---------------------- */}
        <section className="mt-14 md:mt-20">
          <h2 className="text-center text-[22px] font-extrabold leading-tight text-navy md:text-[28px]">
            {config.comparativa.title}
          </h2>
          {config.comparativa.subtitle && (
            <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] leading-relaxed text-slate2">
              {config.comparativa.subtitle}
            </p>
          )}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b border-hair px-3 py-3 text-left font-semibold text-slate2" />
                  {config.comparativa.columns.map((c, i) => (
                    <th key={i} className="border-b border-hair px-3 py-3 text-center text-[13px] font-bold text-navy">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-mist/50"}>
                    <td className="border-b border-hair px-3 py-3 text-[13px] text-ink">{row.label}</td>
                    {config.comparativa.columns.map((_, j) => (
                      <td key={j} className="border-b border-hair px-3 py-3 text-center">
                        {row.incluidoEn[j] ? (
                          <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check width={14} height={14} />
                          </span>
                        ) : (
                          <span className="text-slate2/60">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasHiddenRows && (
            <div className="mt-4 text-center">
              <button
                type="button" onClick={() => setShowAllRows((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-card border border-hair bg-white px-4 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-mist"
              >
                {showAllRows ? config.comparativa.verMenosLabel : config.comparativa.verMasLabel}
                <span className={`transition-transform ${showAllRows ? "rotate-180" : ""}`}>
                  <ChevronDown width={14} height={14} />
                </span>
              </button>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link href={buildTarificadorHref(config)} onClick={() => trackCta("comparativa_calcular")}
              className="inline-flex items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white sm:min-w-[220px]">
              {config.hero.ctaCalcularLabel}
            </Link>
            <button type="button" onClick={() => openCall()}
              className="inline-flex items-center justify-center rounded-card border-2 border-navy px-5 py-3.5 text-[15px] font-semibold text-navy sm:min-w-[220px]">
              {config.hero.ctaLlamarLabel}
            </button>
          </div>
        </section>

        {/* ---------------------- RATING ---------------------- */}
        {(config.rating.valor || config.rating.numValoraciones) && (
          <section className="mt-14 md:mt-20">
            <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-[16px] border border-hair bg-white p-5 text-center shadow-soft">
              <div className="flex items-center gap-0.5 text-amber-400">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} width={18} height={18} />)}
              </div>
              <p className="text-[22px] font-extrabold tnums text-navy">{config.rating.valor}</p>
              <p className="text-[12px] text-slate2">{config.rating.numValoraciones}</p>
            </div>
          </section>
        )}

        {/* ---------------------- FOOTER ---------------------- */}
        <footer className="mt-14 border-t border-hair pt-8 text-center md:mt-20">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
            {config.footer.enlaces.map((l, i) => (
              <li key={i}><Link href={l.href} className="text-navy underline">{l.label}</Link></li>
            ))}
          </ul>
          {config.footer.copyright && (
            <p className="mt-4 text-[12px] text-slate2">{config.footer.copyright}</p>
          )}
          {config.footer.disclaimer && (
            <p className="mx-auto mt-4 max-w-2xl text-[11px] leading-relaxed text-slate2/80">
              {config.footer.disclaimer}
            </p>
          )}
          {config.footer.notaLegal && (
            <p className="mx-auto mt-3 max-w-2xl text-[11px] leading-relaxed text-slate2/80">
              {config.footer.notaLegal}
            </p>
          )}
        </footer>
      </main>

      {/* Sticky bottom bar en móvil — teléfono + CTA principal siempre
          visibles. Botones a 48px min height (WCAG), tipografía 14/15px
          para máxima legibilidad. Safe-area por dentro para no chocar con
          la home indicator en iPhone. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <a href={phoneHref} onClick={() => trackCta("phone_bottom")}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-card border border-hair bg-white px-3 text-[14px] font-bold text-navy">
            <Phone width={16} height={16} />
            <span className="tnums">{config.phone}</span>
          </a>
          <Link href={buildTarificadorHref(config)} onClick={() => trackCta("bottom_calcular")}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-card bg-brand-red px-4 text-[15px] font-semibold text-white shadow-soft">
            {config.hero.ctaCalcularLabel}
          </Link>
        </div>
      </div>

      {/* Modal de "que me llamen" — reutiliza el mismo formulario que usa
          /quiero-que-me-llamen, así los leads viajan por el mismo pipeline
          del CRM (mismo source parametrizado) — sin duplicar validaciones.  */}
      {callModalOpen && (
        <div
          role="dialog" aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
          onClick={(e) => { if (e.currentTarget === e.target) setCallModalOpen(false); }}
        >
          <div className="w-full max-w-md rounded-t-[24px] bg-white p-5 md:rounded-[24px]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[18px] font-extrabold text-navy">Te llamamos gratis</h3>
              <button type="button" onClick={() => setCallModalOpen(false)} aria-label="Cerrar" className="text-slate2">✕</button>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate2">
              Déjanos tu teléfono y te llamamos en el próximo tramo horario disponible.
            </p>
            <div className="mt-4">
              {/* CallRequestForm reutiliza el flujo estándar (/api/call-request):
                  el equipo comercial verá el lead en /admin/llamadas con el
                  source calculado a partir de la página desde la que envía. */}
              <CallRequestForm showHeading={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
