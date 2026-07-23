"use client";

import { useState } from "react";
import { NavDrawer, type NavDrawerLink } from "./NavDrawer";

const SERVICE_LINKS: NavDrawerLink[] = [
  { href: "/promociones", label: "Promociones" },
  { href: "/testimonios", label: "Testimonios" },
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/actualidad", label: "Actualidad" },
  { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
  { href: "/area-cliente", label: "Mi área de cliente" },
];

// Desplegable "Servicios" del header, solo escritorio: el segundo (y
// último) elemento visible del menú de escritorio, junto a "Nuestros
// seguros" (ver MegaMenu.tsx) — agrupa aquí todo lo que antes eran enlaces
// sueltos en la barra (promociones, testimonios, quiénes somos, actualidad…),
// mismo patrón que la referencia de Línea Directa.
export function ServicesMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="hidden lg:block">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="text-[14px] font-semibold text-slate2 transition-colors hover:text-navy"
      >
        Servicios
      </button>
      <NavDrawer open={open} onClose={() => setOpen(false)} links={SERVICE_LINKS} ariaLabel="Servicios" />
    </div>
  );
}
