import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaidLanding } from "@/components/landings/PaidLanding";
import { getLandingBySlug, getTheme } from "@/lib/store";

// Landing PAID (/lp/[slug]). Servida solo a tráfico de anuncios (Google/Meta):
// robots noindex/nofollow para no canibalizar el posicionamiento orgánico de
// las páginas de producto ni de las landings SEO. La copia y el layout se
// editan sin desplegar desde /admin/campanas/landings — ver lib/landings.ts.
//
// dynamic = "force-dynamic" para que cada visita respete la última config
// guardada en KV (el editor guarda con timestamp y no queremos que Next
// devuelva una versión vieja en caché tras un ajuste de última hora del
// equipo de paid).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const landing = await getLandingBySlug(params.slug, { onlyPublished: true });
  if (!landing) return {};
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    robots: { index: false, follow: false, nocache: true },
    // Facebook/Meta y WhatsApp sí pueden mostrar un preview del enlace en
    // publicaciones y mensajes — mantenemos OG básico para que se vea bien
    // (nunca aparecerá en Google porque va con noindex).
    openGraph: {
      title: landing.metaTitle,
      description: landing.metaDescription,
      images: landing.hero.imageUrl ? [{ url: landing.hero.imageUrl }] : undefined,
    },
  };
}

export default async function LpSlugPage({ params }: { params: { slug: string } }) {
  // Cargamos landing + logo del tema en paralelo. El logo lo edita el
  // equipo desde /admin/diseno/logos igual que el del resto de la web —
  // así la landing usa siempre la marca visual actual sin depender de
  // subir el logo aparte para esta ruta.
  const [landing, theme] = await Promise.all([
    getLandingBySlug(params.slug, { onlyPublished: true }),
    getTheme(),
  ]);
  if (!landing) notFound();
  return <PaidLanding landing={landing} logoUrl={theme.logoUrl || theme.minimalLogoUrl || ""} />;
}
