"use client";

import { useState } from "react";
import { COBERTURAS } from "@/lib/brand";
import { Check } from "./icons";

const TABS = [
  { key: "sin" as const, ...COBERTURAS.sin },
  { key: "con" as const, ...COBERTURAS.con },
];

export function CoverageTabs() {
  const [active, setActive] = useState<"sin" | "con">("sin");
  const data = active === "sin" ? COBERTURAS.sin : COBERTURAS.con;

  return (
    <div>
      <div role="tablist" aria-label="Tipo de cobertura" className="flex gap-6 border-b border-hair">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={active === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => setActive(t.key)}
            className={`-mb-px border-b-2 pb-3 text-[16px] font-bold transition-colors ${
              active === t.key
                ? "border-brand-red text-brand-red"
                : "border-transparent text-slate2 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="mt-5 rounded-card border border-hair bg-white p-5 shadow-soft"
      >
        <h3 className="text-center text-[17px] font-bold text-brand-red">{data.title}</h3>
        <ul className="mt-4 flex flex-col gap-3">
          {data.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                <Check width={13} height={13} />
              </span>
              <span className="text-[15px] leading-relaxed text-ink">{b}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-[13px] text-slate2">
          El precio depende de tu perfil. Te lo calculamos sin compromiso.
        </p>
        <a
          href="/tarificador"
          className="mt-4 flex w-full items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
        >
          Calcula tu precio del seguro de salud {active === "sin" ? "sin" : "con"} copago
        </a>
      </div>
    </div>
  );
}
