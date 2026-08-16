"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Close } from "@/components/icons";

const INICIO_OPTIONS = [
  { value: "cuanto_antes", label: "Cuanto antes" },
  { value: "proximo_mes", label: "Próximo mes" },
  { value: "comparando", label: "Solo comparando" },
] as const;

// Arranca el tarificador de /lp/salud desde el hero de la landing paid.
// El wizard real (PaidTarificadorSalud) tiene su primer paso ("asegurados")
// como pregunta aislada sin PII, así que es el candidato natural para
// resolverse aquí; "inicio" viaja junto porque es igual de ligero, aunque
// en el wizard completo comparte pantalla con fecha de nacimiento/sexo/
// fumador (por eso solo se precarga, no salta ese paso entero).
export function PaidHeroQuoteModal({ className, children, onOpen }: { className?: string; children: React.ReactNode; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const [asegurados, setAsegurados] = useState<number>();
  const [inicio, setInicio] = useState<string>();
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function submit() {
    if (!asegurados || !inicio) return;
    router.push(`/lp/salud/tarificador?asegurados=${asegurados}&inicio=${inicio}`);
  }

  const valid = !!asegurados && !!inicio;

  return (
    <>
      <button type="button" ref={triggerRef} onClick={() => { onOpen?.(); setOpen(true); }} className={className}>
        {children}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lp-salud-hero-modal-title"
            className="w-full max-w-[440px] rounded-t-[20px] bg-white p-6 shadow-card sm:rounded-[20px] md:rounded-[24px]"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="lp-salud-hero-modal-title" className="text-[20px] font-extrabold leading-snug text-navy">
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
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
