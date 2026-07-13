"use client";

import { BRAND_NAME } from "@/lib/brand";
import { useSiteTheme } from "@/lib/useTheme";

// Cabecera mínima para páginas "sin salida" del funnel (comparativa, ficha de
// compañía, "quiero que me llamen"): solo la marca, sin navegación ni enlaces
// que permitan abandonar el flujo antes de completar la conversión.
export function MinimalTopBar() {
  const theme = useSiteTheme();
  const logoUrl = theme.minimalLogoUrl || theme.logoUrl;

  if (logoUrl) {
    return (
      <div className="mb-6 flex justify-center md:mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={BRAND_NAME} className="h-8 w-auto max-w-[160px] object-contain" />
      </div>
    );
  }

  return (
    <p className="mb-6 text-center font-display text-[16px] font-extrabold text-navy md:mb-10" translate="no">
      {BRAND_NAME}
    </p>
  );
}
