"use client";

import { useStickyDesktopBar } from "@/lib/useStickyDesktopBar";
import { ChevronRight } from "./icons";

// Barra de CTA fija, solo en escritorio (en móvil ya existe StickyMobileCta):
// aparece al perder de vista la tarjeta flotante del hero (donde están los
// CTA "de verdad"), para que la promoción/ramo siga siendo accionable el
// resto del scroll de la página. Estilo Línea Directa: fondo rojo de marca
// con las esquinas superiores redondeadas, anclada al fondo del viewport.
// También la reutilizan las páginas de producto (ver ProductLandingPage.tsx).
export function PromotionStickyDesktopCta({
  targetId, text, ctaLabel, ctaHref, secondaryLabel, secondaryHref,
}: {
  targetId: string; text: string; ctaLabel: string; ctaHref: string; secondaryLabel: string; secondaryHref: string;
}) {
  const { visible, barRef } = useStickyDesktopBar(targetId);

  return (
    <div
      ref={barRef}
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-30 hidden items-center justify-center rounded-t-[24px] bg-brand-red shadow-[0_-16px_40px_-16px_rgba(18,32,79,0.45)] transition-transform duration-300 ease-out lg:flex ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-8 px-10 py-5">
        <p className="min-w-0 truncate text-[16px] font-semibold text-white">{text}</p>
        <div className="flex shrink-0 items-center gap-3">
          <a
            href={secondaryHref}
            tabIndex={visible ? 0 : -1}
            className="rounded-pill border border-white/70 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            {secondaryLabel}
          </a>
          <a
            href={ctaHref}
            tabIndex={visible ? 0 : -1}
            className="flex items-center gap-1 rounded-pill bg-white px-5 py-2.5 text-[14px] font-semibold text-brand-red transition-colors hover:bg-white/90"
          >
            {ctaLabel}
            <ChevronRight width={14} height={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
