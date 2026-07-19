"use client";

import { useState } from "react";
import { Check, ChevronRight } from "./icons";
import { withUtmParams } from "@/lib/attribution";

// Comparador terceros/terceros ampliado vs. todo riesgo, solo en la página
// de seguro de auto: a diferencia del resto de ramos, aquí el visitante
// necesita decidir entre modalidades antes de calcular precio, así que este
// bloque vive justo después de la cobertura general (ya sabe qué cubre un
// seguro de auto) y antes de la confianza/compañías (que ya no depende de
// la modalidad elegida).
type Modalidad = "terceros" | "terceros-ampliado" | "todo-riesgo";

const TERCEROS_BASE = [
  "Responsabilidad civil obligatoria",
  "Responsabilidad civil voluntaria",
  "Defensa jurídica",
  "Asistencia en viaje básica",
];

const TERCEROS_AMPLIADO_EXTRA = ["Rotura de lunas", "Robo", "Incendio"];

const TODO_RIESGO = [
  "Todo lo de terceros ampliado",
  "Daños propios, con o sin franquicia",
  "Coche de sustitución en talleres concertados",
  "Asistencia en carretera 24 horas",
];

function comparadorUtm(href: string, modalidad: Modalidad): string {
  return withUtmParams(href, { source: "web", medium: "comparador-auto", campaign: `comparador-auto-${modalidad}` });
}

function CtaButtons({ modalidad }: { modalidad: Modalidad }) {
  return (
    <div className="mt-6 flex flex-col gap-2.5">
      <a
        href={comparadorUtm("/tarificador-auto", modalidad)}
        className="flex items-center justify-center gap-1.5 rounded-card bg-brand-red px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
      >
        Calcula tu precio
        <ChevronRight width={14} height={14} />
      </a>
      <a
        href={comparadorUtm("/quiero-que-me-llamen?producto=auto", modalidad)}
        className="flex items-center justify-center rounded-card border border-hair px-5 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-mist"
      >
        Que te llamen gratis
      </a>
    </div>
  );
}

export function AutoCoverageComparator() {
  const [terceros, setTerceros] = useState<Extract<Modalidad, "terceros" | "terceros-ampliado">>("terceros");
  const coberturasTerceros = terceros === "terceros" ? TERCEROS_BASE : [...TERCEROS_BASE, ...TERCEROS_AMPLIADO_EXTRA];

  return (
    <section aria-labelledby="comparador-auto" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
      <h2 id="comparador-auto" className="text-[22px] font-extrabold text-navy md:text-[28px]">Terceros o todo riesgo: elige tu cobertura</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
        Compara qué incluye cada modalidad antes de calcular tu precio.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="flex flex-col rounded-[24px] border border-hair bg-white p-6 shadow-soft">
          <div role="tablist" aria-label="Modalidad de terceros" className="inline-flex w-fit rounded-pill bg-mist p-1">
            <button
              type="button"
              role="tab"
              aria-selected={terceros === "terceros"}
              onClick={() => setTerceros("terceros")}
              className={`rounded-pill px-4 py-2 text-[13px] font-semibold transition-colors ${terceros === "terceros" ? "bg-navy text-white" : "text-slate2 hover:text-navy"}`}
            >
              Terceros
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={terceros === "terceros-ampliado"}
              onClick={() => setTerceros("terceros-ampliado")}
              className={`rounded-pill px-4 py-2 text-[13px] font-semibold transition-colors ${terceros === "terceros-ampliado" ? "bg-navy text-white" : "text-slate2 hover:text-navy"}`}
            >
              Terceros ampliado
            </button>
          </div>

          <ul className="mt-5 flex flex-1 flex-col gap-2.5">
            {coberturasTerceros.map((c) => (
              <li key={c} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                  <Check width={12} height={12} />
                </span>
                <span className="text-[14px] leading-relaxed text-ink">{c}</span>
              </li>
            ))}
          </ul>

          <CtaButtons modalidad={terceros} />
        </div>

        <div className="flex flex-col rounded-[24px] border-2 border-brand-red bg-white p-6 shadow-soft">
          <span className="inline-flex w-fit items-center rounded-pill bg-brand-red/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand-red">
            Todo riesgo
          </span>

          <ul className="mt-5 flex flex-1 flex-col gap-2.5">
            {TODO_RIESGO.map((c) => (
              <li key={c} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                  <Check width={12} height={12} />
                </span>
                <span className="text-[14px] leading-relaxed text-ink">{c}</span>
              </li>
            ))}
          </ul>

          <CtaButtons modalidad="todo-riesgo" />
        </div>
      </div>
    </section>
  );
}
