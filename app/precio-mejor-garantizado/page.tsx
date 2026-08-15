import type { Metadata } from "next";
import { PriceMatchLanding } from "@/components/landings/PriceMatchLanding";
import { getPriceMatchLandingConfig, getTheme } from "@/lib/store";
import { BRAND_NAME, CALLER_NUMBERS, SITE_URL } from "@/lib/brand";

// Landing "igualación de precio" — /precio-mejor-garantizado.
// A diferencia de /lp/salud, esta va INDEXABLE por defecto (robots.index
// configurable desde admin): tiene alto valor SEO en keywords long-tail que
// no cubre el resto del sitio ("igualar precio seguro salud", "cambiar
// seguro salud más barato"…) y compite en un espacio casi vacío.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPriceMatchLandingConfig();
  return {
    title: config.metaTitle,
    description: config.metaDescription,
    robots: config.robotsIndex
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    alternates: { canonical: `${SITE_URL}/precio-mejor-garantizado` },
    openGraph: {
      title: config.metaTitle,
      description: config.metaDescription,
      url: `${SITE_URL}/precio-mejor-garantizado`,
      images: config.hero.imageUrl ? [{ url: config.hero.imageUrl }] : undefined,
    },
  };
}

export default async function PriceMatchLandingPage() {
  const [config, theme] = await Promise.all([
    getPriceMatchLandingConfig(),
    getTheme(),
  ]);
  const phone = CALLER_NUMBERS[0]?.number || "";
  const url = `${SITE_URL}/precio-mejor-garantizado`;

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Igualación de precio de seguros",
    serviceType: "Correduría de seguros — estudio comparativo",
    description: config.metaDescription,
    provider: { "@type": "InsuranceAgency", name: BRAND_NAME, url: SITE_URL },
    areaServed: { "@type": "Country", name: "España" },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      description: "Estudio gratuito y sin compromiso, respuesta en menos de 24 horas laborables.",
    },
    url,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faq.items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      {config.faq.items.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <PriceMatchLanding
        config={config}
        logoUrl={theme.logoUrl || theme.minimalLogoUrl || ""}
        phone={phone}
      />
    </>
  );
}
