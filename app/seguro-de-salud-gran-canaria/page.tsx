import type { Metadata } from "next";
import { GeoLandingPage } from "@/components/GeoLandingPage";
import { getGeoLandingPage } from "@/lib/geoLandingPages";
import { getProductPage } from "@/lib/productPages";
import { BRAND_NAME, SITE_URL } from "@/lib/brand";
import { safeJsonLd } from "@/lib/safeJsonLd";

const geo = getGeoLandingPage("gran-canaria")!;
const base = getProductPage("salud")!;

export const metadata: Metadata = {
  title: geo.metaTitle,
  description: geo.metaDescription,
  alternates: { canonical: geo.path },
  robots: { index: true, follow: true },
  openGraph: { title: geo.metaTitle, description: geo.metaDescription, locale: "es_ES", type: "website" },
};

export default function SeguroDeSaludGranCanariaPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "InsuranceAgency",
        name: BRAND_NAME,
        url: `${SITE_URL}${geo.path}`,
        areaServed: geo.localidades.map((l) => ({ "@type": "City", name: l })),
        description: geo.metaDescription,
      },
      {
        "@type": "FAQPage",
        mainEntity: [...base.faq, ...geo.localFaq].map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Seguro de salud", item: `${SITE_URL}/seguro-de-salud` },
          { "@type": "ListItem", position: 3, name: geo.badge, item: `${SITE_URL}${geo.path}` },
        ],
      },
    ],
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <GeoLandingPage geo={geo} />
    </>
  );
}
