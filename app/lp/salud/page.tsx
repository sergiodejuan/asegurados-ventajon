import type { Metadata } from "next";
import { PaidLandingSalud } from "@/components/landings/PaidLandingSalud";
import { getPaidLandingSaludConfig, getTheme } from "@/lib/store";

// Landing PAID de salud. Servida solo a tráfico de anuncios (Google/Meta):
// robots noindex/nofollow para no canibalizar el orgánico de /seguro-de-salud
// ni las landings SEO/geo. La copia y el layout se editan sin desplegar
// desde /admin/campanas/lp-salud — ver lib/paidLandingSalud.ts.
//
// dynamic = "force-dynamic" para que cada visita respete la última config
// guardada en KV (el editor guarda con timestamp y no queremos que Next
// devuelva una versión vieja en caché tras un ajuste de última hora del
// equipo de paid).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPaidLandingSaludConfig();
  return {
    title: config.metaTitle,
    description: config.metaDescription,
    robots: { index: false, follow: false, nocache: true },
    // Facebook/Meta y WhatsApp sí pueden mostrar un preview del enlace en
    // publicaciones y mensajes — mantenemos OG básico para que se vea bien
    // (nunca aparecerá en Google porque va con noindex).
    openGraph: {
      title: config.metaTitle,
      description: config.metaDescription,
      images: config.hero.imageUrl ? [{ url: config.hero.imageUrl }] : undefined,
    },
  };
}

export default async function LpSaludPage() {
  // Cargamos config + logo del tema en paralelo. El logo lo edita el
  // equipo desde /admin/diseno/logos igual que el del resto de la web —
  // así la landing usa siempre la marca visual actual sin depender de
  // subir el logo aparte para esta ruta.
  const [config, theme] = await Promise.all([
    getPaidLandingSaludConfig(),
    getTheme(),
  ]);
  return <PaidLandingSalud config={config} logoUrl={theme.logoUrl || theme.minimalLogoUrl || ""} />;
}
