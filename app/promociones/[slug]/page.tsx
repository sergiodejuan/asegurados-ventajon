import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PromotionPage } from "@/components/PromotionPage";
import { DEFAULT_PROMOTIONS } from "@/lib/promotions";
import { getPromotionBySlug } from "@/lib/store";

export function generateStaticParams() {
  return DEFAULT_PROMOTIONS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const promo = await getPromotionBySlug(params.slug, { onlyPublished: true });
  if (!promo) return {};
  return {
    title: promo.metaTitle || promo.tituloTarjeta,
    description: promo.metaDescription || promo.subtitulo,
  };
}

export default async function PromocionRoute({ params }: { params: { slug: string } }) {
  const promo = await getPromotionBySlug(params.slug, { onlyPublished: true });
  if (!promo) notFound();
  return <PromotionPage promo={promo} />;
}
