import type { Metadata } from "next";
import { MinimalTopBar } from "@/components/MinimalTopBar";
import { LeadMagnetForm } from "@/components/LeadMagnetForm";
import { BRAND_NAME, CONTACT_HOURS, ECOSYSTEM_MEMBERS, PARTNERS } from "@/lib/brand";

const TITLE = `Guías gratis de seguros para Canarias y Baleares — ${BRAND_NAME}`;
const DESCRIPTION =
  "Guía para elegir tu seguro de salud y checklist para renovar el de auto, pensadas para quien vive en Canarias o Baleares. Descarga gratis, sin compromiso.";
const PARTNERS_TEXT = new Intl.ListFormat("es-ES", { style: "long", type: "conjunction" }).format(PARTNERS);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, locale: "es_ES", type: "website" },
};

const FAQ = [
  {
    q: "¿Trabajáis con clientes en Canarias y Baleares?",
    a: `Sí, es una de nuestras zonas de mayor cercanía. Aunque comparamos seguros en toda España, tenemos especial experiencia en las particularidades de vivir en un archipiélago — desde traslados sanitarios interinsulares hasta asistencia en carretera con cobertura limitada por isla.`,
  },
  {
    q: "¿Puedo tarificar mi seguro de auto o salud si vivo en una isla más pequeña?",
    a: "Sí. Trabajamos con tu código postal exacto, ya sea en Gran Canaria, Tenerife, Lanzarote, Fuerteventura, La Palma, La Gomera o El Hierro, o en Mallorca, Menorca, Ibiza o Formentera. El proceso es 100 % online, sin necesidad de desplazarte a ninguna oficina.",
  },
  {
    q: "¿Las guías tienen algún coste?",
    a: "No, son completamente gratuitas y no implican ningún compromiso de contratación.",
  },
  {
    q: "¿Qué hacéis con mi email?",
    a: "Solo lo usamos para enviarte la guía y, si marcas la casilla, para nuestra newsletter con consejos sobre seguros. Puedes darte de baja cuando quieras y nunca lo compartimos con terceros.",
  },
  {
    q: "Después de descargar la guía, ¿me vais a llamar?",
    a: "No, a menos que tú lo pidas expresamente (por ejemplo, calculando tu precio en nuestro tarificador). Descargar una guía no autoriza ninguna llamada comercial.",
  },
];

export default function RecursosCanariasBalearesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "InsuranceAgency",
        name: BRAND_NAME,
        areaServed: [
          { "@type": "AdministrativeArea", name: "Canarias" },
          { "@type": "AdministrativeArea", name: "Islas Baleares" },
        ],
        description: DESCRIPTION,
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="safe-top min-h-screen bg-mist">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-app px-5 py-8 md:max-w-5xl md:py-14 lg:max-w-6xl">
        <MinimalTopBar />

        <div className="md:grid md:grid-cols-[1.1fr_1fr] md:items-start md:gap-14">
          <div>
            <p className="inline-flex items-center rounded-pill bg-navy/10 px-3 py-1 text-[12px] font-bold text-navy">Especial Canarias y Baleares</p>
            <h1 className="mt-3 text-[26px] font-extrabold leading-tight text-navy md:text-[32px]">
              Guías gratuitas para elegir bien tu seguro, pensadas para quien vive en las islas
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-slate2">
              Vivir en un archipiélago cambia lo que conviene mirar en una póliza: traslados entre islas, asistencia en carretera con cobertura limitada, o la disponibilidad real de especialistas cerca de ti. Te lo explicamos en dos guías gratuitas, sin letra pequeña.
            </p>

            <div className="mt-8 md:hidden">
              <LeadMagnetForm />
            </div>

            <section aria-labelledby="por-que" className="mt-10">
              <h2 id="por-que" className="text-[19px] font-bold text-navy">Seguros con cercanía real en Canarias y Baleares</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                {BRAND_NAME} es correduría de seguros: comparamos tu perfil entre varias compañías —como {PARTNERS_TEXT}— y te ayudamos a elegir la póliza que de verdad se ajusta a lo que necesitas. Trabajamos en toda España, pero con atención especial a las particularidades de vivir en Tenerife, Gran Canaria, Lanzarote, Fuerteventura, La Palma, La Gomera, El Hierro, Mallorca, Menorca, Ibiza o Formentera. Todo el proceso es online, sin desplazamientos a ninguna oficina, en horario {CONTACT_HOURS}, dentro del ecosistema Ventajon con {ECOSYSTEM_MEMBERS}.
              </p>
            </section>

            <section aria-labelledby="salud-islas" className="mt-8">
              <h2 id="salud-islas" className="text-[16px] font-bold text-navy">Seguro de salud en Canarias y Baleares: qué revisar</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                No todas las compañías tienen el mismo cuadro médico en todas las islas: lo que es una cobertura amplia en Gran Canaria o Mallorca puede quedarse corto en islas menores como Fuerteventura, Formentera o El Hierro. Conviene revisar también si la póliza cubre el traslado sanitario a otra isla o a la península cuando una prueba o especialista no está disponible donde vives. En nuestra guía gratuita lo explicamos con detalle.
              </p>
            </section>

            <section aria-labelledby="auto-islas" className="mt-8">
              <h2 id="auto-islas" className="text-[16px] font-bold text-navy">Seguro de auto en zona insular: la letra pequeña que importa</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                En zonas turísticas e insulares, la asistencia en carretera y la disponibilidad de un vehículo de sustitución pueden estar más limitadas que en la península. Antes de renovar tu seguro de coche o moto, merece la pena revisar el radio real de cobertura de la asistencia en viaje. Nuestro checklist descargable repasa los 10 puntos clave antes de firmar.
              </p>
            </section>

            <section aria-labelledby="faq" className="mt-10">
              <h2 id="faq" className="text-[16px] font-bold text-navy">Preguntas frecuentes</h2>
              <dl className="mt-3 flex flex-col gap-4">
                {FAQ.map((f) => (
                  <div key={f.q}>
                    <dt className="text-[14px] font-semibold text-ink">{f.q}</dt>
                    <dd className="mt-1 text-[14px] leading-relaxed text-slate2">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <p className="mt-10 text-[12px] leading-relaxed text-slate2">
              Al enviar el formulario aceptas nuestra{" "}
              <a href="/legal" target="_blank" rel="noopener noreferrer" className="underline">política de privacidad</a>.
              {" "}¿Necesitas comparar precios ya? Prueba{" "}
              <a href="/tarificador" className="font-semibold text-navy underline">nuestro tarificador</a>.
            </p>
          </div>

          <div className="hidden md:block md:sticky md:top-10">
            <LeadMagnetForm />
          </div>
        </div>
      </div>
    </main>
  );
}
