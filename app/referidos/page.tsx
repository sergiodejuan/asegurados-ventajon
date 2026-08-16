import type { Metadata } from "next";
import { ReferralLanding } from "@/components/landings/ReferralLanding";
import { getReferralLandingConfig, getTheme } from "@/lib/store";
import { BRAND_NAME, CALLER_NUMBERS, SITE_URL } from "@/lib/brand";
import { safeJsonLd } from "@/lib/safeJsonLd";

// Landing pública del programa "Amigos Ventajon" — /referidos.
// Indexable por defecto (SEO valor "programa referidos seguros"). Landing
// personalizada por código vive en /r/[slug] y esa sí va noindex (no
// queremos exposición de nombres de clientes en Google).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getReferralLandingConfig();
  return {
    title: config.metaTitle,
    description: config.metaDescription,
    robots: config.robotsIndex
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    alternates: { canonical: `${SITE_URL}/referidos` },
    openGraph: {
      title: config.metaTitle,
      description: config.metaDescription,
      url: `${SITE_URL}/referidos`,
      images: config.hero.imageUrl ? [{ url: config.hero.imageUrl }] : undefined,
    },
  };
}

export default async function ReferralLandingPage() {
  const [config, theme] = await Promise.all([
    getReferralLandingConfig(),
    getTheme(),
  ]);
  const phone = CALLER_NUMBERS[0]?.number || "";
  const url = `${SITE_URL}/referidos`;

  const promoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Programa Amigos Ventajon",
    serviceType: "Programa de recomendación de clientes",
    description: config.metaDescription,
    provider: { "@type": "InsuranceAgency", name: BRAND_NAME, url: SITE_URL },
    areaServed: { "@type": "Country", name: "España" },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(promoJsonLd) }} />
      {config.faq.items.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
      )}
      <ReferralLanding
        config={config}
        logoUrl={theme.logoUrl || theme.minimalLogoUrl || ""}
        phone={phone}
        siteUrl={SITE_URL}
      />
    </>
  );
}
