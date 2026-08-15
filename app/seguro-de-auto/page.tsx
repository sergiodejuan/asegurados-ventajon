import type { Metadata } from "next";
import { ProductLandingPage } from "@/components/ProductLandingPage";
import { getProductPage, buildProductJsonLd } from "@/lib/productPages";
import { BRAND_NAME, SITE_URL } from "@/lib/brand";
import { safeJsonLd } from "@/lib/safeJsonLd";

const page = getProductPage("auto")!;

export const metadata: Metadata = {
  title: page.metaTitle,
  description: page.metaDescription,
  alternates: { canonical: page.path },
  robots: { index: true, follow: true },
  openGraph: { title: page.metaTitle, description: page.metaDescription, locale: "es_ES", type: "website" },
};

export default function SeguroDeAutoPage() {
  const jsonLd = buildProductJsonLd(page, BRAND_NAME, SITE_URL);
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <ProductLandingPage page={page} />
    </>
  );
}
