import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PaidTarificadorSalud } from "@/components/landings/PaidTarificadorSalud";
import { getLandingBySlug, getTheme } from "@/lib/store";
import { buildTarificadorHref } from "@/lib/landings";
import { BRAND_NAME } from "@/lib/brand";

// Tarificador de una landing paid (/lp/[slug]/tarificador). Solo las
// landings de producto "salud" tienen aquí el wizard embebido propio (varias
// modalidades, mínima fricción) — para el resto de ramas no se reinventa un
// tarificador nuevo: se redirige directo al tarificador de página completa
// ya existente del site (o a "quiero que me llamen" para hogar, que no
// tiene tarificador propio), con la UTM y el slug de esta landing para
// poder atribuir el lead.
//
// dynamic = "force-dynamic": incluso en el caso "salud" (sin redirect) se
// mantiene por el mismo motivo que el resto de /lp/[slug]/* — reflejar la
// última config guardada en KV sin caché de ruta.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const landing = await getLandingBySlug(params.slug, { onlyPublished: true });
  if (!landing) return {};
  return {
    title: `Calcula tu seguro — ${BRAND_NAME}`,
    description: landing.metaDescription,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function LpSlugTarificadorPage({ params }: { params: { slug: string } }) {
  const landing = await getLandingBySlug(params.slug, { onlyPublished: true });
  if (!landing) notFound();

  if (landing.producto !== "salud") {
    redirect(buildTarificadorHref(landing));
  }

  const theme = await getTheme();
  return (
    <PaidTarificadorSalud
      phone={landing.phone}
      logoUrl={theme.logoUrl || theme.minimalLogoUrl || ""}
      slug={landing.slug}
    />
  );
}
