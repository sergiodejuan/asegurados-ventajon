"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Close } from "@/components/icons";
import { HeroModalTrigger } from "./HeroModalTrigger";

const INICIO_OPTIONS = [
  { value: "cuanto_antes", label: "Cuanto antes" },
  { value: "proximo_mes", label: "Próximo mes" },
  { value: "comparando", label: "Solo comparando" },
] as const;

// Arranca el tarificador embebido de una landing de salud (/lp/[slug]/
// tarificador) desde cualquier CTA "calcular". El wizard real
// (PaidTarificadorSalud) tiene su primer paso ("asegurados") como pregunta
// aislada sin PII, así que es el candidato natural para resolverse aquí;
// "inicio" viaja junto porque es igual de ligero, aunque en el wizard
// completo comparte pantalla con fecha de nacimiento/sexo/fumador (por eso
// solo se precarga, no salta ese paso entero). Solo se usa para landings de
// producto "salud" — el resto de ramas enlazan directo al tarificador de
// página completa correspondiente (ver CalcularCta en PaidLanding.tsx).
export function PaidHeroQuoteModal({
  className, style, ariaLabel, children, onOpen, tarificadorHref,
}: {
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  children: React.ReactNode;
  onOpen?: () => void;
  tarificadorHref: string;
}) {
  const [asegurados, setAsegurados] = useState<number>();
  const [inicio, setInicio] = useState<string>();
  const router = useRouter();
  const valid = !!asegurados && !!inicio;

  function submit() {
    if (!asegurados || !inicio) return;
    router.push(`${tarificadorHref}?asegurados=${asegurados}&inicio=${inicio}`);
  }

  return (
    <HeroModalTrigger
      className={className}
      style={style}
      ariaLabel={ariaLabel}
      onOpen={onOpen}
      titleId="paid-hero-modal-title"
      renderModal={(close) => (
        <>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="paid-hero-modal-title" className="text-[20px] font-extrabold leading-snug text-navy">
                Calcula tu precio en 1 minuto
              </h2>
              <p className="mt-1 text-[14px] leading-relaxed text-slate2">
                Dos datos para arrancar tu comparativa. Sin compromiso.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-navy transition-colors hover:bg-mist"
            >
              <Close width={18} height={18} />
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 text-[14px] font-semibold text-ink">¿A cuántas personas quieres asegurar?</legend>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={asegurados === n}
                  onClick={() => setAsegurados(n)}
                  className={`aspect-square rounded-[12px] border text-[16px] font-bold tnums transition-colors ${asegurados === n ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-2 text-[14px] font-semibold text-ink">¿Cuándo quieres empezar?</legend>
            <div className="flex flex-col gap-2">
              {INICIO_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={inicio === o.value}
                  onClick={() => setInicio(o.value)}
                  className={`flex w-full items-center rounded-[12px] border px-4 py-3 text-left text-[15px] font-medium transition-colors ${inicio === o.value ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            disabled={!valid}
            onClick={submit}
            className="mt-6 flex w-full items-center justify-center rounded-pill bg-brand-red px-5 py-4 text-[16px] font-bold text-white transition-colors hover:bg-brand-red-deep disabled:cursor-not-allowed disabled:bg-slate2/40"
          >
            Continuar
          </button>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-slate2">Sin trucos, sin letra pequeña.</p>
        </>
      )}
    >
      {children}
    </HeroModalTrigger>
  );
}
