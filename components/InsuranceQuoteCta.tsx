"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChooseInsuranceOverlay } from "./ChooseInsuranceOverlay";

// Botón "Calcula tu precio" para páginas generales (sin un ramo concreto de
// contexto, como la Home): en vez de llevar siempre al tarificador de salud,
// abre el selector de seguros a pantalla completa.
export function InsuranceQuoteCta({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && typeof document !== "undefined" && createPortal(<ChooseInsuranceOverlay onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
