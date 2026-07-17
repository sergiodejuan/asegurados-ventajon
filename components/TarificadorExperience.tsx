"use client";

import { useState } from "react";
import { StepForm } from "./StepForm";
import { PromoBanner } from "./PromoBanner";
import { TarificadorSidebarCards, stageForStep } from "./TarificadorSidebarCards";

export function TarificadorExperience({
  variant,
  heading,
  subheading,
  headingLevel = "h1",
  origen,
}: {
  variant: "salud" | "vida" | "auto";
  heading: string;
  subheading: string;
  // Las páginas /tarificador* son dueñas de su propio H1 (esta es toda la
  // página). Cuando se embebe dentro de una landing más larga que ya tiene
  // su propio H1 en el hero, se pasa "h2" para no duplicar el nivel más
  // importante de la jerarquía semántica de la página.
  headingLevel?: "h1" | "h2";
  origen?: "asistente" | "seo-landing";
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const Heading = headingLevel;

  return (
    <div className="md:grid md:grid-cols-[1fr_1.1fr] md:items-start md:gap-14">
      {/* Formulario: primero en el DOM (móvil lo ve primero, sin distracciones); a la derecha en escritorio */}
      <div className="md:order-2">
        <Heading className="text-[26px] font-extrabold leading-tight text-navy">{heading}</Heading>
        <p className="mb-5 mt-1 text-[15px] leading-relaxed text-slate2">{subheading}</p>
        <StepForm variant={variant} onStepChange={setStepIndex} origen={origen} />
      </div>

      {/* Banner de descuento + prueba social dinámica: debajo en móvil, a la izquierda en escritorio */}
      <div className="mt-8 md:order-1 md:mt-0">
        <div className="mb-5"><PromoBanner /></div>
        <TarificadorSidebarCards stage={stageForStep(stepIndex)} />
      </div>
    </div>
  );
}
