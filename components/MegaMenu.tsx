"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PRODUCT_PAGES, type ProductSlug } from "@/lib/productPages";
import { withUtmParams } from "@/lib/attribution";

// Mega menú de "Seguros" del header (solo escritorio — en móvil ya existe
// el listado completo dentro de MobileNavMenu). Al pasar el ratón por
// "Seguros" se abre un panel de dos columnas: la lista de ramos a la
// izquierda, y a la derecha los accesos directos del ramo sobre el que
// esté el ratón (tarificador/"te llamamos" y sus preguntas frecuentes),
// todos con UTM propio del mega menú para poder medir su aportación aparte
// del resto de la navegación.
//
// El panel se renderiza en un portal a document.body: el <header> lleva
// "lg:overflow-hidden" para recortar sus propias esquinas redondeadas
// (efecto "isla" flotante), y eso recortaba también el panel si vivía dentro
// del header como cualquier otro hijo posicionado en absoluto. Al vivir
// fuera del DOM del header, ya no lo afecta ese overflow.
const CLOSE_DELAY_MS = 150;

export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [activeSlug, setActiveSlug] = useState<ProductSlug>(PRODUCT_PAGES[0].slug);
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = PRODUCT_PAGES.find((p) => p.slug === activeSlug) ?? PRODUCT_PAGES[0];

  function utm(href: string): string {
    return withUtmParams(href, { source: "web", medium: "megamenu", campaign: `megamenu-${active.slug}` });
  }

  function cancelClose() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }

  // Al vivir en un portal, el panel ya no es descendiente del div disparador
  // en el DOM: mover el ratón del botón "Seguros" hacia abajo, al panel,
  // dispararía "mouseleave" del disparador antes de llegar al panel. Un
  // pequeño margen (cancelable si el ratón entra a tiempo en cualquiera de
  // los dos) evita que se cierre solo al cruzar ese hueco.
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  function openMenu() {
    cancelClose();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 12, left: rect.left + rect.width / 2 });
    setOpen(true);
  }

  return (
    <div ref={triggerRef} className="relative hidden lg:block" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        className="text-[14px] font-semibold text-slate2 transition-colors hover:text-navy"
      >
        Seguros
      </button>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          role="menu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
          className="z-50 w-[640px] overflow-hidden rounded-[20px] border border-hair bg-white shadow-card"
        >
          <div className="flex">
            <ul className="w-56 shrink-0 border-r border-hair p-2">
              {PRODUCT_PAGES.map((p) => (
                <li key={p.slug}>
                  <a
                    href={p.path}
                    onMouseEnter={() => setActiveSlug(p.slug)}
                    className={`block rounded-card px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                      activeSlug === p.slug ? "bg-mist text-navy" : "text-ink hover:bg-mist"
                    }`}
                  >
                    {p.badge}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex-1 p-5">
              <p className="text-[16px] font-extrabold text-navy">{active.badge}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate2">{active.subheadline}</p>

              <div className="mt-4 flex flex-col gap-2">
                <a
                  href={utm(active.cta.href)}
                  className="flex items-center justify-center rounded-pill bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
                >
                  {active.cta.label}
                </a>
                <a
                  href={utm(active.ctaSecondary.href)}
                  className="flex items-center justify-center rounded-pill border border-hair px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:bg-mist"
                >
                  {active.ctaSecondary.label}
                </a>
              </div>

              <a
                href={utm(`/preguntas-frecuentes?cat=${active.slug}`)}
                className="mt-4 block text-[13px] font-semibold text-navy underline underline-offset-2"
              >
                Preguntas frecuentes sobre {active.badge.toLowerCase()}
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
