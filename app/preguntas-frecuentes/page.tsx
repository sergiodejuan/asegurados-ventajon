import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCta } from "@/components/StickyMobileCta";
import { FaqCategoryTabs, type FaqCategory } from "@/components/FaqCategoryTabs";
import { WhatsApp } from "@/components/icons";
import { BRAND_NAME, SITE_URL, WHATSAPP_URL_GENERIC } from "@/lib/brand";
import { PRODUCT_PAGES } from "@/lib/productPages";
import { safeJsonLd } from "@/lib/safeJsonLd";

const TITLE = `Preguntas frecuentes — ${BRAND_NAME}`;
const DESCRIPTION =
  "Resolvemos las dudas más habituales sobre cómo funcionamos, nuestros seguros de salud, vida, decesos, hogar y auto, las promociones activas y nuestras guías gratuitas.";

const FAQ_SOBRE_NOSOTROS = [
  {
    q: "¿Sois una aseguradora?",
    a: "No. Somos correduría de seguros: un intermediario independiente que compara entre varias aseguradoras para encontrar la que mejor se ajusta a ti. No vendemos un único producto ni representamos a una sola compañía.",
  },
  {
    q: "¿Cuánto cuesta compararse con vosotros?",
    a: "Nada. La comparativa y el asesoramiento son 100% gratuitos y sin compromiso de contratación.",
  },
  {
    q: "¿Cómo ganáis dinero si comparar es gratis?",
    a: "Cobramos una comisión a la aseguradora que finalmente elijas, como cualquier correduría. Nunca cobramos al cliente por comparar ni por el asesoramiento, y eso no cambia el precio que tú pagas por tu póliza.",
  },
  {
    q: "¿Qué seguros comparáis?",
    a: "Salud, vida, decesos, hogar y auto, entre las principales aseguradoras del país: Mapfre, Adeslas, Asisa, Zurich y Generali.",
  },
  {
    q: "¿Qué es el ecosistema Ventajon?",
    a: "Es la comunidad de socios y clientes a la que pertenece Asegurados Ventajon, con más poder de negociación frente a las aseguradoras y condiciones que, en solitario, serían más difíciles de conseguir.",
  },
  {
    q: "¿Cómo me contactáis?",
    a: "Como prefieras: por teléfono, WhatsApp o completando el formulario online. Tú eliges cuándo y cómo.",
  },
  {
    q: "¿En qué zonas trabajáis?",
    a: "En toda España. Todo nuestro proceso es online y por teléfono, así que da igual dónde vivas; eso sí, tenemos una cercanía especial con Canarias y Baleares, de donde parte nuestro equipo.",
  },
];

const FAQ_PROMOCIONES = [
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
    a: "Cada promoción indica su fecha de validez en su propia página. Pasada esa fecha, deja de mostrarse automáticamente en el listado; si ves una promoción publicada en /promociones, significa que sigue vigente en este momento.",
  },
  {
    q: "¿Cómo me acojo a una promoción?",
    a: "Entra en la promoción que te interese y calcula tu precio o pide que te llamemos desde su propia página. Un asesor te confirma si tu perfil cumple las condiciones antes de formalizar cualquier contratación.",
  },
];

const FAQ_OTROS = [
  {
    q: "¿Las guías gratuitas tienen algún coste?",
    a: "No, son completamente gratuitas y no implican ningún compromiso de contratación.",
  },
  {
    q: "Después de descargar una guía, ¿me vais a llamar?",
    a: "No, a menos que tú lo pidas expresamente (por ejemplo, calculando tu precio en nuestro tarificador). Descargar una guía no autoriza ninguna llamada comercial.",
  },
  {
    q: "¿Qué hacéis con mi email?",
    a: "Solo lo usamos para enviarte lo que has pedido y, si marcas la casilla, para nuestra newsletter con consejos sobre seguros. Puedes darte de baja cuando quieras y nunca lo compartimos con terceros.",
  },
];

// Las categorías de producto reutilizan el FAQ ya escrito en cada página de
// producto (lib/productPages.ts) en vez de duplicarlo aquí a mano — si se
// actualiza uno, esta página queda al día sola.
const CATEGORIES: FaqCategory[] = [
  { id: "sobre-nosotros", label: `Sobre ${BRAND_NAME}`, items: FAQ_SOBRE_NOSOTROS },
  ...PRODUCT_PAGES.map((p) => ({ id: p.slug, label: p.badge, items: p.faq })),
  { id: "promociones", label: "Promociones", items: FAQ_PROMOCIONES },
  { id: "otros", label: "Otros", items: FAQ_OTROS },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, locale: "es_ES", type: "website" },
};

// El mega menú de "Seguros" enlaza directamente a la categoría de cada ramo
// (p.ej. /preguntas-frecuentes?cat=salud) — la key fuerza el remonte del
// componente cliente cuando se navega aquí desde otra categoría distinta a
// la ya abierta, aunque la ruta en sí no cambie.
export default function PreguntasFrecuentesPage({ searchParams }: { searchParams: { cat?: string } }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Preguntas frecuentes", item: `${SITE_URL}/preguntas-frecuentes` },
        ],
      },
      {
        "@type": "FAQPage",
        // El JSON-LD incluye TODAS las preguntas de TODAS las categorías,
        // no solo las de la pestaña abierta por defecto — así los rastreadores
        // ven el contenido completo aunque en pantalla solo se vea una pestaña.
        mainEntity: CATEGORIES.flatMap((c) => c.items).map((f) => ({
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Header />
      <main id="contenido">
        <section className="mx-auto max-w-app px-5 pt-8 md:max-w-3xl md:pt-14">
          <h1 className="font-display text-[28px] font-extrabold leading-[1.1] text-navy md:text-[38px]">
            Preguntas frecuentes
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
            A continuación, te mostramos las respuestas a las preguntas más frecuentes realizadas por nuestros clientes.
          </p>
        </section>

        <section aria-label="Preguntas frecuentes por categoría" className="mx-auto mt-6 max-w-app pb-14 md:max-w-3xl">
          <FaqCategoryTabs key={searchParams.cat ?? "default"} categories={CATEGORIES} initialCategoryId={searchParams.cat} />
        </section>

        <section className="mx-auto mt-4 max-w-app px-5 pb-14 md:max-w-3xl">
          <div className="rounded-[24px] border border-hair bg-mist p-6 text-center md:p-10">
            <h2 className="text-[19px] font-extrabold text-navy md:text-[22px]">¿No encuentras lo que buscas?</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-slate2">
              Escríbenos por WhatsApp o pide que te llamemos gratis: un asesor resuelve tu duda sin coste ni compromiso.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={WHATSAPP_URL_GENERIC}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-card bg-emerald-600 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <WhatsApp className="text-white" />
                Escríbenos por WhatsApp
              </a>
              <a
                href="/quiero-que-me-llamen"
                className="flex items-center justify-center rounded-card border border-hair bg-white px-6 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-hair"
              >
                Te llamamos gratis
              </a>
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
