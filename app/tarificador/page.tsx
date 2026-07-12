import { Suspense } from "react";
import type { Metadata } from "next";
import { StepForm } from "@/components/StepForm";
import { PromoBanner } from "@/components/PromoBanner";
import { SeoContent } from "@/components/SeoContent";

import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Calcula tu precio · Seguro de salud — ${BRAND_NAME}`,
  description: "Compara tu seguro de salud entre las mejores compañías y calcula tu precio en un minuto, sin compromiso.",
};

// Cabecera propia sin navegación en el bloque del formulario (sin distracciones);
// el bloque SEO de debajo sí es indexable.
export default function TarificadorSalud() {
  return (
    <main className="safe-top min-h-screen bg-mist md:pt-12">
      <div className="md:flex md:items-center md:justify-center">
        <div className="mx-auto max-w-app px-5 py-6 md:max-w-lg md:py-0">
          <p className="mb-4 text-center font-display text-[16px] font-extrabold text-navy" translate="no">{BRAND_NAME}</p>
          <PromoBanner />
          <h1 className="mt-6 text-[26px] font-extrabold leading-tight text-navy">Calcula tu precio</h1>
          <p className="mb-5 mt-1 text-[15px] leading-relaxed text-slate2">Un minuto. Sin compromiso. Comparamos por ti.</p>
          <Suspense fallback={<div className="h-[420px] rounded-[24px] border border-hair bg-white shadow-card" />}>
            <StepForm variant="salud" />
          </Suspense>
        </div>
      </div>
      <SeoContent variant="salud" />
    </main>
  );
}
