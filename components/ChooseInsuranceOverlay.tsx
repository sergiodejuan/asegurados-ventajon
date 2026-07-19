"use client";

import { useEffect } from "react";
import { PRODUCT_PAGES, quoteHref } from "@/lib/productPages";
import { WHATSAPP_URL_GENERIC, TRUST_STATS } from "@/lib/brand";
import { withUtmParams } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { IconByName, Close, WhatsApp } from "./icons";
import { SocialProofBadge } from "./SocialProofBadge";

// UTM propio del selector, para medir su aportación aparte del resto de
// placements (mega menú, barras sticky, asistente…).
function selectorUtm(href: string, action: string): string {
  return withUtmParams(href, { source: "web", medium: "selector-seguros", campaign: `selector-seguros-${action}` });
}

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
      className="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-white motion-safe:animate-fade-up"
    >
      <div className="safe-top flex shrink-0 justify-end px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid h-9 w-9 place-items-center rounded-full text-navy transition-colors hover:bg-mist"
        >
          <Close width={18} height={18} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 pb-14 pt-2 text-center md:pt-4">
        <h2 className="text-[22px] font-extrabold leading-tight text-navy md:text-[28px]">¿Qué seguro quieres calcular?</h2>

        <div className="mt-7 grid w-full max-w-lg grid-cols-2 gap-4 sm:grid-cols-3">
          {PRODUCT_PAGES.map((p, i) => (
            <a
              key={p.slug}
              href={quoteHref(p)}
              style={{ animationDelay: `${i * 40}ms` }}
              className="group flex flex-col items-center gap-3 rounded-[20px] border border-hair bg-white p-5 text-center shadow-soft transition-colors hover:border-brand-red hover:bg-brand-red motion-safe:animate-fade-up"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-red/10 text-brand-red transition-colors group-hover:bg-white/15 group-hover:text-white">
                <IconByName name={p.heroIcon} width={26} height={26} />
              </span>
              <span className="text-[14px] font-bold text-ink transition-colors group-hover:text-white">{p.badge}</span>
            </a>
          ))}
        </div>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <a
            href={selectorUtm("/quiero-que-me-llamen", "llamada")}
            className="flex items-center justify-center rounded-card border border-hair bg-white px-5 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-mist"
          >
            Que me llamen gratis
          </a>
          <a
            href={WHATSAPP_URL_GENERIC}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => pushDataLayerEvent("whatsapp_click", { placement: "selector_seguros" })}
            className="flex items-center justify-center gap-2 rounded-card bg-emerald-600 px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <WhatsApp className="text-white" />
            Escríbenos por WhatsApp
          </a>
        </div>

        <div className="mt-10 w-full border-t border-hair pt-8">
          <SocialProofBadge />
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-[20px] border border-hair bg-mist p-5 sm:grid-cols-4">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-[22px] font-extrabold tnums text-navy">{s.value}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
