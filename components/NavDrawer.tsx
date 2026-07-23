"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useSiteTheme } from "@/lib/useTheme";
import { Wordmark } from "./Header";
import { Close, ArrowRight } from "./icons";

export type NavDrawerLink = { href: string; label: string; badge?: string };

// Panel lateral compartido por los dos desplegables del header de
// escritorio ("Nuestros seguros" y "Servicios"), fiel a la referencia de
// Línea Directa: entra desde la izquierda a pantalla completa, con overlay
// oscuro, cabecera con logo + cerrar, y solo enlaces (sin CTA) con
// tipografía grande para que sea cómodo de leer. Mismo ancho para ambos, así
// abrir uno u otro no "salta" de tamaño.
export function NavDrawer({
  open, onClose, links, ariaLabel,
}: { open: boolean; onClose: () => void; links: NavDrawerLink[]; ariaLabel: string }) {
  const theme = useSiteTheme();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={ariaLabel} className="fixed inset-0 z-50 hidden lg:block">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-ink/45 motion-safe:animate-fade-up" />
      <div className="relative flex h-full w-[34vw] min-w-[380px] max-w-[560px] flex-col overflow-y-auto bg-white shadow-card motion-safe:animate-slide-in-left">
        <div className="flex items-center justify-between border-b border-hair px-6 py-5">
          <Wordmark logoUrl={theme.logoUrl} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="grid h-10 w-10 place-items-center rounded-full bg-mist text-navy transition-colors hover:bg-hair"
          >
            <Close width={18} height={18} />
          </button>
        </div>

        <nav aria-label={ariaLabel} className="flex flex-col px-6 py-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="flex items-center justify-between border-b border-hair py-4 text-[20px] font-bold text-ink transition-colors hover:text-brand-red"
            >
              <span className="flex items-center gap-2.5">
                {l.label}
                {l.badge && (
                  <span className="rounded-pill bg-brand-red/10 px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide text-brand-red">
                    {l.badge}
                  </span>
                )}
              </span>
              <ArrowRight width={18} height={18} className="shrink-0 text-slate2" />
            </a>
          ))}
        </nav>
      </div>
    </div>,
    document.body,
  );
}
