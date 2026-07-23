"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PRODUCT_PAGES } from "@/lib/productPages";
import { WHATSAPP_URL_GENERIC } from "@/lib/brand";
import { withUtmParams } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { useSiteTheme } from "@/lib/useTheme";
import { Wordmark } from "./Header";
import { Close, ArrowRight, WhatsApp } from "./icons";

// Menú de "Seguros" del header, solo escritorio (en móvil ya existe el
// listado completo dentro de MobileNavMenu). Al hacer clic se despliega un
// panel lateral a pantalla completa que entra desde la izquierda — mismo
// patrón de interacción que el menú de referencia de Línea Directa, y el
// mismo que ya usa MobileNavMenu en móvil (createPortal + animate-slide-in-left).
// Antes era un mega menú de dos columnas que se abría al pasar el ratón;
// ahora es un único listado vertical de ramos + accesos rápidos.
function utm(href: string): string {
  return withUtmParams(href, { source: "web", medium: "megamenu", campaign: "megamenu-seguros" });
}

export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const theme = useSiteTheme();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="hidden lg:block">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="text-[14px] font-semibold text-slate2 transition-colors hover:text-navy"
      >
        Seguros
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Menú de seguros" className="fixed inset-0 z-50 hidden lg:block">
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 motion-safe:animate-fade-up"
          />
          <div className="relative flex h-full w-[400px] flex-col overflow-y-auto bg-white shadow-card motion-safe:animate-slide-in-left">
            <div className="flex items-center justify-between border-b border-hair px-6 py-5">
              <Wordmark logoUrl={theme.logoUrl} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="grid h-10 w-10 place-items-center rounded-full bg-mist text-navy transition-colors hover:bg-hair"
              >
                <Close width={18} height={18} />
              </button>
            </div>

            <nav aria-label="Seguros" className="flex flex-col px-6 py-2">
              {PRODUCT_PAGES.map((p) => (
                <a
                  key={p.slug}
                  href={p.path}
                  className="flex items-center justify-between border-b border-hair py-4 text-[17px] font-bold text-ink transition-colors hover:text-brand-red"
                >
                  {p.badge}
                  <ArrowRight width={18} height={18} className="text-slate2" />
                </a>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-hair px-6 py-6">
              <a
                href={utm("/tarificador")}
                className="flex items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
              >
                Calcula tu precio
              </a>
              <a
                href={utm("/quiero-que-me-llamen")}
                className="flex items-center justify-center rounded-card border border-hair px-5 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-mist"
              >
                Te llamamos gratis
              </a>
              <a
                href={WHATSAPP_URL_GENERIC}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => pushDataLayerEvent("whatsapp_click", { placement: "megamenu" })}
                className="flex items-center justify-center gap-2 rounded-card bg-mist px-5 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-hair"
              >
                <WhatsApp className="text-[#25D366]" />
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
