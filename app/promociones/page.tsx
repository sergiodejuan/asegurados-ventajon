import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCta } from "@/components/StickyMobileCta";
import { PromotionCard } from "@/components/PromotionCard";
import { FaqAccordion, type FaqItem } from "@/components/FaqAccordion";
import { BRAND_NAME, SITE_URL } from "@/lib/brand";
import { listPromotions } from "@/lib/store";

const TITLE = `Promociones de seguros — ${BRAND_NAME}`;
const DESCRIPTION =
  "Descubre las promociones y ofertas activas de Asegurados Ventajon: mejor precio garantizado, condiciones especiales y descuentos en seguros de salud, vida, hogar, auto y decesos.";

const FAQ_PROMOCIONES: FaqItem[] = [
  {
    q: "¿Las promociones tienen algún coste oculto?",
    a: "No. Comparar y acogerte a cualquiera de nuestras promociones es gratuito y sin compromiso de contratación. Las condiciones exactas de cada una están siempre detalladas en su propia página, en el apartado \"Bases\".",
  },
  {
    q: "¿Puedo combinar varias promociones a la vez?",
    a: "Por lo general, las promociones no son acumulables entre sí ni con otras campañas comerciales vigentes: se aplica la que más te convenga según tu situación. Tu asesor te lo confirma antes de contratar.",
  },
  {
    q: "¿Qué significa \"mejor precio garantizado\"?",
    a: "Significa que, si comparamos tu seguro y el precio que te ofrecemos fuera superior al de tu compañía actual para una cobertura equivalente, ajustamos nuestra propuesta para igualarlo o mejorarlo, dentro de las condiciones descritas en las bases de cada promoción.",
  },
  {
    q: "¿Hasta cuándo están activas las promociones?",
    a: "Cada promoción indica su fecha de validez en su propia página. Pasada esa fecha, deja de mostrarse automáticamente en este listado; si ves una promoción publicada aquí, significa que sigue vigente en este momento.",
  },
  {
    q: "¿Cómo me acojo a una promoción?",
    a: "Entra en la promoción que te interese y calcula tu precio o pide que te llamemos desde su propia página. Un asesor te confirma si tu perfil cumple las condiciones antes de formalizar cualquier contratación.",
  },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, locale: "es_ES", type: "website" },
};

// Página padre (listado), pensada para posicionar "promociones seguros" y la
// marca: contenido fijo y fuerte en SEO aquí, igual que /actualidad; lo
// editable desde /admin/promociones es cada promoción (la página hija).
export default async function PromocionesPage() {
  const promotions = await listPromotions({ onlyPublished: true });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Promociones", item: `${SITE_URL}/promociones` },
        ],
      },
      {
        "@type": "CollectionPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/promociones`,
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_PROMOCIONES.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main id="contenido">
        <section className="w-full bg-gradient-to-br from-navy to-navy-deep px-5 py-14 text-center text-white md:py-20">
          <span className="inline-flex items-center rounded-pill bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-white/80">
            Promociones
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-[32px] font-extrabold leading-[1.1] md:text-[44px]">
            Promociones de seguros de {BRAND_NAME}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-white/85 md:text-[17px]">
            Descubre las ofertas y condiciones especiales que tenemos activas ahora mismo para premiar a quien compara
            con nosotros: mejor precio garantizado, descuentos y ventajas en salud, vida, hogar, auto y decesos.
          </p>
        </section>

        <section aria-label="Promociones" className="mx-auto mt-14 max-w-app px-5 pb-14 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          {promotions.length === 0 ? (
            <p className="text-center text-[14px] text-slate2">Ahora mismo no hay promociones activas. Vuelve pronto.</p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {promotions.map((p) => <PromotionCard key={p.id} promo={p} />)}
            </ul>
          )}
        </section>

        {/* Texto enriquecido: refuerza el posicionamiento de "promociones
            seguros" más allá de las tarjetas, que apenas llevan texto propio. */}
        <section aria-labelledby="sobre-promociones" className="mx-auto mt-4 max-w-app px-5 pb-4 md:mt-8 md:max-w-3xl">
          <h2 id="sobre-promociones" className="text-[20px] font-extrabold text-navy md:text-[24px]">
            Promociones de seguros: cómo funcionan en {BRAND_NAME}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate2">
            Como correduría de seguros, comparamos tu perfil entre varias aseguradoras para encontrar la póliza que
            mejor se ajusta a ti, no la que más nos conviene vender. Nuestras promociones son la forma en la que
            premiamos a quien compara con nosotros: mejor precio garantizado frente a tu compañía actual, meses de
            regalo en tu primera mensualidad o condiciones especiales según el ramo, siempre explicadas sin letra
            pequeña en la página de cada promoción.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-slate2">
            Todas las promociones activas se muestran en esta página, con su fecha de validez y sus condiciones
            completas (bases legales) accesibles antes de que decidas nada. Si una promoción caduca, desaparece de
            este listado automáticamente, así que lo que ves aquí siempre está vigente hoy. Comparar nunca tiene
            coste ni te compromete a contratar.
          </p>
        </section>

        <FaqAccordion heading="Preguntas frecuentes sobre las promociones" items={FAQ_PROMOCIONES} />

        <section className="mx-auto mt-4 max-w-app px-5 pb-14 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] bg-navy p-6 text-white md:flex md:items-center md:justify-between md:gap-10 md:p-12">
            <div>
              <h2 className="text-[22px] font-extrabold leading-tight md:text-[28px]">¿Empezamos?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/80 md:text-[16px]">
                Calcula tu precio en 1 minuto o deja que te llamemos. Sin coste ni compromiso.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-3 md:mt-0 md:flex-row md:shrink-0">
              <a href="/tarificador" className="flex items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep">Calcula tu precio</a>
              <a href="/quiero-que-me-llamen" className="flex items-center justify-center rounded-card border border-white/30 px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-white/10">Te llamamos gratis</a>
            </div>
          </div>
        </section>
      </main>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <Footer />
      <StickyMobileCta label="Calcula tu precio" href="/tarificador" secondaryLabel="Que te llamen" secondaryHref="/quiero-que-me-llamen" />
    </>
  );
}
