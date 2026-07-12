"use client";

import { useEffect, useState } from "react";
import { NextSteps } from "./NextSteps";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { Check } from "./icons";
import { BRAND_NAME } from "@/lib/brand";
import { loadCallResult, type CallResult } from "@/lib/quote";

export function GraciasContent() {
  const [result, setResult] = useState<CallResult | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setResult(loadCallResult());
    setChecked(true);
  }, []);

  const firstName = result?.nombre?.trim().split(/\s+/)[0];
  const hasDia = !!result?.diaLlamada && result.diaLlamada !== "Cualquier día";
  const hasTurno = !!result?.turnoLlamada && result.turnoLlamada !== "Cualquier turno";

  return (
    <>
      <div className="grid h-16 w-16 place-items-center rounded-full bg-navy text-white">
        <Check width={30} height={30} />
      </div>
      <h1 className="mt-6 text-[28px] font-extrabold leading-tight text-navy">
        {checked && firstName ? `¡Hecho, ${firstName}! Te llamamos enseguida.` : "Hecho. Te llamamos enseguida."}
      </h1>
      <p className="mt-3 text-[16px] leading-relaxed text-slate2">
        Un asesor de {BRAND_NAME} preparará tu comparativa y te contactará para
        darte tu propuesta personalizada, comparando entre las mejores
        compañías. Sin compromiso.
      </p>

      {checked && (hasDia || hasTurno ? (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-ink">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          Te llamamos{hasDia ? ` el ${result!.diaLlamada}` : ""}{hasTurno ? ` en el turno de ${result!.turnoLlamada!.toLowerCase()}` : ""}.
        </p>
      ) : (
        <div className="mt-4"><AvailabilityBadge /></div>
      ))}

      <NextSteps />

      <a
        href="/area-cliente"
        className="mt-4 flex w-full items-center justify-center rounded-card border border-navy px-5 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
      >
        Gestionar mis presupuestos y mis datos
      </a>
    </>
  );
}
