import { Suspense } from "react";
import type { Metadata } from "next";
import { TarificadorExperience } from "@/components/TarificadorExperience";
import { SeoContent } from "@/components/SeoContent";
import { MinimalTopBar } from "@/components/MinimalTopBar";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Calcula tu precio · Seguro de auto — ${BRAND_NAME}`,
  description: "Compara tu seguro de coche o moto entre las mejores compañías y calcula tu precio en un minuto, sin compromiso.",
};

export default function TarificadorAuto() {
  return (
    <main className="safe-top min-h-screen bg-mist md:py-12">
      <div className="mx-auto max-w-app px-5 py-6 md:max-w-5xl md:py-0 lg:max-w-6xl">
        <MinimalTopBar />

        <Suspense fallback={<div className="h-[480px] rounded-[24px] border border-hair bg-white shadow-card md:h-[560px]" />}>
          <TarificadorExperience
            variant="auto"
            heading="Calcula tu precio de seguro de auto"
            subheading="Un minuto. Sin compromiso. Ve precios al momento."
          />
        </Suspense>

        <p className="mt-8 text-center text-[14px] font-medium text-ink md:mt-10">
          De tu lado, no de la compañía. <span aria-hidden="true" className="mx-1.5 text-slate2/50">·</span> Sin trucos, sin letra pequeña.
        </p>
      </div>
      <SeoContent variant="auto" />
    </main>
  );
}
