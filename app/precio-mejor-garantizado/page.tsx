import type { Metadata } from "next";
import { PriceMatchLanding } from "@/components/landings/PriceMatchLanding";
import { getPriceMatchLandingConfig, getTheme } from "@/lib/store";
import { CALLER_NUMBERS } from "@/lib/brand";
import { SITE_URL } from "@/lib/brand";

// Landing "igualación de precio" — /precio-mejor-garantizado.
// A diferencia de /lp/salud, esta va INDEXABLE por defecto (robots.index
// configurable desde admin): tiene alto valor SEO en keywords long-tail que
// no cubre el resto del sitio ("igualar precio seguro salud", "cambiar
// seguro salud más barato"…) y compite en un espacio casi vacío.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPriceMatchLandingConfig();
  return {
    title: config.metaTitle,
    description: config.metaDescription,
    robots: config.robotsIndex
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    alternates: { canonical: `${SITE_URL}/precio-mejor-garantizado` },
    openGraph: {
      title: config.metaTitle,
      description: config.metaDescription,
      url: `${SITE_URL}/precio-mejor-garantizado`,
      images: config.hero.imageUrl ? [{ url: config.hero.imageUrl }] : undefined,
    },
  };
}

export default async function PriceMatchLandingPage() {
  const [config, theme] = await Promise.all([
    getPriceMatchLandingConfig(),
    getTheme(),
  ]);
  const phone = CALLER_NUMBERS[0]?.number || "";
  return (
    <PriceMatchLanding
      config={config}
      logoUrl={theme.logoUrl || theme.minimalLogoUrl || ""}
      phone={phone}
    />
  );
}
