"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CampaignConfig } from "@/lib/campaign";
import { withPromotionUtm, type Promotion } from "@/lib/promotions";

// Diapositiva ya normalizada, venga de una campaña "a mano" (/admin/campana)
// o de una promoción marcada "mostrar en la Home" (/admin/promociones): el
// carrusel de la Home las mezcla en una sola tira, distinguiendo cada una
// con una pequeña etiqueta ("Campaña" / "Promoción") y un color de insignia
// distinto, para que quede claro de dónde viene cada banner.
type BannerSlide = {
  id: string;
  kind: "campana" | "promocion";
  imageUrl: string;
  badge: string;
  headline: string;
  sub: string;
  ctaLabel: string;
  ctaHref: string;
};

export function CampaignBanner() {
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [homePromotions, setHomePromotions] = useState<Promotion[]>([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/campaign")
      .then((r) => r.json())
      .then((body) => {
        if (body.ok) { setConfig(body.config); setHomePromotions(body.homePromotions ?? []); }
      })
      .catch(() => {});
  }, []);

  const slides = useMemo<BannerSlide[]>(() => {
    const campanas: BannerSlide[] = (config?.slides ?? [])
      .filter((s) => s.activo)
      .map((s) => ({
        id: `campana-${s.id}`, kind: "campana", imageUrl: s.imageDataUrl, badge: s.price,
        headline: s.headline, sub: s.sub, ctaLabel: s.ctaLabel, ctaHref: s.ctaHref,
      }));
    const promociones: BannerSlide[] = homePromotions.map((p) => ({
      id: `promo-${p.id}`, kind: "promocion", imageUrl: p.imagenUrl, badge: p.categoria || "Promoción",
      headline: p.tituloTarjeta, sub: p.subtitulo, ctaLabel: p.ctaTexto || "Ver promoción",
      ctaHref: p.linkExterno ? withPromotionUtm(p.linkExterno, p.slug) : `/promociones/${p.slug}`,
    }));
    return [...campanas, ...promociones];
  }, [config, homePromotions]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, config?.intervalMs ?? 6000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length, paused, config?.intervalMs]);

  useEffect(() => { if (active >= slides.length) setActive(0); }, [slides.length, active]);

  if (!config || slides.length === 0) return null;
  const slide = slides[active];

  return (
    <section
      aria-label="Campaña"
      className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        key={slide.id}
        className={`relative overflow-hidden rounded-[24px] px-6 py-10 text-white shadow-soft motion-safe:animate-fade-up md:px-12 md:py-16 ${
          !slide.imageUrl ? "bg-gradient-to-br from-navy to-navy-deep" : ""
        }`}
        style={
          slide.imageUrl
            ? {
                backgroundImage: `linear-gradient(to bottom right, rgba(18,32,79,.85), rgba(18,32,79,.55)), url(${slide.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/60">
          {slide.kind === "promocion" ? "Promoción" : "Campaña"}
        </p>
        <span className={`mt-1.5 inline-flex items-center rounded-pill px-3.5 py-1.5 text-[14px] font-extrabold uppercase tracking-wide text-white ${
          slide.kind === "promocion" ? "bg-navy" : "bg-brand-red"
        }`}>
          {slide.badge}
        </span>
        <h2 className="mt-4 max-w-xl text-[26px] font-extrabold leading-tight md:text-[34px]">{slide.headline}</h2>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/85 md:text-[16px]">{slide.sub}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <a
            href={slide.ctaHref}
            className="inline-flex items-center justify-center rounded-card bg-white px-6 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-white/90"
          >
            {slide.ctaLabel}
          </a>
          <a href="/promociones" className="text-[13px] font-semibold text-white/85 underline underline-offset-2 transition-colors hover:text-white">
            Ver todas las promociones
          </a>
        </div>

        {slides.length > 1 && (
          <div role="tablist" aria-label="Diapositivas de la campaña" className="mt-8 flex gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === active}
                aria-label={`Diapositiva ${i + 1}`}
                onClick={() => setActive(i)}
                className={`h-2 rounded-pill transition-all ${i === active ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
