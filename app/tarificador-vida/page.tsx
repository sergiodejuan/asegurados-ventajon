import { Suspense } from "react";
import type { Metadata } from "next";
import { StepForm } from "@/components/StepForm";
import { PromoBanner } from "@/components/PromoBanner";
import { SeoContent } from "@/components/SeoContent";

import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Calcula tu precio · Seguro de vida — ${BRAND_NAME}`,
  description: "Compara tu seguro de vida entre las mejores compañías y calcula tu precio en un minuto, sin compromiso.",
};

export default function TarificadorVida() {
  return (
    <main className="safe-top min-h-screen bg-mist md:pt-12">
      <div className="md:flex md:items-center md:justify-center">
        <div className="mx-auto max-w-app px-5 py-6 md:max-w-lg md:py-0">
          <p className="mb-4 text-center font-display text-[16px] font-extrabold text-navy" translate="no">{BRAND_NAME}</p>
          <PromoBanner />
          <h1 className="mt-6 text-[26px] font-extrabold leading-tight text-navy">Seguro de vida</h1>
          <p className="mb-5 mt-1 text-[15px] leading-relaxed text-slate2">Un minuto. Sin compromiso. Comparamos por ti.</p>
          <Suspense fallback={<div className="h-[420px] rounded-[24px] border border-hair bg-white shadow-card" />}>
            <StepForm variant="vida" />
          </Suspense>
        </div>
      </div>
      <SeoContent variant="vida" />
    </main>
  );
}
