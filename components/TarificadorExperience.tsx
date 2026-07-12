"use client";

import { useState } from "react";
import { StepForm } from "./StepForm";
import { PromoBanner } from "./PromoBanner";
import { TarificadorSidebarCards, stageForStep } from "./TarificadorSidebarCards";

export function TarificadorExperience({
  variant,
  heading,
  subheading,
}: {
  variant: "salud" | "vida";
  heading: string;
  subheading: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);

  return (
    <div className="md:grid md:grid-cols-[1fr_1.1fr] md:items-start md:gap-14">
      {/* Formulario: primero en el DOM (móvil lo ve primero, sin distracciones); a la derecha en escritorio */}
      <div className="md:order-2">
        <h1 className="text-[26px] font-extrabold leading-tight text-navy">{heading}</h1>
        <p className="mb-5 mt-1 text-[15px] leading-relaxed text-slate2">{subheading}</p>
        <StepForm variant={variant} onStepChange={setStepIndex} />
      </div>

      {/* Banner de descuento + prueba social dinámica: debajo en móvil, a la izquierda en escritorio */}
      <div className="mt-8 md:order-1 md:mt-0">
        <div className="mb-5"><PromoBanner /></div>
        <TarificadorSidebarCards stage={stageForStep(stepIndex)} />
      </div>
    </div>
  );
}
