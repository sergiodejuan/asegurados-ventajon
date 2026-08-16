"use client";

import { useState, type CSSProperties } from "react";
import { Close } from "@/components/icons";
import { HeroModalTrigger } from "./HeroModalTrigger";
import { PaidLlamadaForm, type PaidLlamadaSuccess } from "./PaidLlamadaForm";
import { PaidLlamadaGracias } from "./PaidLlamadaGracias";

// Versión modal de "Te llamamos gratis" para cualquier CTA "llamar" de
// /lp/salud: en vez de navegar a /lp/salud/llamada, abre el mismo
// formulario (PaidLlamadaForm, con su propia validación y envío) en un
// modal sobre la página actual. Al enviar con éxito, en vez de navegar a
// /gracias (como en el resto de la web), el mismo modal cambia a un
// "¡Gracias!" propio de esta landing con la preferencia de día/hora que
// el usuario eligió — así nunca lo sacamos de /lp/salud.
export function PaidLlamadaModal({
  className, style, ariaLabel, children, onOpen, phone,
}: {
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  children: React.ReactNode;
  onOpen?: () => void;
  phone: string;
}) {
  const [result, setResult] = useState<PaidLlamadaSuccess | null>(null);

  return (
    <HeroModalTrigger
      className={className}
      style={style}
      ariaLabel={ariaLabel}
      onOpen={onOpen}
      titleId="lp-salud-llamada-modal-title"
      renderModal={(close) => {
        function closeAndReset() {
          setResult(null);
          close();
        }
        return (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="lp-salud-llamada-modal-title" className="text-[20px] font-extrabold leading-snug text-navy">
                  {result ? "¡Gracias!" : "Te llamamos gratis"}
                </h2>
                {!result && (
                  <p className="mt-1 text-[14px] leading-relaxed text-slate2">
                    Déjanos tus datos y un asesor te llama sin coste ni compromiso.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeAndReset}
                aria-label="Cerrar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-navy transition-colors hover:bg-mist"
              >
                <Close width={18} height={18} />
              </button>
            </div>
            {result ? (
              <PaidLlamadaGracias telefono={result.telefono} dia={result.dia} turno={result.turno} phone={phone} onClose={closeAndReset} />
            ) : (
              <PaidLlamadaForm onSuccess={setResult} />
            )}
          </>
        );
      }}
    >
      {children}
    </HeroModalTrigger>
  );
}
