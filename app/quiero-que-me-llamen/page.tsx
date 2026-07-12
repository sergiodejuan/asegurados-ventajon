import { Suspense } from "react";
import type { Metadata } from "next";
import { CallRequestForm } from "@/components/CallRequestForm";
import { PromoBanner } from "@/components/PromoBanner";
import { Check, IconByName } from "@/components/icons";
import { BRAND_NAME, PARTNERS, ECOSYSTEM_MEMBERS, SELLING_POINTS, VENTAJAS } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Te llamamos gratis — ${BRAND_NAME}`,
  robots: { index: false, follow: false }, // página de campaña, no indexar
};

// Página de conversión: SIN cabecera, SIN navegación, SIN footer con enlaces de salida.
export default function QuieroQueMeLlamen() {
  return (
    <main className="safe-top min-h-screen bg-mist">
      <div className="mx-auto max-w-app px-5 py-8 md:max-w-5xl md:py-16 lg:max-w-6xl">
        {/* Marca mínima, sin enlaces de navegación (no hay salida del funnel) */}
        <p className="mb-6 text-center font-display text-[16px] font-extrabold text-navy md:mb-10" translate="no">
          {BRAND_NAME}
        </p>

        <div className="md:grid md:grid-cols-[1fr_1.1fr] md:items-start md:gap-14">
          <div className="md:order-2">
            <div className="mb-5"><PromoBanner /></div>

            <Suspense fallback={<div className="h-[520px] rounded-[24px] border border-hair bg-white shadow-card" />}>
              <CallRequestForm />
            </Suspense>

            {/* Nota legal mínima (sin navegación; el enlace abre en pestaña nueva) */}
            <p className="mt-8 text-center text-[12px] leading-relaxed text-slate2">
              Al enviar aceptas nuestra{" "}
              <a href="/legal" target="_blank" rel="noopener noreferrer" className="underline">política de privacidad</a>.
              {" "}Sin coste ni compromiso.
            </p>
          </div>

          <div className="md:order-1">
            {/* SELLING POINTS */}
            <ul className="mt-8 flex flex-col gap-3 md:mt-0">
              {SELLING_POINTS.map((s) => (
                <li key={s} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                    <Check width={15} height={15} />
                  </span>
                  <span className="text-[15px] font-medium text-ink">{s}</span>
                </li>
              ))}
            </ul>

            {/* SOCIAL PROOF */}
            <section aria-label="Confianza" className="mt-10 rounded-[24px] border border-hair bg-white p-6 shadow-soft">
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
            </section>

            {/* VENTAJAS resumidas */}
            <section aria-label="Ventajas" className="mt-8 grid grid-cols-2 gap-3">
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
          </div>
        </div>
      </div>
    </main>
  );
}
