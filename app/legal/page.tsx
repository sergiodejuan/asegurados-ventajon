import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Información legal — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function Legal() {
  return (
    <>
      <Header />
      <main id="contenido" className="mx-auto max-w-app px-5 py-12 md:max-w-2xl md:py-16">
        <h1 className="text-[26px] font-extrabold text-navy">Información legal</h1>

        <div className="mt-4 rounded-card border border-brand-red/30 bg-brand-red/5 p-4">
          <p className="text-[14px] font-semibold text-brand-red-deep">
            Contenido pendiente de validación
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Estos textos son un marcador de posición. Antes de publicar, deben
            redactarse y validarse con Gabriel y asesoría legal: identificación
            de la correduría (inscripción DGSFP, seguro de responsabilidad
            civil), política de privacidad conforme al RGPD, condiciones de uso
            del formulario y aviso legal. La comunicación comercial de una
            correduría está sujeta a la normativa de distribución de seguros.
          </p>
        </div>

        <section className="mt-8">
          <h2 className="text-[18px] font-bold text-navy">Política de privacidad</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-slate2">
            [Responsable del tratamiento, finalidad, base jurídica
            (consentimiento), destinatarios, plazo de conservación, derechos del
            interesado y forma de ejercerlos. Pendiente de redacción.]
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-[18px] font-bold text-navy">Condiciones de uso</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-slate2">
            [Condiciones del servicio de comparación y del formulario de
            solicitud de contacto. Pendiente de redacción.]
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-[18px] font-bold text-navy">Aviso legal</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-slate2">
            [Datos identificativos de {BRAND_NAME} como correduría de seguros.
            Pendiente de redacción.]
          </p>
        </section>

        <a href="/" className="mt-8 block text-[14px] font-medium text-navy underline">
          Volver al inicio
        </a>
      </main>
    </>
  );
}
