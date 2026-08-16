"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import type { ReferralLandingConfig } from "@/lib/referralLanding";
import { IconByName, Phone, Star, ChevronDown } from "@/components/icons";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { ReferralInviteModal } from "@/components/landings/ReferralInviteModal";

// Landing pública del programa "Amigos Ventajon" (/referidos).
// Mismo patrón visual que /precio-mejor-garantizado y /lp/salud:
// top bar + hero 2 cols + cómo funciona + banner intermedio + testimonios
// + FAQ + sticky bottom bar. Adaptada al propósito referidos: los CTAs
// abren el modal "Invita a un amigo" en vez del wizard price-match.
//
// El modal decide por sí solo si mostrar el paso de lookup (usuario
// anónimo) o el panel de compartir (usuario que llega con un código ya
// precargado — caso del área cliente autenticada, no de esta landing
// pública).

function highlightH1(h1: string, highlight: string) {
  if (!highlight) return <span>{h1}</span>;
  const idx = h1.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx < 0) return <span>{h1}</span>;
  return (
    <>
      {h1.slice(0, idx)}
      <span className="text-brand-red">{h1.slice(idx, idx + highlight.length)}</span>
      {h1.slice(idx + highlight.length)}
    </>
  );
}

export function ReferralLanding({
  config, logoUrl, phone, siteUrl,
}: {
  config: ReferralLandingConfig;
  logoUrl?: string;
  phone: string;
  siteUrl: string;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;
  const programaPausado = !config.programaActivo;

  function trackCta(kind: string) {
    pushDataLayerEvent("landing_cta_click", { landing: "referral", cta: kind, utm_campaign: config.utm.campaign });
  }

  function openModal(kind: string) {
    if (programaPausado) return;
    setModalOpen(true);
    trackCta(kind);
  }

  return (
    <div className="min-h-screen bg-mist text-ink pb-28 md:pb-24">
      {/* ---------------------- TOP BAR ---------------------- */}
      <header className="sticky top-0 z-40 border-b border-hair bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <button
            type="button" onClick={() => openModal("logo")}
            aria-label={`${BRAND_NAME} — invitar a un amigo`}
            className="inline-flex min-w-0 items-center"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={BRAND_NAME} className="h-10 w-auto max-w-[190px] object-contain" />
            ) : (
              <span translate="no" className="truncate whitespace-nowrap font-display text-[14px] font-extrabold text-navy sm:text-[16px]">{BRAND_NAME}</span>
            )}
          </button>
          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button" onClick={() => openModal("nav_invitar")} disabled={programaPausado}
              className="inline-flex items-center gap-2 rounded-pill bg-brand-red px-5 py-2.5 text-[14px] font-bold text-white hover:bg-brand-red-deep disabled:bg-slate2/40"
            >
              Invitar a un amigo
            </button>
            <a href={phoneHref} onClick={() => trackCta("phone_top")} className="inline-flex items-center gap-2 text-[15px] font-bold text-emerald-700">
              <Phone width={16} height={16} /> <span className="tnums">{phone}</span>
            </a>
          </div>
          <a
            href={phoneHref} onClick={() => trackCta("phone_top_mobile")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-brand-red px-3 py-1.5 text-[13px] font-bold text-white sm:px-4 sm:py-2 sm:text-[14px] md:hidden"
          >
            <Phone width={14} height={14} className="shrink-0" /><span className="tnums whitespace-nowrap">{phone}</span>
          </a>
        </div>
      </header>

      <main id="contenido">
        {programaPausado && (
          <section className="mx-auto mt-8 max-w-3xl px-5">
            <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-5 text-center text-[15px] font-semibold text-amber-900">
              El programa está pausado temporalmente. Vuelve en unos días.
            </div>
          </section>
        )}

        {/* ---------------------- HERO ---------------------- */}
        <section className="mx-auto max-w-6xl px-5 pt-10 md:pt-16">
          <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
            <button
              type="button" onClick={() => openModal("hero_image")}
              aria-label="Invitar a un amigo"
              className="order-1 block overflow-hidden rounded-[24px] focus:outline-none focus:ring-2 focus:ring-navy"
            >
              {config.hero.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.hero.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-brand-red to-brand-red-deep text-white">
                  <IconByName name="gift" width={72} height={72} />
                </div>
              )}
            </button>

            <div className="order-2">
              {config.hero.kicker && (
                <p className="text-[12px] font-bold uppercase tracking-wide text-brand-red">{config.hero.kicker}</p>
              )}
              <h1 className="mt-1 text-[32px] font-extrabold leading-[1.1] text-navy md:text-[44px] lg:text-[52px]">
                {highlightH1(config.hero.h1, config.hero.h1Highlight)}
              </h1>
              {config.hero.subtitle && (
                <p className="mt-4 text-[16px] leading-relaxed text-slate2 md:text-[18px]">{config.hero.subtitle}</p>
              )}
              {config.compromisoBadges.length > 0 && (
                <ul className="mt-6 flex flex-wrap items-center gap-2">
                  {config.compromisoBadges.map((b, i) => (
                    <li key={i} className="inline-flex items-center gap-2 rounded-pill border border-hair bg-white px-3 py-1.5 text-[13px] font-semibold text-navy">
                      {b.icon && (
                        <span className="text-brand-red"><IconByName name={b.icon} width={14} height={14} /></span>
                      )}
                      <span>{b.label}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <button
                  type="button" onClick={() => openModal("hero_invitar")} disabled={programaPausado}
                  className="inline-flex min-h-[56px] flex-1 items-center justify-center rounded-pill bg-brand-red px-6 text-[16px] font-bold text-white shadow-soft hover:bg-brand-red-deep disabled:bg-slate2/40"
                >
                  Invitar a un amigo
                </button>
                <a href={phoneHref} onClick={() => trackCta("hero_llamar")}
                  className="inline-flex min-h-[56px] flex-1 items-center justify-center rounded-pill border-2 border-emerald-500 bg-white px-6 text-[16px] font-bold text-emerald-700 hover:bg-emerald-50">
                  <Phone width={16} height={16} className="mr-2" />
                  Dudas al {phone}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------- CÓMO FUNCIONA ---------------------- */}
        {config.comoFunciona.steps.length > 0 && (
          <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
            <h2 className="text-center text-[24px] font-extrabold leading-tight text-navy md:text-[32px]">
              {config.comoFunciona.title}
            </h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {config.comoFunciona.steps.map((s, i) => (
                <li key={i}>
                  <button type="button" onClick={() => openModal(`como_funciona_${i}`)}
                    className="flex h-full w-full flex-col items-start rounded-[24px] border border-hair bg-white p-6 text-left shadow-soft transition-shadow hover:shadow-card focus:outline-none focus:ring-2 focus:ring-navy">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                      <IconByName name={s.icon || "gift"} width={22} height={22} />
                    </span>
                    <h3 className="mt-4 text-[18px] font-extrabold text-navy md:text-[20px]">{s.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink md:text-[16px]">{s.description}</p>
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => openModal("como_invitar")} disabled={programaPausado}
                className="inline-flex min-h-[52px] items-center justify-center rounded-pill bg-brand-red px-6 text-[15px] font-bold text-white sm:min-w-[240px] disabled:bg-slate2/40">
                Empezar ahora
              </button>
            </div>
          </section>
        )}

        {/* ---------------------- BANNER INTERMEDIO ---------------------- */}
        <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
          <div className="relative overflow-hidden rounded-[24px] bg-brand-red text-center text-white">
            <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
              <h2 className="text-[26px] font-extrabold leading-tight md:text-[36px]">
                Hasta {config.incentivo.montoReferidor * config.incentivo.capAnualPorReferidor}€ Amazon al año invitando amigos
              </h2>
              <p className="mt-3 text-[15px] text-white/90 md:text-[16px]">
                {config.incentivo.montoReferidor}€ por amigo que contrate. Cap {config.incentivo.capAnualPorReferidor}/año.
              </p>
              <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-white/90">
                <span className="flex items-center gap-0.5 text-amber-300" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} width={14} height={14} />)}
                </span>
                <p className="text-[14px] md:text-[15px]">{config.socialProof.valor} · {config.socialProof.numValoraciones}</p>
              </div>
              <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => openModal("banner_invitar")} disabled={programaPausado}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-pill bg-white px-6 text-[15px] font-bold text-brand-red hover:bg-white/90 disabled:bg-slate2/40 disabled:text-white">
                  Invitar a un amigo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------- TESTIMONIOS ---------------------- */}
        {config.socialProof.testimonios.length > 0 && (
          <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
            <h2 className="text-center text-[24px] font-extrabold text-navy md:text-[32px]">
              {config.socialProof.title}
            </h2>
            <ul className="mt-10 grid gap-5 md:grid-cols-2">
              {config.socialProof.testimonios.map((t, i) => (
                <li key={i} className="rounded-[20px] bg-white p-6 shadow-soft md:p-8">
                  <span className="flex items-center gap-0.5 text-amber-400" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((n) => <Star key={n} width={16} height={16} />)}
                  </span>
                  <p className="mt-3 text-[16px] italic leading-relaxed text-ink">&ldquo;{t.texto}&rdquo;</p>
                  <p className="mt-3 text-[13px] font-semibold text-slate2">— {t.autor}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------------------- FAQ ---------------------- */}
        {config.faq.items.length > 0 && (
          <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
            <h2 className="text-center text-[24px] font-extrabold text-navy md:text-[32px]">{config.faq.title}</h2>
            <ul className="mx-auto mt-8 max-w-3xl divide-y divide-hair overflow-hidden rounded-[20px] bg-white shadow-soft">
              {config.faq.items.map((f, i) => (
                <li key={i}>
                  <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-mist">
                    <span className="text-[16px] font-semibold text-navy">{f.q}</span>
                    <span className={`shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}>
                      <ChevronDown width={18} height={18} />
                    </span>
                  </button>
                  {openFaq === i && (
                    <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink">{f.a}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------------------- DISCLAIMER + FOOTER ---------------------- */}
        <section className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
          <div className="rounded-[16px] border border-amber-200 bg-amber-50/70 p-5 text-[13px] leading-relaxed text-ink">
            <p className="font-semibold text-amber-800">Términos del programa</p>
            <p className="mt-2">{config.disclaimer}</p>
          </div>
        </section>

        <footer className="mx-auto mt-12 max-w-6xl border-t border-hair px-5 pt-8 pb-6 text-center md:mt-20">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
            {config.footer.enlaces.map((l, i) => (
              <li key={i}><Link href={l.href} className="text-navy underline">{l.label}</Link></li>
            ))}
          </ul>
          {config.footer.copyright && (
            <p className="mt-4 text-[12px] text-slate2">{config.footer.copyright}</p>
          )}
        </footer>
      </main>

      {/* ---------------------- STICKY BOTTOM BAR ---------------------- */}
      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[24px] bg-brand-red shadow-[0_-16px_40px_-16px_rgba(18,32,79,0.45)] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:gap-6 md:px-8 md:py-4">
          <a href={phoneHref} onClick={() => trackCta("phone_bottom")} aria-label={`Llamar al ${phone}`}
            className="inline-flex shrink-0 items-center gap-2 text-white">
            <span className="hidden flex-col text-left leading-tight md:flex">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/75">¿Dudas?</span>
              <span className="text-[16px] font-extrabold tnums">{phone}</span>
            </span>
            <Phone width={18} height={18} className="md:hidden" />
          </a>
          <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none md:gap-3">
            <button type="button" onClick={() => openModal("bottom_invitar")} disabled={programaPausado}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-pill bg-white px-3 text-center text-[13px] font-bold leading-tight text-brand-red hover:bg-white/90 sm:px-4 md:min-h-[48px] md:w-auto md:px-6 md:text-[14px] disabled:bg-white/60">
              <span className="sm:hidden">Invitar · +{config.incentivo.montoReferidor}€</span>
              <span className="hidden sm:inline">Invitar a un amigo · llévate {config.incentivo.montoReferidor}€</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------- MODAL ---------------------- */}
      <ReferralInviteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        config={config}
        siteUrl={siteUrl}
      />
    </div>
  );
}
