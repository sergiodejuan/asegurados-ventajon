import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { NextSteps } from "@/components/NextSteps";
import { Check } from "@/components/icons";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Gracias — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function Gracias() {
  return (
    <>
      <Header />
      <main id="contenido" className="mx-auto max-w-app px-5 py-14 md:max-w-xl md:py-20">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-navy text-white">
          <Check width={30} height={30} />
        </div>
        <h1 className="mt-6 text-[28px] font-extrabold leading-tight text-navy">
          Hecho. Te llamamos enseguida.
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-slate2">
          Un asesor de {BRAND_NAME} preparará tu comparativa y te contactará para
          darte tu propuesta personalizada, comparando entre las mejores
          compañías. Sin compromiso.
        </p>

        <NextSteps />
      </main>
    </>
  );
}
