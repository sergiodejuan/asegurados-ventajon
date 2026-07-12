import { Suspense } from "react";
import type { Metadata } from "next";
import { StepForm } from "@/components/StepForm";
import { PromoBanner } from "@/components/PromoBanner";
import { SeoContent } from "@/components/SeoContent";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import { Check, IconByName } from "@/components/icons";
import { BRAND_NAME, ECOSYSTEM_MEMBERS, PARTNERS, VENTAJAS } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Calcula tu precio · Seguro de salud — ${BRAND_NAME}`,
  description: "Compara tu seguro de salud entre las mejores compañías y calcula tu precio en un minuto, sin compromiso.",
};

// Cabecera propia sin navegación en el bloque del formulario (sin distracciones);
// el bloque SEO de debajo sí es indexable.
export default function TarificadorSalud() {
  return (
    <main className="safe-top min-h-screen bg-mist md:py-12">
      <div className="mx-auto max-w-app px-5 py-6 md:max-w-5xl md:py-0 lg:max-w-6xl">
        <p className="mb-4 text-center font-display text-[16px] font-extrabold text-navy md:mb-8" translate="no">{BRAND_NAME}</p>

        <div className="md:grid md:grid-cols-[1fr_1.1fr] md:items-start md:gap-14">
          {/* Formulario: primero en el DOM (móvil lo ve primero, sin distracciones); a la derecha en escritorio */}
          <div className="md:order-2">
            <h1 className="text-[26px] font-extrabold leading-tight text-navy">Calcula tu precio</h1>
            <p className="mb-5 mt-1 text-[15px] leading-relaxed text-slate2">Un minuto. Sin compromiso. Ve precios al momento.</p>
            <Suspense fallback={<div className="h-[420px] rounded-[24px] border border-hair bg-white shadow-card" />}>
              <StepForm variant="salud" />
            </Suspense>
          </div>

          {/* Banner de descuento + prueba social + ventajas: debajo en móvil, a la izquierda en escritorio */}
          <div className="mt-8 md:order-1 md:mt-0">
            <div className="mb-5"><PromoBanner /></div>

            <section aria-label="Confianza" className="rounded-[24px] border border-hair bg-white p-6 shadow-soft">
              <p className="text-[15px] font-bold text-navy">
                Parte del ecosistema Ventajon, con {ECOSYSTEM_MEMBERS}.
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-slate2">
                Comparamos entre las mejores aseguradoras del país para que pagues lo justo.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2" translate="no">
                {PARTNERS.map((p) => (
                  <li key={p} className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[13px] font-semibold text-navy">{p}</li>
                ))}
              </ul>
              <div className="mt-4">
                <AvailabilityBadge />
              </div>
            </section>

            <section aria-label="Ventajas" className="mt-6 grid grid-cols-2 gap-3">
              {VENTAJAS.map((v) => (
                <div key={v.t} className="rounded-card border border-hair bg-white p-4 shadow-soft">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                    <IconByName name={v.icon} width={18} height={18} />
                  </span>
                  <p className="mt-3 text-[15px] font-bold text-ink">{v.t}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-slate2">{v.d}</p>
                </div>
              ))}
            </section>

            <ul className="mt-6 flex flex-col gap-3">
              {["De tu lado, no de la compañía.", "Sin trucos, sin letra pequeña."].map((c) => (
                <li key={c} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy/10 text-navy"><Check width={15} height={15} /></span>
                  <span className="text-[15px] font-medium text-ink">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <SeoContent variant="salud" />
    </main>
  );
}
