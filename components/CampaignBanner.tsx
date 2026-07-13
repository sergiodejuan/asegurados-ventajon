"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CampaignConfig } from "@/lib/campaign";

export function CampaignBanner() {
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/campaign")
      .then((r) => r.json())
      .then((body) => { if (body.ok) setConfig(body.config); })
      .catch(() => {});
  }, []);

  const slides = useMemo(() => (config?.slides ?? []).filter((s) => s.activo), [config]);

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
          !slide.imageDataUrl ? "bg-gradient-to-br from-navy to-navy-deep" : ""
        }`}
        style={
          slide.imageDataUrl
            ? {
                backgroundImage: `linear-gradient(to bottom right, rgba(18,32,79,.85), rgba(18,32,79,.55)), url(${slide.imageDataUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <span className="inline-flex items-center rounded-pill bg-brand-red px-3.5 py-1.5 text-[14px] font-extrabold uppercase tracking-wide text-white">
          {slide.price}
        </span>
        <h2 className="mt-4 max-w-xl text-[26px] font-extrabold leading-tight md:text-[34px]">{slide.headline}</h2>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/85 md:text-[16px]">{slide.sub}</p>
        <a
          href={slide.ctaHref}
          className="mt-6 inline-flex items-center justify-center rounded-card bg-white px-6 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-white/90"
        >
          {slide.ctaLabel}
        </a>

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
