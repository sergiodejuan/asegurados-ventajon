import { BRAND_NAME } from "@/lib/brand";

// Cabecera mínima para páginas "sin salida" del funnel (comparativa, ficha de
// compañía, "quiero que me llamen"): solo la marca, sin navegación ni enlaces
// que permitan abandonar el flujo antes de completar la conversión.
export function MinimalTopBar() {
  return (
    <p className="mb-6 text-center font-display text-[16px] font-extrabold text-navy md:mb-10" translate="no">
      {BRAND_NAME}
    </p>
  );
}
