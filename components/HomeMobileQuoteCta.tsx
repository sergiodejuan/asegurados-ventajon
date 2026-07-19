"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { StickyMobileCta } from "./StickyMobileCta";
import { ChooseInsuranceOverlay } from "./ChooseInsuranceOverlay";

// Versión de StickyMobileCta para la Home: el CTA principal abre el
// selector de seguros (no hay un ramo de contexto), igual que el resto de
// "Calcula tu precio" generales de esta página.
export function HomeMobileQuoteCta() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <StickyMobileCta label="Calcula tu precio" onClick={() => setOpen(true)} secondaryLabel="Que te llamen" secondaryHref="/quiero-que-me-llamen" />
      {open && typeof document !== "undefined" && createPortal(<ChooseInsuranceOverlay onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
