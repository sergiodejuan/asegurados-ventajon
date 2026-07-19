"use client";

import { useState } from "react";
import type { FaqItem } from "./FaqAccordion";
import { ChevronDown } from "./icons";

export type FaqCategory = { id: string; label: string; items: FaqItem[] };

// Preguntas frecuentes agrupadas por categoría con pestañas, al estilo de
// la referencia (Línea Directa): mismo lenguaje visual de pestaña con
// subrayado rojo que CoverageTabs, y el mismo acordeón nativo (<details>)
// que FaqAccordion, pero filtrando qué preguntas se muestran según la
// pestaña activa. El listado completo de todas las categorías igualmente
// vive en el JSON-LD de la página (no depende de qué pestaña esté abierta).
export function FaqCategoryTabs({ categories }: { categories: FaqCategory[] }) {
  const [active, setActive] = useState(categories[0]?.id ?? "");
  const current = categories.find((c) => c.id === active) ?? categories[0];
  if (!current) return null;

  return (
    <div>
      {/* En móvil, un carril deslizable con el dedo (como el resto de tabs
          del sitio); en escritorio, sin scroll horizontal oculto (poco
          intuitivo con ratón) — las pestañas simplemente saltan de línea. */}
      <div
        role="tablist"
        aria-label="Categorías de preguntas frecuentes"
        className="flex gap-6 overflow-x-auto px-5 pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:gap-x-8 md:gap-y-2 md:overflow-x-visible"
      >
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            id={`faq-tab-${c.id}`}
            aria-selected={active === c.id}
            aria-controls={`faq-panel-${c.id}`}
            onClick={() => setActive(c.id)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3 text-[14px] font-bold transition-colors ${
              active === c.id ? "border-brand-red text-brand-red" : "border-transparent text-slate2 hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="border-b border-hair" />

      <div role="tabpanel" id={`faq-panel-${current.id}`} aria-labelledby={`faq-tab-${current.id}`} className="mt-5 flex flex-col gap-2 px-5">
        {current.items.map((f) => (
          <details key={f.q} className="group rounded-card border border-hair bg-white px-5 py-4 open:shadow-soft">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-ink marker:content-none">
              {f.q}
              <span aria-hidden="true" className="shrink-0 text-navy transition-transform group-open:rotate-180">
                <ChevronDown width={18} height={18} />
              </span>
            </summary>
            <p className="mt-3 text-[14px] leading-relaxed text-slate2">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
