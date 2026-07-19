"use client";

import { useStickyDesktopBar } from "@/lib/useStickyDesktopBar";
import { withUtmParams } from "@/lib/attribution";
import { PRODUCT_PAGES } from "@/lib/productPages";
import { CALLER_NUMBERS } from "@/lib/brand";
import { IconByName, Phone } from "./icons";

function telHref(n: string) {
  return "tel:" + n.replace(/[^\d+]/g, "");
}

// Variante de la barra roja fija de escritorio (ver PromotionStickyDesktopCta)
// para la Home: en vez de un único CTA, muestra los 5 ramos como accesos
// rápidos (estilo Línea Directa), más el teléfono y "Te llamamos gratis".
export function HomeStickyDesktopCta({ targetId }: { targetId: string }) {
  const { visible, barRef } = useStickyDesktopBar(targetId);
  const telefono = CALLER_NUMBERS[0]?.number ?? "";

  function utm(href: string, slug: string): string {
    return withUtmParams(href, { source: "web", medium: "stickybar", campaign: `stickybar-${slug}` });
  }

  return (
    <div
      ref={barRef}
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-30 hidden items-center justify-center rounded-t-[24px] bg-brand-red shadow-[0_-16px_40px_-16px_rgba(18,32,79,0.45)] transition-transform duration-300 ease-out lg:flex ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-8 py-4 xl:px-10">
        <p className="hidden shrink-0 text-[14px] font-semibold text-white xl:block">
          Calcula tu seguro en menos de 2 minutos
        </p>

        <ul className="flex items-center gap-1">
          {PRODUCT_PAGES.map((p) => (
            <li key={p.slug}>
              <a
                href={utm(p.cta.href, p.slug)}
                tabIndex={visible ? 0 : -1}
                className="flex flex-col items-center gap-1.5 rounded-card px-2.5 py-1.5 text-white transition-colors hover:bg-white/10"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-brand-red">
                  <IconByName name={p.heroIcon} width={17} height={17} />
                </span>
                <span className="whitespace-nowrap text-[11px] font-semibold">
                  {p.badge.replace("Seguro de ", "")}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden shrink-0 items-center gap-4 lg:flex">
          {telefono && (
            <a
              href={telHref(telefono)}
              tabIndex={visible ? 0 : -1}
              className="flex items-center gap-1.5 text-[14px] font-semibold text-white"
            >
              <Phone width={16} height={16} />
              {telefono}
            </a>
          )}
          <a
            href={utm("/quiero-que-me-llamen", "home")}
            tabIndex={visible ? 0 : -1}
            className="whitespace-nowrap rounded-pill bg-white px-5 py-2.5 text-[14px] font-semibold text-brand-red transition-colors hover:bg-white/90"
          >
            Te llamamos gratis
          </a>
        </div>
      </div>
    </div>
  );
}
