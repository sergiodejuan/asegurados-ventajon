"use client";

import { useState } from "react";
import { PRODUCT_PAGES } from "@/lib/productPages";
import { NavDrawer } from "./NavDrawer";

// Desplegable "Nuestros seguros" del header, solo escritorio (en móvil ya
// existe el listado completo dentro de MobileNavMenu). Uno de los dos únicos
// elementos visibles en el menú de escritorio, junto a "Servicios" (ver
// ServicesMenu.tsx) — mismo patrón que la referencia de Línea Directa.
export function MegaMenu() {
  const [open, setOpen] = useState(false);

  const links = PRODUCT_PAGES.map((p) => ({ href: p.path, label: p.badge }));

  return (
    <div className="hidden lg:block">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="text-[14px] font-semibold text-slate2 transition-colors hover:text-navy"
      >
        Nuestros seguros
      </button>
      <NavDrawer open={open} onClose={() => setOpen(false)} links={links} ariaLabel="Nuestros seguros" />
    </div>
  );
}
