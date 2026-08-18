import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCta } from "@/components/StickyMobileCta";
import { TestimonioCard } from "@/components/TestimonioCard";
import { FaqAccordion, type FaqItem } from "@/components/FaqAccordion";
import { BRAND_NAME, SITE_URL } from "@/lib/brand";
import { listTestimonios } from "@/lib/store";
import { safeJsonLd } from "@/lib/safeJsonLd";

const TITLE = `Testimonios de clientes: conoce su historia — ${BRAND_NAME}`;
const DESCRIPTION =
  "Historias reales de familias y personas aseguradas con Asegurados Ventajon: cómo encontraron el seguro de salud, vida, auto, hogar o decesos que mejor se ajustaba a ellas, sin tabúes ni letra pequeña.";

const FAQ_TESTIMONIOS: FaqItem[] = [
  {
    q: "¿Estas historias son de clientes reales?",
    a: "Sí. Solo publicamos historias con el consentimiento expreso de la familia o persona protagonista; no inventamos ni recreamos testimonios.",
  },
  {
    q: "¿Puedo compartir mi propia experiencia?",
    a: "Por supuesto. Si quieres contar cómo te ayudamos a elegir tu seguro, escríbenos por WhatsApp o pídele a tu asesor que te lo proponga.",
  },
  {
    q: "¿Estas historias sustituyen a una comparativa real?",
    a: "No. Son relatos personales para que veas cómo ha sido la experiencia de otras personas; tu comparativa siempre se calcula con tus propios datos, nunca con los de otra persona.",
  },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, locale: "es_ES", type: "website" },
  alternates: { canonical: `${SITE_URL}/testimonios` },
};

// Página padre (listado), fuerte en SEO propio: contenido fijo aquí, y lo
// editable desde /admin/testimonios es cada historia (la página hija, con
// su propio scrollytelling).
export default async function TestimoniosPage() {
  const testimonios = await listTestimonios({ onlyPublished: true });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Testimonios", item: `${SITE_URL}/testimonios` },
        ],
      },
      {
        "@type": "CollectionPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/testimonios`,
      },
      testimonios.length > 0 && {
        "@type": "ItemList",
        itemListElement: testimonios.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/testimonios/${t.slug}`,
          name: t.nombre,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_TESTIMONIOS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ].filter(Boolean),
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Header />
      <main id="contenido">
        <section className="w-full bg-gradient-to-br from-navy to-navy-deep px-5 py-14 text-center text-white md:py-20">
          <span className="inline-flex items-center rounded-pill bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-white/80">
            Testimonios
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-[32px] font-extrabold leading-[1.1] md:text-[44px]">
            Historias de personas que ya están tranquilas
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-white/85 md:text-[17px]">
            Detrás de cada póliza hay una familia real. Estas son algunas de sus historias: por qué buscaron
            un seguro, qué les preocupaba y cómo les ayudamos a encontrar tranquilidad.
          </p>
        </section>

        <section aria-label="Testimonios" className="mx-auto mt-14 max-w-app px-5 pb-14 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          {testimonios.length === 0 ? (
            <p className="text-center text-[14px] text-slate2">
              Estamos reuniendo las primeras historias. Vuelve pronto o cuéntanos la tuya.
            </p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonios.map((t) => <TestimonioCard key={t.id} testimonio={t} />)}
            </ul>
          )}
        </section>

        <section aria-labelledby="sobre-testimonios" className="mx-auto mt-4 max-w-app px-5 pb-4 md:mt-8 md:max-w-3xl">
          <h2 id="sobre-testimonios" className="text-[20px] font-extrabold text-navy md:text-[24px]">
            Por qué contamos estas historias
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate2">
            Comparar seguros puede parecer un trámite frío, pero detrás siempre hay un motivo humano: una familia
            que crece, un susto de salud, la tranquilidad de tener todo en orden. En {BRAND_NAME} preferimos
            enseñarte cómo ayudamos de verdad a personas reales, en vez de solo hablarte de coberturas y precios.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-slate2">
            Cada historia se publica siempre con el consentimiento de la familia o persona protagonista. Si
            quieres contarnos la tuya, escríbenos por WhatsApp o coméntaselo a tu asesor.
          </p>
        </section>

        <FaqAccordion heading="Preguntas frecuentes sobre los testimonios" items={FAQ_TESTIMONIOS} />

        <section className="mx-auto mt-4 max-w-app px-5 pb-14 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] bg-navy p-6 text-white md:flex md:items-center md:justify-between md:gap-10 md:p-12">
            <div>
              <h2 className="text-[22px] font-extrabold leading-tight md:text-[28px]">¿Empezamos tu historia?</h2>
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
