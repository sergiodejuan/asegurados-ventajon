import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PromotionPage } from "@/components/PromotionPage";
import { DEFAULT_PROMOTIONS } from "@/lib/promotions";
import { getPromotionBySlug } from "@/lib/store";

// Las promociones con enlace propio (linkExterno) solo redirigen: si se
// pre-renderizan como estáticas, Next.js no emite una redirección HTTP
// real (falta la cabecera Location) y sirve el contenido del destino
// directamente bajo esta URL. Quedan fuera para que la página se resuelva
// en cada petición y el redirect() funcione correctamente.
export function generateStaticParams() {
  return DEFAULT_PROMOTIONS.filter((p) => !p.linkExterno).map((p) => ({ slug: p.slug }));
}

// Sin esto, la caché de ruta de Next.js puede servir una respuesta ya
// cacheada del redirect() sin la cabecera Location (bug conocido de
// Next.js con redirect() + caché de ruta) — con enlace propio configurado,
// el 307 quedaría "roto" para navegadores y buscadores reales.
export const dynamic = "force-dynamic";

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
  // Si ya tiene su propia landing en la web (ver lib/promotions.ts), esta
  // página no genera contenido propio: redirige ahí para no duplicarlo.
  if (promo.linkExterno) redirect(promo.linkExterno);
  return <PromotionPage promo={promo} />;
}
