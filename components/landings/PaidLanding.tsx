"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { buildTarificadorHref, type Landing } from "@/lib/landings";
import { IconByName, Phone, Check, Star, ChevronDown } from "@/components/icons";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { PaidReviewsCarousel } from "@/components/landings/PaidReviewsCarousel";
import { PaidHeroQuoteModal } from "@/components/landings/PaidHeroQuoteModal";
import { PaidLlamadaModal } from "@/components/landings/PaidLlamadaModal";
import { PaidQuickCallBar } from "@/components/landings/PaidQuickCallBar";

// Landing PAID (/lp/[slug]). Réplica del layout de Línea Directa Salud pero
// con paleta y voz de marca Asegurados Ventajon, generalizada para servir
// cualquier landing de la colección (no solo salud) — toda la copia,
// imágenes, precios, partners, beneficios y filas de la comparativa vienen
// de `landing` — se editan sin desplegar desde /admin/campanas/landings.
//
// Diseñada mobile-first: la única capa base cubre pantallas de 320px+, los
// breakpoints md/lg SÓLO añaden mejoras. En mobile, el orden de lectura
// empieza por el H1 y el precio (más importante para conversión) y la
// imagen aparece al final del hero — así el LCP es el titular, que es texto
// y renderiza al instante. En desktop la imagen pasa a la izquierda con
// order-first.
//
// Rutas propias asociadas (ver app/lp/[slug]/*):
//   /lp/[slug]/tarificador — wizard embebido (solo producto "salud"); para
//     el resto de ramas, redirige al tarificador de página completa del site
//   /lp/[slug]/llamada — formulario "que me llamen" minimalista

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

// Envía un beacon "fire and forget" al dashboard interno de comparación de
// landings (ver app/api/landing/track/route.ts) — distinto de
// pushDataLayerEvent (que va a GTM, para optimización de ads): este es solo
// para poder comparar landings entre sí dentro del propio admin.
function track(slug: string, kind: "view" | "cta_calcular" | "cta_llamar") {
  try {
    const body = JSON.stringify({ slug, kind });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/landing/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/landing/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* noop — el beacon nunca debe romper la landing */ }
}

