"use client";

import type { CSSProperties } from "react";
import { Close } from "@/components/icons";
import { HeroModalTrigger } from "./HeroModalTrigger";
import { PaidLlamadaForm } from "./PaidLlamadaForm";

// Versión modal de "Te llamamos gratis" para cualquier CTA "llamar" de
// /lp/salud: en vez de navegar a /lp/salud/llamada, abre el mismo
// formulario (PaidLlamadaForm, con su propia validación y envío) en un
// modal sobre la página actual. Al enviar con éxito, el formulario navega
// a /gracias igual que en la página independiente.
export function PaidLlamadaModal({
  className, style, ariaLabel, children, onOpen,
}: {
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  children: React.ReactNode;
  onOpen?: () => void;
}) {
  return (
    <HeroModalTrigger
      className={className}
      style={style}
      ariaLabel={ariaLabel}
      onOpen={onOpen}
      titleId="lp-salud-llamada-modal-title"
      renderModal={(close) => (
        <>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="lp-salud-llamada-modal-title" className="text-[20px] font-extrabold leading-snug text-navy">
                Te llamamos gratis
              </h2>
              <p className="mt-1 text-[14px] leading-relaxed text-slate2">
                Déjanos tus datos y un asesor te llama sin coste ni compromiso.
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
          <PaidLlamadaForm />
        </>
      )}
    >
      {children}
    </HeroModalTrigger>
  );
}
