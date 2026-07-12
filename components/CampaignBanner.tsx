"use client";

import { useEffect, useState } from "react";
import type { CampaignBanner as CampaignBannerData } from "@/lib/campaign";

export function CampaignBanner() {
  const [banner, setBanner] = useState<CampaignBannerData | null>(null);

  useEffect(() => {
    fetch("/api/campaign")
      .then((r) => r.json())
      .then((body) => { if (body.ok) setBanner(body.banner); })
      .catch(() => {});
  }, []);

  if (!banner) return null;

  return (
    <section aria-label="Campaña" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
      <div
        className={`relative overflow-hidden rounded-[24px] px-6 py-10 text-white shadow-soft motion-safe:animate-fade-up md:px-12 md:py-16 ${
          !banner.imageDataUrl ? "bg-gradient-to-br from-navy to-navy-deep" : ""
        }`}
        style={
          banner.imageDataUrl
            ? {
                backgroundImage: `linear-gradient(to bottom right, rgba(18,32,79,.85), rgba(18,32,79,.55)), url(${banner.imageDataUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <span className="inline-flex items-center rounded-pill bg-brand-red px-3.5 py-1.5 text-[14px] font-extrabold uppercase tracking-wide text-white">
          {banner.price}
        </span>
        <h2 className="mt-4 max-w-xl text-[26px] font-extrabold leading-tight md:text-[34px]">{banner.headline}</h2>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/85 md:text-[16px]">{banner.sub}</p>
        <a
          href={banner.ctaHref}
          className="mt-6 inline-flex items-center justify-center rounded-card bg-white px-6 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-white/90"
        >
          {banner.ctaLabel}
        </a>
      </div>
    </section>
  );
}
