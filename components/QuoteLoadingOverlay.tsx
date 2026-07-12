"use client";

import { useEffect, useState } from "react";
import { PARTNERS, ECOSYSTEM_MEMBERS } from "@/lib/brand";
import { Spinner } from "./icons";

const FACTS = [
  `Comparamos entre ${PARTNERS.length} aseguradoras líderes: ${PARTNERS.join(", ")}.`,
  `Formamos parte del ecosistema Ventajon, con ${ECOSYSTEM_MEMBERS}.`,
  "Comparar con nosotros no tiene ningún coste ni compromiso.",
  "Somos correduría de seguros: estamos de tu lado, no del de la compañía.",
];

const FACT_INTERVAL_MS = 1100;
const MIN_DURATION_MS = 3200;

export function QuoteLoadingOverlay({ name, onDone }: { name?: string; onDone: () => void }) {
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const factTimer = setInterval(() => setFactIndex((i) => (i + 1) % FACTS.length), FACT_INTERVAL_MS);
    const doneTimer = setTimeout(onDone, MIN_DURATION_MS);
    return () => { clearInterval(factTimer); clearTimeout(doneTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-br from-navy to-navy-deep px-6 text-center text-white"
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15 motion-safe:animate-pulse">
        <Spinner width={32} height={32} />
      </div>
      <h2 className="mt-6 max-w-sm text-[22px] font-extrabold leading-snug md:text-[26px]">
        Estamos buscando las mejores opciones para ti{name ? `, ${name}` : ""}
      </h2>

      <div className="mt-8 w-full max-w-sm">
        <p className="text-[12px] font-bold uppercase tracking-wide text-white/60">¿Sabías que…?</p>
        <p key={factIndex} className="mt-2 min-h-[4.5em] text-[15px] leading-relaxed text-white/90 motion-safe:animate-fade-up">
          {FACTS[factIndex]}
        </p>
      </div>

      <div className="mt-6 flex gap-1.5" aria-hidden="true">
        {FACTS.map((_, i) => (
          <span key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i === factIndex ? "bg-white" : "bg-white/30"}`} />
        ))}
      </div>
    </div>
  );
}
