"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import type { PriceMatchLandingConfig } from "@/lib/priceMatchLanding";
import { IconByName, Phone, Star, ChevronDown } from "@/components/icons";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { PriceMatchForm } from "@/components/PriceMatchForm";

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

export function PriceMatchLanding({ config, logoUrl, phone }: { config: PriceMatchLandingConfig; logoUrl?: string; phone: string }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;

  function trackCta(kind: string) {
    pushDataLayerEvent("landing_cta_click", { landing: "price-match", cta: kind, utm_campaign: config.utm.campaign });
  }

  function scrollToForm() {
    const el = document.getElementById("price-match-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    trackCta("hero_scroll_form");
  }

  return (
    <div className="bg-white text-ink">
      {/* Sticky top bar — mismo patrón que /lp/salud */}
      <header className="sticky top-0 z-40 border-b border-hair bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={BRAND_NAME} className="h-9 w-auto max-w-[170px] object-contain" />
          ) : (
            <span translate="no" className="font-display text-[15px] font-extrabold text-navy">{BRAND_NAME}</span>
          )}
          <a href={phoneHref} onClick={() => trackCta("phone_top")}
            className="inline-flex items-center gap-1.5 rounded-pill bg-brand-red px-4 py-2 text-[14px] font-bold text-white hover:bg-brand-red-deep">
            <Phone width={16} height={16} />
            <span className="tnums">{phone}</span>
          </a>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-5xl px-4 pb-16">
        {/* HERO */}
        <section className="pt-12 text-center md:pt-16">
          {config.hero.kicker && (
            <p className="text-[12px] font-bold uppercase tracking-wide text-brand-red">{config.hero.kicker}</p>
          )}
          <h1 className="mx-auto mt-1 max-w-3xl text-[30px] font-extrabold leading-[1.15] text-navy md:text-[44px]">
            {highlightH1(config.hero.h1, config.hero.h1Highlight)}
          </h1>
          {config.hero.subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-slate2 md:text-[18px]">{config.hero.subtitle}</p>
          )}

          {config.compromisoBadges.length > 0 && (
            <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2">
              {config.compromisoBadges.map((b, i) => (
                <li key={i} className="inline-flex items-center gap-2 rounded-pill border border-hair bg-mist px-3 py-1.5 text-[13px] font-semibold text-navy">
                  {b.icon && (
                    <span className="text-brand-red"><IconByName name={b.icon} width={14} height={14} /></span>
                  )}
                  <span>{b.label}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
            <button type="button" onClick={scrollToForm}
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-card bg-brand-red px-6 text-[16px] font-semibold text-white shadow-soft hover:bg-brand-red-deep">
              Envíanos tu presupuesto
            </button>
            <a href={phoneHref} onClick={() => trackCta("phone_hero")}
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-card border-2 border-navy bg-white px-6 text-[16px] font-semibold text-navy hover:bg-mist">
              O llámanos: {phone}
            </a>
          </div>

          {config.hero.imageUrl && (
            <div className="mx-auto mt-10 max-w-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config.hero.imageUrl} alt="" className="w-full rounded-[24px] object-cover" />
            </div>
          )}
        </section>

        {/* CÓMO FUNCIONA */}
        {config.comoFunciona.steps.length > 0 && (
          <section className="mt-16 md:mt-24">
            <h2 className="text-center text-[24px] font-extrabold leading-tight text-navy md:text-[30px]">{config.comoFunciona.title}</h2>
            <ol className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
              {config.comoFunciona.steps.map((s, i) => (
                <li key={i} className="rounded-[20px] border border-hair bg-white p-5 shadow-soft">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                    <IconByName name={s.icon || "doc"} width={22} height={22} />
                  </span>
                  <h3 className="mt-3 text-[16px] font-extrabold text-navy">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink">{s.description}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* FORMULARIO */}
        <section id="price-match-form" className="mt-16 md:mt-24">
          <div className="mx-auto max-w-2xl rounded-[24px] border border-hair bg-white p-6 shadow-card md:p-8">
            <h2 className="text-[22px] font-extrabold text-navy md:text-[26px]">{config.formularioTitle}</h2>
            {config.formularioSubtitle && (
              <p className="mt-1 text-[14px] leading-relaxed text-slate2">{config.formularioSubtitle}</p>
            )}
            <div className="mt-5">
              <PriceMatchForm origen="landing" defaultProducto="salud" />
            </div>
          </div>
        </section>

        {/* PRUEBA SOCIAL + TESTIMONIOS */}
        <section className="mt-16 md:mt-24">
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-[16px] border border-hair bg-white p-5 text-center shadow-soft">
            <div className="flex items-center gap-0.5 text-amber-400" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => <Star key={i} width={20} height={20} />)}
            </div>
            <p className="text-[24px] font-extrabold tnums text-navy">{config.socialProof.valor}</p>
            <p className="text-[12px] text-slate2">{config.socialProof.numValoraciones}</p>
          </div>
          {config.socialProof.testimonios.length > 0 && (
            <ul className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
              {config.socialProof.testimonios.map((t, i) => (
                <li key={i} className="rounded-[20px] border border-hair bg-mist/40 p-5">
                  <p className="text-[15px] italic leading-relaxed text-ink">&ldquo;{t.texto}&rdquo;</p>
                  <p className="mt-3 text-[13px] font-semibold text-slate2">— {t.autor}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* FAQ */}
        {config.faq.items.length > 0 && (
          <section className="mt-16 md:mt-24">
            <h2 className="text-center text-[22px] font-extrabold text-navy md:text-[28px]">{config.faq.title}</h2>
            <ul className="mx-auto mt-6 max-w-3xl divide-y divide-hair rounded-[20px] border border-hair bg-white">
              {config.faq.items.map((f, i) => (
                <li key={i}>
                  <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-mist">
                    <span className="text-[15px] font-semibold text-navy">{f.q}</span>
                    <span className={`shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}>
                      <ChevronDown width={16} height={16} />
                    </span>
                  </button>
                  {openFaq === i && (
                    <p className="px-4 pb-4 text-[14px] leading-relaxed text-ink">{f.a}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* DISCLAIMER + FOOTER */}
        <section className="mt-16 md:mt-24">
          <div className="rounded-card border border-amber-200 bg-amber-50/50 p-4 text-[12px] leading-relaxed text-ink">
            <p className="font-semibold text-amber-800">Información legal</p>
            <p className="mt-1">{config.disclaimer}</p>
          </div>

          <footer className="mt-8 border-t border-hair pt-6 text-center">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
              {config.footer.enlaces.map((l, i) => (
                <li key={i}><Link href={l.href} className="text-navy underline">{l.label}</Link></li>
              ))}
            </ul>
            {config.footer.copyright && <p className="mt-3 text-[12px] text-slate2">{config.footer.copyright}</p>}
          </footer>
        </section>
      </main>
    </div>
  );
}
