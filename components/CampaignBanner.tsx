"use client";

import { useEffect, useMemo, useState } from "react";
import type { CampaignConfig } from "@/lib/campaign";
import { withPromotionUtm, type Promotion } from "@/lib/promotions";
import { BRAND_NAME } from "@/lib/brand";
import { IconByName } from "./icons";

// Diapositiva ya normalizada, venga de una campaña "a mano" (pestaña
// "Banners de campaña" en /admin/promociones) o de una promoción marcada
// "mostrar en la Home" (/admin/promociones): se mezclan en una sola lista de
// tarjetas. La tarjeta solo muestra el título y el CTA, al estilo de la
// referencia (Línea Directa) — nada de etiquetas ni textos secundarios.
type BannerSlide = {
  id: string;
  imageUrl: string;
  headline: string;
  href: string;
  ctaLabel: string;
};

// "Ver condiciones del seguro de coche" en vez de un genérico "Más
// información": refuerza el SEO interno (anchor con keyword de producto) y
// deja clara la expectativa antes de clicar. Si la promoción no tiene
// categoría rellena, se cae a un genérico en vez de un texto vacío.
function promotionCtaLabel(categoria: string): string {
  if (!categoria) return "Ver condiciones";
  return `Ver condiciones del ${categoria.charAt(0).toLowerCase()}${categoria.slice(1)}`;
}

// Tarjetas de promoción/campaña de la Home, al estilo de la referencia
// (Línea Directa): mismo lenguaje visual que PromotionCard (foto a sangre,
// degradado oscuro, CTA en píldora blanca). En móvil son un carril
// deslizable con el dedo (scroll horizontal con snap, con "peek" de la
// siguiente tarjeta); en escritorio, un grid con varias visibles a la vez.
export function CampaignBanner() {
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [homePromotions, setHomePromotions] = useState<Promotion[]>([]);

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
      .map((s) => ({ id: `campana-${s.id}`, imageUrl: s.imageDataUrl, headline: s.headline, href: s.ctaHref, ctaLabel: s.ctaLabel || "Más información" }));
    // El CTA, el título y la foto llevan todos al mismo sitio: la propia
    // página de la promoción (o su enlace propio si ya tiene landing aparte).
    const promociones: BannerSlide[] = homePromotions.map((p) => ({
      id: `promo-${p.id}`, imageUrl: p.imagenUrl, headline: p.tituloTarjeta,
      href: p.linkExterno ? withPromotionUtm(p.linkExterno, p.slug) : `/promociones/${p.slug}`,
      ctaLabel: promotionCtaLabel(p.categoria),
    }));
    return [...campanas, ...promociones];
  }, [config, homePromotions]);

  if (!config || slides.length === 0) return null;

  return (
    <section aria-label="Campaña" className="mt-14 md:mt-24">
      <div className="mx-auto flex max-w-app items-center justify-between gap-4 px-5 md:max-w-5xl lg:max-w-6xl">
        <h2 className="text-[24px] font-extrabold text-navy md:text-[30px]">Nuevas promociones de {BRAND_NAME}</h2>
        <a href="/promociones" className="shrink-0 text-[13px] font-semibold text-navy underline underline-offset-2 transition-colors hover:text-navy-deep">
          Ver todas
        </a>
      </div>

      {/* Con scroll-snap obligatorio, un simple padding-left en el <ul> no
          basta: el navegador "consume" ese hueco como posición de reposo
          del scroll (scrollLeft empieza en 20 en vez de 0), así que la
          primera tarjeta queda pegada al borde. scroll-pl-5 le dice al
          snap que el punto de anclaje ya incluye ese padding, y entonces
          sí se respeta como hueco visible desde el principio. */}
      <ul aria-label="Promociones" className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scroll-pl-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:max-w-5xl md:grid md:grid-cols-3 md:snap-none md:overflow-visible md:px-5 md:pb-0 lg:max-w-6xl">
        {slides.map((s) => (
          <li key={s.id} className="w-[320px] shrink-0 snap-start overflow-hidden rounded-[20px] shadow-soft md:w-auto">
            <a href={s.href} className="group relative block h-[420px] w-full overflow-hidden bg-navy-deep md:h-64">
              {s.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-navy to-navy-deep text-white/70">
                  <IconByName name="shield" width={40} height={40} />
                </div>
              )}
              {/* Degradado reforzado (estilo Línea Directa): ver nota en
                  PromotionCard.tsx. */}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink from-0% via-ink/85 via-45% to-transparent to-95%" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="line-clamp-2 max-w-xs text-[18px] font-extrabold leading-snug text-white">{s.headline}</p>
                <span className="mt-4 inline-flex items-center justify-center rounded-pill bg-white px-5 py-2.5 text-[13px] font-semibold text-ink transition-colors group-hover:bg-white/90">
                  {s.ctaLabel}
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
