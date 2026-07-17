import type { Metadata } from "next";
import { GeoLandingPage } from "@/components/GeoLandingPage";
import { getGeoLandingPage } from "@/lib/geoLandingPages";
import { getProductPage } from "@/lib/productPages";
import { BRAND_NAME } from "@/lib/brand";

const geo = getGeoLandingPage("lanzarote-fuerteventura")!;
const base = getProductPage("salud")!;

export const metadata: Metadata = {
  title: geo.metaTitle,
  description: geo.metaDescription,
  robots: { index: true, follow: true },
  openGraph: { title: geo.metaTitle, description: geo.metaDescription, locale: "es_ES", type: "website" },
};

export default function SeguroDeSaludLanzaroteFuerteventuraPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "InsuranceAgency",
        name: BRAND_NAME,
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
    ],
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GeoLandingPage geo={geo} />
    </>
  );
}