// CTA "calcular precio", genérico para las ~8 posiciones de la landing.
// Landings de producto "salud" abren el mini-modal embebido de siempre
// (2 preguntas → wizard propio); el resto enlaza directo al tarificador de
// página completa ya existente del site (o a "quiero que me llamen" para
// hogar, que no tiene tarificador propio) — sin el mini-modal, que es
// específico del flujo de salud.
function CalcularCta({
  landing, tarificadorHref, onOpen, className, style, ariaLabel, children,
}: {
  landing: Landing;
  tarificadorHref: string;
  onOpen: () => void;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  if (landing.producto === "salud") {
    return (
      <PaidHeroQuoteModal onOpen={onOpen} tarificadorHref={tarificadorHref} className={className} style={style} ariaLabel={ariaLabel}>
        {children}
      </PaidHeroQuoteModal>
    );
  }
  return (
    <Link href={tarificadorHref} onClick={onOpen} className={className} style={style} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

export function PaidLanding({ landing, logoUrl }: { landing: Landing; logoUrl?: string }) {
  const [showAllRows, setShowAllRows] = useState(false);
  const tarificadorHref = landing.producto === "salud" ? `/lp/${landing.slug}/tarificador` : buildTarificadorHref(landing);

  useEffect(() => { track(landing.slug, "view"); }, [landing.slug]);

  function trackCta(kind: string, productId?: string) {
    pushDataLayerEvent("landing_cta_click", {
      landing: landing.slug,
      cta: kind,
      producto: productId ?? "",
      utm_campaign: landing.utm.campaign,
    });
    track(landing.slug, kind.includes("llamar") ? "cta_llamar" : "cta_calcular");
  }

  const initialRows = landing.comparativa.initialVisibleRows || landing.comparativa.rows.length;
  const visibleRows = showAllRows ? landing.comparativa.rows : landing.comparativa.rows.slice(0, initialRows);
  const hasHiddenRows = landing.comparativa.rows.length > initialRows;
  const phoneHref = `tel:${landing.phone.replace(/\s+/g, "")}`;

  return (
    <div className="min-h-screen bg-mist text-ink pb-[104px] md:pb-24">
      {/* ---------------------- TOP BAR ---------------------- */}
      <header className="sticky top-0 z-40 border-b border-hair bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-5">
          <Link
            href={tarificadorHref} onClick={() => trackCta("logo")}
            aria-label={`${BRAND_NAME} — calcular seguro`}
            className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:rounded-md"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl} alt={BRAND_NAME}
                className="h-8 w-auto max-w-[160px] object-contain md:h-10 md:max-w-[190px]"
                width={190} height={40}
                decoding="async" loading="eager" fetchPriority="high"
              />
            ) : (
              <span translate="no" className="font-display text-[15px] font-extrabold text-navy md:text-[16px]">{BRAND_NAME}</span>
            )}
          </Link>

          {/* Desktop: barra "tu teléfono" + Llamadme gratis, como la referencia de
              Línea Directa, + teléfono directo. Móvil: no hay hueco junto al logo
              para la barra, así que solo el botón redondo de llamada directa
              (ver debajo); la misma captura rápida vive en variant="section". */}
          <div className="hidden items-center gap-4 md:flex">
            <PaidQuickCallBar phone={landing.phone} variant="navbar" producto={landing.producto} landingSlug={landing.slug} />
            <a
              href={phoneHref} onClick={() => trackCta("phone_top")}
              className="inline-flex items-center gap-2 text-[15px] font-bold text-emerald-700"
            >
              <Phone width={16} height={16} aria-hidden="true" /> <span className="tnums">{landing.phone}</span>
            </a>
          </div>
          <a
            href={phoneHref} onClick={() => trackCta("phone_top_mobile")}
            aria-label={`Llamar al ${landing.phone}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-soft md:hidden"
          >
            <Phone width={18} height={18} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main id="contenido">
        {/* ---------------------- HERO ----------------------
            Mobile-first: kicker → H1 → precio → estrellas → CTAs → imagen.
            El H1 es el LCP (texto, renderiza al instante) — evita esperar
            a que baje la imagen. En desktop la imagen pasa a la izquierda. */}
        <section className="mx-auto max-w-6xl px-5 pt-6 md:pt-16">
          <div className="grid gap-6 md:grid-cols-2 md:items-center md:gap-12">
            <div className="order-2 md:order-1">
              {landing.hero.imageUrl ? (
                <CalcularCta
                  landing={landing} tarificadorHref={tarificadorHref}
                  onOpen={() => trackCta("hero_image")}
                  ariaLabel="Calcular seguro"
                  className="block w-full overflow-hidden rounded-[20px] focus:outline-none focus-visible:ring-2 focus-visible:ring-navy md:rounded-[24px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={landing.hero.imageUrl} alt=""
                    className="h-auto w-full object-cover"
                    width={720} height={540}
                    style={{ aspectRatio: "4 / 3" }}
                    decoding="async"
                    loading="eager"
                    fetchPriority="high"
                  />
                </CalcularCta>
              ) : (
                <CalcularCta
                  landing={landing} tarificadorHref={tarificadorHref}
                  onOpen={() => trackCta("hero_image")}
                  ariaLabel="Calcular seguro"
                  className="grid aspect-[4/3] w-full place-items-center rounded-[20px] bg-gradient-to-br from-navy to-navy-deep text-white md:rounded-[24px]"
                >
                  <IconByName name="life" width={64} height={64} aria-hidden="true" />
                </CalcularCta>
              )}
            </div>

            <div className="order-1 md:order-2">
              {landing.hero.kicker && (
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-red md:text-[12px]">{landing.hero.kicker}</p>
              )}
              <h1 className="mt-1 text-[26px] font-extrabold leading-[1.15] text-navy sm:text-[30px] md:text-[42px] lg:text-[50px] md:leading-[1.1]">
                {highlightH1(landing.hero.h1, landing.hero.h1Highlight)}
              </h1>
              <p className="mt-3 text-[17px] font-semibold text-ink md:mt-4 md:text-[20px]">{landing.hero.priceHighlight}</p>
              {landing.hero.socialProof && (
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 md:mt-4">
                  <span className="flex items-center gap-0.5 text-amber-400" aria-hidden="true">
                    <Star width={14} height={14} /><Star width={14} height={14} /><Star width={14} height={14} /><Star width={14} height={14} />
                    <span className="relative inline-block h-3.5 w-3.5">
                      <span className="absolute inset-0 text-slate-300"><Star width={14} height={14} /></span>
                      <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}><Star width={14} height={14} /></span>
                    </span>
                  </span>
                  <p className="text-[13px] text-slate2 md:text-[14px]">{landing.hero.socialProof}</p>
                </div>
              )}
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-3 md:mt-8">
                <PaidLlamadaModal
                  onOpen={() => trackCta("hero_llamar")}
                  phone={landing.phone} producto={landing.producto} landingSlug={landing.slug}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-pill border-2 border-emerald-500 bg-white px-5 text-[15px] font-bold text-emerald-700 hover:bg-emerald-50 md:min-h-[56px] md:px-6 md:text-[16px]"
                >
                  {landing.hero.ctaLlamarLabel}
                </PaidLlamadaModal>
                <CalcularCta
                  landing={landing} tarificadorHref={tarificadorHref}
                  onOpen={() => trackCta("hero_calcular")}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-pill bg-brand-red px-5 text-[15px] font-bold text-white shadow-soft hover:bg-brand-red-deep md:min-h-[56px] md:px-6 md:text-[16px]"
                >
                  {landing.hero.ctaCalcularLabel}
                </CalcularCta>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------- POR QUÉ ELEGIR + PARTNERS ---------------------- */}
        <section className="mx-auto mt-12 max-w-6xl px-5 md:mt-24" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 700px" }}>
          <h2 className="text-center text-[22px] font-extrabold leading-tight text-navy md:text-[32px]">
            {landing.porQueElegir.title}
          </h2>
          {landing.porQueElegir.subtitle && (
            <p className="mx-auto mt-3 max-w-3xl text-center text-[15px] leading-relaxed text-slate2 md:mt-4 md:text-[18px]">
              {landing.porQueElegir.subtitle}
            </p>
          )}
          {landing.porQueElegir.partners.length > 0 && (
            <ul className="mt-8 grid grid-cols-3 items-center justify-items-center gap-3 md:mt-10 md:grid-cols-6 md:gap-8">
              {landing.porQueElegir.partners.map((p, i) => (
                <li key={`${p.name}-${i}`} className="flex h-14 w-full items-center justify-center md:h-16">
                  <CalcularCta
                    landing={landing} tarificadorHref={tarificadorHref}
                    onOpen={() => trackCta("partner", p.name)}
                    ariaLabel={`Calcular seguro con ${p.name}`}
                    className="grid h-full w-full place-items-center rounded-[10px] p-2 hover:bg-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl} alt={p.name}
                        className="max-h-10 w-auto max-w-[100px] object-contain opacity-80 transition-opacity hover:opacity-100 md:max-h-14 md:max-w-[130px]"
                        loading="lazy" decoding="async"
                      />
                    ) : (
                      <span className="text-center text-[11px] font-semibold text-slate2 md:text-[12px]">{p.name}</span>
                    )}
                  </CalcularCta>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3 md:mt-10">
            <CalcularCta landing={landing} tarificadorHref={tarificadorHref} onOpen={() => trackCta("porque_calcular")}
              className="inline-flex min-h-[48px] items-center justify-center rounded-pill bg-brand-red px-6 text-[15px] font-bold text-white sm:min-w-[240px] md:min-h-[52px]">
              {landing.hero.ctaCalcularLabel}
            </CalcularCta>
            <PaidLlamadaModal onOpen={() => trackCta("porque_llamar")} phone={landing.phone} producto={landing.producto} landingSlug={landing.slug}
              className="inline-flex min-h-[48px] items-center justify-center rounded-pill border-2 border-emerald-500 bg-white px-6 text-[15px] font-bold text-emerald-700 sm:min-w-[240px] md:min-h-[52px]">
              {landing.hero.ctaLlamarLabel}
            </PaidLlamadaModal>
          </div>
        </section>

        {/* ---------------------- BENEFICIOS ---------------------- */}
        <section className="mx-auto mt-12 max-w-6xl px-5 md:mt-24" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 600px" }}>
          <h2 className="text-center text-[22px] font-extrabold text-navy md:text-[32px]">{landing.beneficios.title}</h2>
          <ul className="mx-auto mt-8 grid max-w-4xl gap-3 md:mt-10 md:grid-cols-2 md:gap-4">
            {landing.beneficios.items.map((b, i) => (
              <li key={i}>
                <CalcularCta
                  landing={landing} tarificadorHref={tarificadorHref}
                  onOpen={() => trackCta("beneficio", String(i))}
                  className="flex h-full w-full items-start gap-3 rounded-[14px] border border-hair bg-white p-4 text-left shadow-soft transition-shadow hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-navy md:gap-4 md:rounded-[16px] md:p-5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red md:h-11 md:w-11">
                    <IconByName name={b.icon || "shield"} width={20} height={20} aria-hidden="true" />
                  </span>
                  <p className="text-[14px] leading-relaxed text-ink md:text-[16px]">{b.text}</p>
                </CalcularCta>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------- BANNER INTERMEDIO ---------------------- */}
        <section className="mx-auto mt-12 max-w-6xl px-5 md:mt-24" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 500px" }}>
          <div
            className="relative overflow-hidden rounded-[20px] bg-brand-red text-center text-white md:rounded-[24px]"
            style={landing.bannerIntermedio.imageUrl ? {
              backgroundImage: `linear-gradient(rgba(200,49,42,0.85), rgba(200,49,42,0.85)), url("${landing.bannerIntermedio.imageUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            } : undefined}
          >
            <div className="mx-auto max-w-3xl px-5 py-10 md:px-10 md:py-16">
              <h2 className="text-[22px] font-extrabold leading-tight md:text-[36px]">{landing.bannerIntermedio.title}</h2>
              {landing.bannerIntermedio.subtitle && (
                <div className="mx-auto mt-3 flex items-center justify-center gap-2 text-white/95 md:mt-4">
                  <span className="flex items-center gap-0.5 text-amber-300" aria-hidden="true">
                    <Star width={14} height={14} /><Star width={14} height={14} /><Star width={14} height={14} /><Star width={14} height={14} /><Star width={14} height={14} />
                  </span>
                  <p className="text-[13px] md:text-[15px]">{landing.bannerIntermedio.subtitle}</p>
                </div>
              )}
              <div className="mx-auto mt-5 flex max-w-md flex-col gap-2.5 sm:flex-row sm:gap-3 md:mt-6">
                <PaidLlamadaModal onOpen={() => trackCta("banner_llamar")} phone={landing.phone} producto={landing.producto} landingSlug={landing.slug}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-pill border-2 border-white bg-white/10 px-5 text-[14px] font-bold text-white hover:bg-white/20 md:min-h-[52px] md:px-6 md:text-[15px]">
                  {landing.hero.ctaLlamarLabel}
                </PaidLlamadaModal>
                <CalcularCta landing={landing} tarificadorHref={tarificadorHref} onOpen={() => trackCta("banner_calcular")}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-pill bg-white px-5 text-[14px] font-bold text-brand-red hover:bg-white/90 md:min-h-[52px] md:px-6 md:text-[15px]">
                  {landing.hero.ctaCalcularLabel}
                </CalcularCta>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------- PRODUCTOS (solo landings de salud) ---------------------- */}
        {landing.producto === "salud" && landing.productos.items.length > 0 && (
          <section className="mx-auto mt-12 max-w-6xl px-5 md:mt-24" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 900px" }}>
            <h2 className="text-center text-[22px] font-extrabold text-navy md:text-[32px]">{landing.productos.title}</h2>
            {landing.productos.intro && (
              <p className="mx-auto mt-3 max-w-3xl text-center text-[15px] leading-relaxed text-slate2 md:mt-4 md:text-[18px]">
                {landing.productos.intro}
              </p>
            )}
            <ul className="mt-8 grid gap-4 md:mt-10 md:grid-cols-3 md:gap-5">
              {landing.productos.items.map((p) => {
                const hasBg = !!p.imageUrl;
                const cardClassName = `flex h-full min-h-[320px] w-full flex-col overflow-hidden rounded-[20px] text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy md:min-h-[420px] md:rounded-[24px] ${hasBg ? "text-white" : "border border-hair bg-white shadow-soft"}`;
                const cardStyle = hasBg ? {
                  backgroundImage: `linear-gradient(180deg, rgba(13,21,58,0.25) 0%, rgba(13,21,58,0.65) 55%, rgba(13,21,58,0.92) 100%), url("${p.imageUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                } : undefined;
                const cardContent = (
                  <div className="mt-auto flex flex-col p-5 md:p-6">
                    <h3 className={`text-[20px] font-extrabold md:text-[24px] ${hasBg ? "text-white" : "text-navy"}`}>{p.title}</h3>
                    <p className={`mt-2 text-[11px] font-semibold uppercase tracking-wide md:text-[12px] ${hasBg ? "text-white/85" : "text-slate2"}`}>{p.priceLabel}</p>
                    <p className={`mt-0.5 text-[20px] font-extrabold tnums md:text-[24px] ${hasBg ? "text-white" : "text-brand-red"}`}>{p.price}</p>
                    <p className={`mt-3 text-[14px] leading-relaxed md:text-[15px] ${hasBg ? "text-white/95" : "text-ink"}`}>{p.description}</p>
                    <span className={`mt-4 inline-flex min-h-[46px] w-full items-center justify-center rounded-pill px-5 text-[14px] font-bold md:mt-5 md:min-h-[48px] md:text-[15px] ${p.ctaAction === "calcular" ? "bg-brand-red text-white" : hasBg ? "border-2 border-white bg-transparent text-white" : "border-2 border-navy bg-white text-navy"}`}>
                      {p.ctaLabel}
                    </span>
                  </div>
                );
                return (
                  <li key={p.id}>
                    {p.ctaAction === "calcular" ? (
                      <CalcularCta landing={landing} tarificadorHref={tarificadorHref} onOpen={() => trackCta("producto", p.id)} className={cardClassName} style={cardStyle}>
                        {cardContent}
                      </CalcularCta>
                    ) : (
                      <PaidLlamadaModal onOpen={() => trackCta("producto", p.id)} className={cardClassName} style={cardStyle} phone={landing.phone} producto={landing.producto} landingSlug={landing.slug}>
                        {cardContent}
                      </PaidLlamadaModal>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ---------------------- CONTRATA POR TELÉFONO ----------------------
            Misma barra de captura rápida (solo teléfono) que la referencia de
            Línea Directa coloca justo debajo de las tarjetas de producto —
            mobile-first: se apila en columna en pantallas estrechas y pasa a
            una sola línea en desktop. */}
        <section className="mx-auto mt-12 max-w-6xl px-5 md:mt-24" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 200px" }}>
          <PaidQuickCallBar
            phone={landing.phone}
            variant="section"
            label={landing.contrataTelefono.title}
            ctaLabel={landing.contrataTelefono.ctaLabel}
            producto={landing.producto}
            landingSlug={landing.slug}
          />
        </section>

        {/* ---------------------- COMPARATIVA ---------------------- */}
        <section className="mx-auto mt-12 max-w-6xl px-5 md:mt-24" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 900px" }}>
          <h2 className="text-center text-[22px] font-extrabold leading-tight text-navy md:text-[32px]">
            {landing.comparativa.title}
          </h2>
          {landing.comparativa.subtitle && (
            <p className="mx-auto mt-3 max-w-3xl text-center text-[15px] leading-relaxed text-slate2 md:mt-4">
              {landing.comparativa.subtitle}
            </p>
          )}
          <div className="mt-6 overflow-x-auto rounded-[14px] bg-white shadow-soft md:mt-8 md:rounded-[16px]">
            <table className="w-full min-w-[520px] border-collapse text-[13px] md:text-[14px]">
              <thead>
                <tr>
                  <th className="border-b border-hair px-3 py-3 text-left font-semibold text-slate2 md:px-4 md:py-4" />
                  {landing.comparativa.columns.map((c, i) => (
                    <th key={i} className="border-b border-hair px-3 py-3 text-center text-[13px] font-bold text-navy md:px-4 md:py-4 md:text-[15px]">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-mist/60"}>
                    <td className="border-b border-hair px-3 py-3 text-[13px] text-ink md:px-4 md:py-4 md:text-[15px]">{row.label}</td>
                    {landing.comparativa.columns.map((_, j) => (
                      <td key={j} className="border-b border-hair px-3 py-3 text-center md:px-4 md:py-4">
                        {row.incluidoEn[j] ? (
                          <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700 md:h-7 md:w-7" aria-label="incluido">
                            <Check width={14} height={14} aria-hidden="true" />
                          </span>
                        ) : (
                          <span className="text-slate2/60" aria-label="no incluido">—</span>
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
                aria-expanded={showAllRows}
                className="inline-flex items-center gap-1.5 rounded-pill border border-hair bg-white px-5 py-2.5 text-[14px] font-semibold text-navy hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
              >
                {showAllRows ? landing.comparativa.verMenosLabel : landing.comparativa.verMasLabel}
                <span aria-hidden="true" className={`transition-transform ${showAllRows ? "rotate-180" : ""}`}>
                  <ChevronDown width={14} height={14} />
                </span>
              </button>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3 md:mt-10">
            <CalcularCta landing={landing} tarificadorHref={tarificadorHref} onOpen={() => trackCta("comparativa_calcular")}
              className="inline-flex min-h-[48px] items-center justify-center rounded-pill bg-brand-red px-6 text-[15px] font-bold text-white sm:min-w-[240px] md:min-h-[52px]">
              {landing.hero.ctaCalcularLabel}
            </CalcularCta>
            <PaidLlamadaModal onOpen={() => trackCta("comparativa_llamar")} phone={landing.phone} producto={landing.producto} landingSlug={landing.slug}
              className="inline-flex min-h-[48px] items-center justify-center rounded-pill border-2 border-emerald-500 bg-white px-6 text-[15px] font-bold text-emerald-700 sm:min-w-[240px] md:min-h-[52px]">
              {landing.hero.ctaLlamarLabel}
            </PaidLlamadaModal>
          </div>
        </section>

        {/* ---------------------- RESEÑAS (carrusel autoscroll) ---------------------- */}
        {landing.resenas?.items?.length > 0 && (
          <div style={{ contentVisibility: "auto", containIntrinsicSize: "1px 380px" }}>
            <PaidReviewsCarousel title={landing.resenas.title} items={landing.resenas.items} />
          </div>
        )}

        {/* ---------------------- RATING ---------------------- */}
        {(landing.rating.valor || landing.rating.numValoraciones) && (
          <section className="mx-auto mt-8 max-w-6xl px-5 md:mt-14">
            <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-[20px] bg-white p-5 text-center shadow-soft md:p-6">
              <div className="flex items-center gap-0.5 text-amber-400" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} width={18} height={18} />)}
              </div>
              <p className="text-[22px] font-extrabold tnums text-navy md:text-[24px]">{landing.rating.valor}</p>
              <p className="text-[13px] text-slate2">{landing.rating.numValoraciones}</p>
            </div>
          </section>
        )}

        {/* ---------------------- FOOTER ---------------------- */}
        <footer className="mx-auto mt-12 max-w-6xl border-t border-hair px-5 pt-8 pb-6 text-center md:mt-24 md:pt-10" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 200px" }}>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
            {landing.footer.enlaces.map((l, i) => (
              <li key={i}><Link href={l.href} className="text-navy underline">{l.label}</Link></li>
            ))}
          </ul>
          {landing.footer.copyright && (
            <p className="mt-4 text-[12px] text-slate2">{landing.footer.copyright}</p>
          )}
          {landing.footer.disclaimer && (
            <p className="mx-auto mt-4 max-w-3xl text-[11px] leading-relaxed text-slate2/90">
              {landing.footer.disclaimer}
            </p>
          )}
          {landing.footer.notaLegal && (
            <p className="mx-auto mt-3 max-w-3xl text-[11px] leading-relaxed text-slate2/90">
              {landing.footer.notaLegal}
            </p>
          )}
        </footer>
      </main>

      {/* ---------------------- STICKY BOTTOM BAR ----------------------
          Mobile: icono-teléfono redondo + 2 botones flex-1 (equal width),
          nunca desborda ni siquiera en 320px porque el teléfono es
          icon-only. Desktop: distribución LD (label + número a la izq,
          2 CTAs pill a la der con justify-between). Sombra + rounded-t
          para replicar la estética de la home. */}
      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[20px] bg-brand-red shadow-[0_-16px_40px_-16px_rgba(18,32,79,0.45)] pb-[env(safe-area-inset-bottom)] md:rounded-t-[24px]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 md:justify-between md:gap-6 md:px-8 md:py-4">
          {/* Móvil: icono redondo. Desktop: label + número. */}
          <a
            href={phoneHref} onClick={() => trackCta("phone_bottom")}
            aria-label={`Llamar al ${landing.phone}`}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 md:h-auto md:w-auto md:rounded-none md:bg-transparent md:hover:bg-transparent"
          >
            <span className="md:hidden"><Phone width={18} height={18} aria-hidden="true" /></span>
            <span className="hidden flex-col text-left leading-tight md:flex">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Llámanos</span>
              <span className="text-[16px] font-extrabold tnums">{landing.phone}</span>
            </span>
          </a>

          <div className="flex flex-1 items-center gap-2 md:flex-none md:gap-3">
            <PaidLlamadaModal
              onOpen={() => trackCta("bottom_llamar")}
              phone={landing.phone} producto={landing.producto} landingSlug={landing.slug}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-pill border-2 border-white bg-transparent px-2 text-[13px] font-bold text-white hover:bg-white/10 md:flex-none md:min-h-[48px] md:px-6 md:text-[14px]"
            >
              {landing.hero.ctaLlamarLabel}
            </PaidLlamadaModal>
            <CalcularCta
              landing={landing} tarificadorHref={tarificadorHref}
              onOpen={() => trackCta("bottom_calcular")}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-pill bg-white px-2 text-[13px] font-bold text-brand-red hover:bg-white/90 md:flex-none md:min-h-[48px] md:px-6 md:text-[14px]"
            >
              {landing.hero.ctaCalcularLabel}
            </CalcularCta>
          </div>
        </div>
      </div>
    </div>
  );
}
