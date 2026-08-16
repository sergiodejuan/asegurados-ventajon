"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SALUD_CONFIG } from "@/lib/forms";
import { X } from "./icons";

const inicioStep = SALUD_CONFIG.steps[0];
const inicioOptions = inicioStep.type === "choice" ? inicioStep.options : [];
const inicioField = inicioStep.type === "choice" ? inicioStep.field : "inicio";

// Arranca el tarificador de salud desde el hero: recoge los dos datos de
// menor fricción (intención + CP) y continúa en /tarificador ya con el
// paso 1 y 2 resueltos (ver StepForm, que lee estos mismos query params).
export function HeroQuoteCTA({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [inicio, setInicio] = useState<string>();
  const [cp, setCp] = useState("");
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
    if (!inicio || !/^\d{5}$/.test(cp)) return;
    // Preserva utm_* u otros params ya presentes en la landing.
    const params = new URLSearchParams(window.location.search);
    params.set(inicioField, inicio);
    params.set("cp", cp);
    router.push(`/tarificador?${params.toString()}`);
  }

  const valid = !!inicio && /^\d{5}$/.test(cp);

  return (
    <>
      <button type="button" ref={triggerRef} onClick={() => setOpen(true)} className={className}>
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
            aria-labelledby="hero-modal-title"
            className="motion-safe:animate-fade-up w-full max-w-[440px] rounded-t-[24px] bg-white p-6 shadow-card sm:rounded-[24px]"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="hero-modal-title" className="text-[20px] font-extrabold leading-snug text-navy">
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
                <X width={18} height={18} />
              </button>
            </div>

            <fieldset>
              <legend className="mb-2 text-[14px] font-semibold text-ink">¿Cuándo quieres que empiece tu seguro?</legend>
              <div className="flex flex-col gap-2">
                {inicioOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={inicio === o.value}
                    onClick={() => setInicio(o.value)}
                    className={`flex w-full items-center rounded-card border px-4 py-3 text-left text-[15px] font-medium transition-colors ${inicio === o.value ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-5">
              <label htmlFor="hero-cp" className="mb-2 block text-[14px] font-semibold text-ink">¿Cuál es tu código postal?</label>
              <input
                id="hero-cp"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                spellCheck={false}
                placeholder="35001…"
                value={cp}
                onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))}
                className="w-full rounded-card border border-hair bg-white px-5 py-3.5 text-[16px] tracking-wide tnums text-ink placeholder:text-slate2/60"
              />
            </div>

            <button
              type="button"
              disabled={!valid}
              onClick={submit}
              className="mt-6 flex w-full items-center justify-center rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:cursor-not-allowed disabled:bg-slate2/40"
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
