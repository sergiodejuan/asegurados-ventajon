"use client";

import { useState } from "react";
import { PROMO } from "@/lib/brand";
import { IconByName } from "./icons";
import { Modal } from "./Modal";

// Banner de reclamo tipo referencia (recuadro mint + claim + "ver condiciones").
// ⚠️ Sin % ni precios: el texto se edita en lib/brand.ts (PROMO) tras validación de Gabriel.
export function PromoBanner() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-mint px-5 py-4 pr-24">
      <span className="inline-flex items-center rounded-pill bg-white/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-mint-deep">
        {PROMO.badge}
      </span>
      <p className="mt-2 text-[18px] font-extrabold leading-tight text-navy-deep">{PROMO.headline}</p>
      <p className="mt-1 text-[13px] leading-snug text-navy-deep/80">{PROMO.sub}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 inline-block text-[12px] font-semibold text-mint-deep underline"
      >
        Ver condiciones
      </button>
      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-mint-deep/70">
        <IconByName name="shield" width={56} height={56} />
      </span>

      <Modal open={open} onClose={() => setOpen(false)} title="Condiciones de la comparativa">
        <ul className="flex flex-col gap-3">
          {PROMO.conditions.map((c) => (
            <li key={c} className="flex items-start gap-2.5">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint-deep" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <a href="/legal" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block font-semibold text-navy underline">
          Ver información legal completa
        </a>
      </Modal>
    </div>
  );
}
