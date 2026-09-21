import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";
import { getSeoLandingPage, resolvePrice, getCombinedFaq, buildJsonLd } from "@/lib/seoLandingPages";
import { SITE_URL } from "@/lib/brand";
import { safeJsonLd } from "@/lib/safeJsonLd";

const page = getSeoLandingPage("las-palmas")!;

export const metadata: Metadata = {
  title: page.metaTitle,
  description: page.metaDescription,
  alternates: { canonical: page.path },
  robots: { index: true, follow: true },
  openGraph: { title: page.metaTitle, description: page.metaDescription, locale: "es_ES", type: "website" },
};

export default async function SeguroDeSaludLasPalmasPage() {
  const precio = await resolvePrice(page);
  const jsonLd = buildJsonLd(page, precio, getCombinedFaq(page), SITE_URL);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <SeoLandingPage page={page} precio={precio} />
    </>
  );
}
