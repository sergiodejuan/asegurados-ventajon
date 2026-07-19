import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TestimonioStoryPage } from "@/components/TestimonioStoryPage";
import { SITE_URL } from "@/lib/brand";
import { getTestimonioBySlug } from "@/lib/store";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const testimonio = await getTestimonioBySlug(params.slug, { onlyPublished: true });
  if (!testimonio) return {};
  const title = testimonio.metaTitle || `${testimonio.nombre}: su historia`;
  const description = testimonio.metaDescription || testimonio.resumen;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/testimonios/${testimonio.slug}` },
    openGraph: {
      title, description, locale: "es_ES", type: "article",
      images: testimonio.fotoDestacada ? [{ url: testimonio.fotoDestacada }] : undefined,
    },
  };
}

export default async function TestimonioRoute({ params }: { params: { slug: string } }) {
  const testimonio = await getTestimonioBySlug(params.slug, { onlyPublished: true });
  if (!testimonio) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: { "@type": "Organization", name: "Asegurados Ventajon" },
    author: { "@type": "Person", name: testimonio.nombre },
    reviewBody: testimonio.resumen || testimonio.cita || undefined,
    ...(testimonio.publishedAt ? { datePublished: testimonio.publishedAt } : {}),
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TestimonioStoryPage testimonio={testimonio} />
    </>
  );
}
