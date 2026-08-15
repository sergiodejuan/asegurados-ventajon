"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { type PaidLandingSaludConfig } from "@/lib/paidLandingSalud";
import { IconByName, Phone, Check, Star, ChevronDown } from "@/components/icons";
import { pushDataLayerEvent } from "@/lib/dataLayer";

// Landing PAID de salud (/lp/salud). Réplica del layout de Línea Directa
// Salud pero con paleta y voz de marca Asegurados Ventajon. Toda la copia,
// imágenes, precios, partners, beneficios y filas de la comparativa vienen
// del store (config) — se editan sin desplegar desde /admin/campanas/lp-salud.
//
// Rutas propias asociadas:
//   /lp/salud/tarificador — wizard 4 pasos exclusivo del tráfico paid
//   /lp/salud/llamada    — formulario "que me llamen" minimalista

const TARIFICADOR_HREF = "/lp/salud/tarificador";
const LLAMADA_HREF = "/lp/salud/llamada";

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

export function PaidLandingSalud({ config, logoUrl }: { config: PaidLandingSaludConfig; logoUrl?: string }) {
  const [showAllRows, setShowAllRows] = useState(false);

  function trackCta(kind: string, productId?: string) {
    pushDataLayerEvent("landing_cta_click", {
      landing: "lp-salud",
      cta: kind,
      producto: productId ?? "",
      utm_campaign: config.utm.campaign,
    });
  }

  const initialRows = config.comparativa.initialVisibleRows || config.comparativa.rows.length;
  const visibleRows = showAllRows ? config.comparativa.rows : config.comparativa.rows.slice(0, initialRows);
  const hasHiddenRows = config.comparativa.rows.length > initialRows;
  const phoneHref = `tel:${config.phone.replace(/\s+/g, "")}`;

  return (
    <div className="min-h-screen bg-mist text-ink pb-28 md:pb-24">
      {/* ---------------------- TOP BAR ---------------------- */}
      <header className="sticky top-0 z-40 border-b border-hair bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link
            href={TARIFICADOR_HREF} onClick={() => trackCta("logo")}
            aria-label={`${BRAND_NAME} — calcular seguro de salud`}
            className="inline-flex items-center"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={BRAND_NAME} className="h-10 w-auto max-w-[190px] object-contain" />
            ) : (
              <span translate="no" className="font-display text-[16px] font-extrabold text-navy">{BRAND_NAME}</span>
            )}
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href={LLAMADA_HREF} onClick={() => trackCta("nav_llamada")}
              className="inline-flex items-center gap-2 rounded-pill bg-emerald-600 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-emerald-700"
            >
              <Phone width={16} height={16} /> Llamadme gratis
            </Link>
            <a
              href={phoneHref} onClick={() => trackCta("phone_top")}
              className="inline-flex items-center gap-2 text-[15px] font-bold text-emerald-700"
            >
              <Phone width={16} height={16} /> <span className="tnums">{config.phone}</span>
            </a>
          </div>
          <a
            href={phoneHref} onClick={() => trackCta("phone_top_mobile")}
            className="inline-flex items-center gap-1.5 rounded-pill bg-brand-red px-4 py-2 text-[14px] font-bold text-white md:hidden"
          >
            <Phone width={16} height={16} /><span className="tnums">{config.phone}</span>
          </a>
        </div>
      </header>

      <main id="contenido">
        {/* ---------------------- HERO ---------------------- */}
        <section className="mx-auto max-w-6xl px-5 pt-10 md:pt-16">
          <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
            <Link
              href={TARIFICADOR_HREF}
              onClick={() => trackCta("hero_image")}
              aria-label="Calcular seguro de salud"
              className="order-1 block overflow-hidden rounded-[24px] focus:outline-none focus:ring-2 focus:ring-navy"
            >
              {config.hero.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.hero.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-navy to-navy-deep text-white">
                  <IconByName name="life" width={72} height={72} />
                </div>
              )}
            </Link>

            <div className="order-2">
              {config.hero.kicker && (
                <p className="text-[12px] font-bold uppercase tracking-wide text-brand-red">{config.hero.kicker}</p>
              )}
              <h1 className="mt-1 text-[32px] font-extrabold leading-[1.1] text-navy md:text-[44px] lg:text-[52px]">
                {highlightH1(config.hero.h1, config.hero.h1Highlight)}
              </h1>
              <p className="mt-4 text-[18px] font-semibold text-ink md:text-[20px]">{config.hero.priceHighlight}</p>
              {config.hero.socialProof && (
                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="flex items-center gap-0.5 text-amber-400" aria-hidden="true">
                    <Star width={16} height={16} /><Star width={16} height={16} /><Star width={16} height={16} /><Star width={16} height={16} />
                    <span className="relative inline-block h-4 w-4">
                      <span className="absolute inset-0 text-slate-300"><Star width={16} height={16} /></span>
                      <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}><Star width={16} height={16} /></span>
                    </span>
                  </span>
                  <p className="text-[14px] text-slate2">{config.hero.socialProof}</p>
                </div>
              )}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <Link
                  href={LLAMADA_HREF} onClick={() => trackCta("hero_llamar")}
                  className="inline-flex min-h-[56px] flex-1 items-center justify-center rounded-pill border-2 border-emerald-500 bg-white px-6 text-[16px] font-bold text-emerald-700 hover:bg-emerald-50"
                >
                  {config.hero.ctaLlamarLabel}
                </Link>
                <Link
                  href={TARIFICADOR_HREF} onClick={() => trackCta("hero_calcular")}
                  className="inline-flex min-h-[56px] flex-1 items-center justify-center rounded-pill bg-brand-red px-6 text-[16px] font-bold text-white shadow-soft hover:bg-brand-red-deep"
                >
                  {config.hero.ctaCalcularLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------- POR QUÉ ELEGIR + PARTNERS ---------------------- */}
        <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
          <h2 className="text-center text-[24px] font-extrabold leading-tight text-navy md:text-[32px]">
            {config.porQueElegir.title}
          </h2>
          {config.porQueElegir.subtitle && (
            <p className="mx-auto mt-4 max-w-3xl text-center text-[16px] leading-relaxed text-slate2 md:text-[18px]">
              {config.porQueElegir.subtitle}
            </p>
          )}
          {config.porQueElegir.partners.length > 0 && (
            <ul className="mt-10 grid grid-cols-3 items-center justify-items-center gap-4 md:grid-cols-6 md:gap-8">
              {config.porQueElegir.partners.map((p, i) => (
                <li key={`${p.name}-${i}`} className="flex h-16 w-full items-center justify-center">
                  <Link
                    href={TARIFICADOR_HREF} onClick={() => trackCta("partner", p.name)}
                    aria-label={`Calcular seguro con ${p.name}`}
                    className="grid h-full w-full place-items-center rounded-[10px] p-2 hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-navy"
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="max-h-14 w-auto max-w-[130px] object-contain opacity-80 transition-opacity hover:opacity-100" />
                    ) : (
                      <span className="text-center text-[12px] font-semibold text-slate2">{p.name}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={TARIFICADOR_HREF} onClick={() => trackCta("porque_calcular")}
              className="inline-flex min-h-[52px] items-center justify-center rounded-pill bg-brand-red px-6 text-[15px] font-bold text-white sm:min-w-[240px]">
              {config.hero.ctaCalcularLabel}
            </Link>
            <Link href={LLAMADA_HREF} onClick={() => trackCta("porque_llamar")}
              className="inline-flex min-h-[52px] items-center justify-center rounded-pill border-2 border-emerald-500 bg-white px-6 text-[15px] font-bold text-emerald-700 sm:min-w-[240px]">
              {config.hero.ctaLlamarLabel}
            </Link>
          </div>
        </section>

        {/* ---------------------- BENEFICIOS ---------------------- */}
        <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
          <h2 className="text-center text-[24px] font-extrabold text-navy md:text-[32px]">{config.beneficios.title}</h2>
          <ul className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
            {config.beneficios.items.map((b, i) => (
              <li key={i}>
                <Link
                  href={TARIFICADOR_HREF} onClick={() => trackCta("beneficio", String(i))}
                  className="flex h-full items-start gap-4 rounded-[16px] border border-hair bg-white p-5 shadow-soft transition-shadow hover:shadow-card focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                    <IconByName name={b.icon || "shield"} width={22} height={22} />
                  </span>
                  <p className="text-[15px] leading-relaxed text-ink md:text-[16px]">{b.text}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------- BANNER INTERMEDIO ---------------------- */}
        <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
          <div
            className="relative overflow-hidden rounded-[24px] bg-brand-red text-center text-white"
            style={config.bannerIntermedio.imageUrl ? {
              backgroundImage: `linear-gradient(rgba(200,49,42,0.85), rgba(200,49,42,0.85)), url("${config.bannerIntermedio.imageUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            } : undefined}
          >
            <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
              <h2 className="text-[26px] font-extrabold leading-tight md:text-[36px]">{config.bannerIntermedio.title}</h2>
              {config.bannerIntermedio.subtitle && (
                <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-white/90">
                  <span className="flex items-center gap-0.5 text-amber-300" aria-hidden="true">
                    <Star width={14} height={14} /><Star width={14} height={14} /><Star width={14} height={14} /><Star width={14} height={14} /><Star width={14} height={14} />
                  </span>
                  <p className="text-[14px] md:text-[15px]">{config.bannerIntermedio.subtitle}</p>
                </div>
              )}
              <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
                <Link href={LLAMADA_HREF} onClick={() => trackCta("banner_llamar")}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-pill border-2 border-white bg-white/10 px-6 text-[15px] font-bold text-white hover:bg-white/20">
                  {config.hero.ctaLlamarLabel}
                </Link>
                <Link href={TARIFICADOR_HREF} onClick={() => trackCta("banner_calcular")}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-pill bg-white px-6 text-[15px] font-bold text-brand-red hover:bg-white/90">
                  {config.hero.ctaCalcularLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------- PRODUCTOS ---------------------- */}
        <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
          <h2 className="text-center text-[24px] font-extrabold text-navy md:text-[32px]">{config.productos.title}</h2>
          {config.productos.intro && (
            <p className="mx-auto mt-4 max-w-3xl text-center text-[16px] leading-relaxed text-slate2 md:text-[18px]">
              {config.productos.intro}
            </p>
          )}
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {config.productos.items.map((p) => {
              const hasBg = !!p.imageUrl;
              const targetHref = p.ctaAction === "calcular" ? TARIFICADOR_HREF : LLAMADA_HREF;
              return (
                <li key={p.id}>
                  <Link
                    href={targetHref}
                    onClick={() => trackCta("producto", p.id)}
                    className={`flex h-full min-h-[420px] flex-col overflow-hidden rounded-[24px] transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-navy ${hasBg ? "text-white" : "border border-hair bg-white shadow-soft"}`}
                    style={hasBg ? {
                      backgroundImage: `linear-gradient(180deg, rgba(13,21,58,0.25) 0%, rgba(13,21,58,0.65) 55%, rgba(13,21,58,0.92) 100%), url("${p.imageUrl}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    } : undefined}
                  >
                    <div className="mt-auto flex flex-col p-6">
                      <h3 className={`text-[24px] font-extrabold ${hasBg ? "text-white" : "text-navy"}`}>{p.title}</h3>
                      <p className={`mt-2 text-[12px] font-semibold uppercase tracking-wide ${hasBg ? "text-white/80" : "text-slate2"}`}>{p.priceLabel}</p>
                      <p className={`mt-0.5 text-[24px] font-extrabold tnums ${hasBg ? "text-white" : "text-brand-red"}`}>{p.price}</p>
                      <p className={`mt-3 text-[15px] leading-relaxed ${hasBg ? "text-white/90" : "text-ink"}`}>{p.description}</p>
                      <span className={`mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-pill px-5 text-[15px] font-bold ${p.ctaAction === "calcular" ? "bg-brand-red text-white" : hasBg ? "border-2 border-white bg-transparent text-white" : "border-2 border-navy bg-white text-navy"}`}>
                        {p.ctaLabel}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------------------- CONTRATA POR TELÉFONO ---------------------- */}
        <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
          <div className="rounded-[20px] bg-white p-6 shadow-soft md:p-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <h2 className="text-[22px] font-extrabold text-navy md:text-[28px]">{config.contrataTelefono.title}</h2>
              <Link href={LLAMADA_HREF} onClick={() => trackCta("contrata_llamar")}
                className="inline-flex min-h-[52px] items-center justify-center rounded-pill bg-emerald-600 px-8 text-[15px] font-bold text-white hover:bg-emerald-700">
                {config.contrataTelefono.ctaLabel}
              </Link>
              <p className="text-[15px] text-slate2">
                o llama al{" "}
                <a href={phoneHref} onClick={() => trackCta("phone_middle")} className="font-bold tnums text-navy underline">
                  {config.phone}
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------- COMPARATIVA ---------------------- */}
        <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
          <h2 className="text-center text-[24px] font-extrabold leading-tight text-navy md:text-[32px]">
            {config.comparativa.title}
          </h2>
          {config.comparativa.subtitle && (
            <p className="mx-auto mt-4 max-w-3xl text-center text-[16px] leading-relaxed text-slate2">
              {config.comparativa.subtitle}
            </p>
          )}
          <div className="mt-8 overflow-x-auto rounded-[16px] bg-white shadow-soft">
            <table className="w-full min-w-[520px] border-collapse text-[14px]">
              <thead>
                <tr>
                  <th className="border-b border-hair px-4 py-4 text-left font-semibold text-slate2" />
                  {config.comparativa.columns.map((c, i) => (
                    <th key={i} className="border-b border-hair px-4 py-4 text-center text-[14px] font-bold text-navy md:text-[15px]">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-mist/60"}>
                    <td className="border-b border-hair px-4 py-4 text-[14px] text-ink md:text-[15px]">{row.label}</td>
                    {config.comparativa.columns.map((_, j) => (
                      <td key={j} className="border-b border-hair px-4 py-4 text-center">
                        {row.incluidoEn[j] ? (
                          <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check width={15} height={15} />
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
                className="inline-flex items-center gap-1.5 rounded-pill border border-hair bg-white px-5 py-2.5 text-[14px] font-semibold text-navy hover:bg-mist"
              >
                {showAllRows ? config.comparativa.verMenosLabel : config.comparativa.verMasLabel}
                <span className={`transition-transform ${showAllRows ? "rotate-180" : ""}`}>
                  <ChevronDown width={14} height={14} />
                </span>
              </button>
            </div>
          )}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={TARIFICADOR_HREF} onClick={() => trackCta("comparativa_calcular")}
              className="inline-flex min-h-[52px] items-center justify-center rounded-pill bg-brand-red px-6 text-[15px] font-bold text-white sm:min-w-[240px]">
              {config.hero.ctaCalcularLabel}
            </Link>
            <Link href={LLAMADA_HREF} onClick={() => trackCta("comparativa_llamar")}
              className="inline-flex min-h-[52px] items-center justify-center rounded-pill border-2 border-emerald-500 bg-white px-6 text-[15px] font-bold text-emerald-700 sm:min-w-[240px]">
              {config.hero.ctaLlamarLabel}
            </Link>
          </div>
        </section>

        {/* ---------------------- RATING ---------------------- */}
        {(config.rating.valor || config.rating.numValoraciones) && (
          <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
            <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-[20px] bg-white p-6 text-center shadow-soft">
              <div className="flex items-center gap-0.5 text-amber-400">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} width={20} height={20} />)}
              </div>
              <p className="text-[24px] font-extrabold tnums text-navy">{config.rating.valor}</p>
              <p className="text-[13px] text-slate2">{config.rating.numValoraciones}</p>
            </div>
          </section>
        )}

        {/* ---------------------- FOOTER ---------------------- */}
        <footer className="mx-auto mt-16 max-w-6xl border-t border-hair px-5 pt-10 pb-6 text-center md:mt-24">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
            {config.footer.enlaces.map((l, i) => (
              <li key={i}><Link href={l.href} className="text-navy underline">{l.label}</Link></li>
            ))}
          </ul>
          {config.footer.copyright && (
            <p className="mt-4 text-[12px] text-slate2">{config.footer.copyright}</p>
          )}
          {config.footer.disclaimer && (
            <p className="mx-auto mt-4 max-w-3xl text-[11px] leading-relaxed text-slate2/80">
              {config.footer.disclaimer}
            </p>
          )}
          {config.footer.notaLegal && (
            <p className="mx-auto mt-3 max-w-3xl text-[11px] leading-relaxed text-slate2/80">
              {config.footer.notaLegal}
            </p>
          )}
        </footer>
      </main>

      {/* ---------------------- STICKY BOTTOM BAR (siempre visible) ---------------------- */}
      {/* Mismo patrón que la home (barra roja fija abajo con acciones rápidas),
          adaptada al ramo salud: teléfono + "Te llamamos gratis" + "Calcula
          tu seguro". Visible en todos los tamaños porque en paid queremos
          conversión constante, no solo cuando el hero deja de estar a la
          vista. Safe-area para respetar la home indicator del iPhone. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/20 bg-brand-red shadow-[0_-16px_40px_-16px_rgba(200,49,42,0.55)] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 md:gap-4 md:px-6 md:py-4">
          <a
            href={phoneHref} onClick={() => trackCta("phone_bottom")}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-pill bg-white/15 px-3 text-[13px] font-bold text-white hover:bg-white/25 md:min-h-[52px] md:px-5 md:text-[15px]"
          >
            <Phone width={16} height={16} />
            <span className="tnums">{config.phone}</span>
          </a>
          <Link
            href={LLAMADA_HREF} onClick={() => trackCta("bottom_llamar")}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-pill border-2 border-white bg-transparent px-4 text-[14px] font-bold text-white hover:bg-white/10 md:min-h-[52px] md:text-[15px]"
          >
            {config.hero.ctaLlamarLabel}
          </Link>
          <Link
            href={TARIFICADOR_HREF} onClick={() => trackCta("bottom_calcular")}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-pill bg-white px-4 text-[14px] font-bold text-brand-red hover:bg-white/90 md:min-h-[52px] md:text-[15px]"
          >
            {config.hero.ctaCalcularLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
