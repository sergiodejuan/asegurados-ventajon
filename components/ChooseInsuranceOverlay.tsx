"use client";

import { useEffect } from "react";
import { PRODUCT_PAGES, quoteHref } from "@/lib/productPages";
import { IconByName, Close } from "./icons";

// Ventana transitoria a pantalla completa (fondo blanco) que sustituye al
// antiguo "Calcula tu precio" que siempre llevaba directo al tarificador de
// salud sin importar la página: aquí el usuario elige primero el ramo, y
// cada tarjeta lleva de verdad a su calculadora (o a su propia página si el
// ramo no tiene calculadora, como decesos/hogar).
export function ChooseInsuranceOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Elige tu seguro"
      className="fixed inset-0 z-[90] flex flex-col bg-white motion-safe:animate-fade-up"
    >
      <div className="safe-top flex shrink-0 items-center justify-between border-b border-hair px-5 py-4">
        <p className="text-[15px] font-bold text-navy">¿Qué seguro quieres calcular?</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid h-9 w-9 place-items-center rounded-full text-navy transition-colors hover:bg-mist"
        >
          <Close width={18} height={18} />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-10">
        <div className="grid w-full max-w-lg grid-cols-2 gap-4 sm:grid-cols-3">
          {PRODUCT_PAGES.map((p, i) => (
            <a
              key={p.slug}
              href={quoteHref(p)}
              style={{ animationDelay: `${i * 40}ms` }}
              className="flex flex-col items-center gap-3 rounded-[20px] border border-hair bg-white p-5 text-center shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-card motion-safe:animate-fade-up"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                <IconByName name={p.heroIcon} width={26} height={26} />
              </span>
              <span className="text-[14px] font-bold text-ink">{p.badge}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
