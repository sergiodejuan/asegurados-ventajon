import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { PRODUCT_PAGES } from "@/lib/productPages";
import { GEO_LANDING_PAGES } from "@/lib/geoLandingPages";
import { SEO_LANDING_PAGES } from "@/lib/seoLandingPages";
import { listPosts, listPromotions, listTestimonios, getPriceMatchLandingConfig } from "@/lib/store";

// Las landings de captación SEO (/seguro-de-salud-las-palmas, .../barato…)
// están hechas a propósito para no aparecer en el menú de navegación — se
// llega a ellas por buscadores o enlaces directos, no navegando por la web.
// Sin un sitemap se quedarían como páginas huérfanas (sin ningún enlace de
// entrada rastreable) y no llegarían a indexarse bien: este archivo es lo
// que las hace descubribles para Google sin necesidad de estar en el menú.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPosts({ onlyPublished: true }).catch(() => []);
  const promotions = await listPromotions({ onlyPublished: true }).catch(() => []);
  const testimonios = await listTestimonios({ onlyPublished: true }).catch(() => []);
  const priceMatch = await getPriceMatchLandingConfig().catch(() => null);

  const estaticas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/quienes-somos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/actualidad`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/promociones`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/testimonios`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/preguntas-frecuentes`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/recursos-seguros-canarias-baleares`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/mes-gratis`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/quiero-que-me-llamen`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/tarificador`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/tarificador-vida`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/tarificador-auto`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/tarificador-decesos`, changeFrequency: "monthly", priority: 0.6 },
  ];

  if (priceMatch?.robotsIndex !== false) {
    estaticas.push({ url: `${SITE_URL}/precio-mejor-garantizado`, changeFrequency: "weekly", priority: 0.8 });
  }

  const productos: MetadataRoute.Sitemap = PRODUCT_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`, changeFrequency: "monthly", priority: 0.8,
  }));

  const geo: MetadataRoute.Sitemap = GEO_LANDING_PAGES.map((g) => ({
    url: `${SITE_URL}${g.path}`, changeFrequency: "monthly", priority: 0.7,
  }));

  const seo: MetadataRoute.Sitemap = SEO_LANDING_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`, changeFrequency: "weekly", priority: 0.9,
  }));

  const blog: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/actualidad/${post.slug}`,
    lastModified: post.updatedAt || post.publishedAt || undefined,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  // Las promociones con enlace propio (ver lib/promotions.ts) solo
  // redirigen a esa URL, que ya se envía por su cuenta si corresponde
  // (p.ej. /mes-gratis arriba); no tiene sentido enviar la redirección.
  const promos: MetadataRoute.Sitemap = promotions
    .filter((promo) => !promo.linkExterno)
    .map((promo) => ({
      url: `${SITE_URL}/promociones/${promo.slug}`,
      lastModified: promo.updatedAt || promo.publishedAt || undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const testimoniosSitemap: MetadataRoute.Sitemap = testimonios.map((t) => ({
    url: `${SITE_URL}/testimonios/${t.slug}`,
    lastModified: t.updatedAt || t.publishedAt || undefined,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...estaticas, ...productos, ...geo, ...seo, ...blog, ...promos, ...testimoniosSitemap];
}
