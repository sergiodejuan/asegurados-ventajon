import type { Metadata } from "next";
import { PaidTarificadorSalud } from "@/components/landings/PaidTarificadorSalud";
import { getPaidLandingSaludConfig, getTheme } from "@/lib/store";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

// Tarificador exclusivo de /lp/salud/tarificador. Convive con el /tarificador
// estándar sin sustituirlo: este va con noindex y su source propio en el CRM
// (tarificador-salud-lp) para medir el ROI de las campañas paid aparte.
export async function generateMetadata(): Promise<Metadata> {
  const config = await getPaidLandingSaludConfig();
  return {
    title: `Calcula tu seguro de salud — ${BRAND_NAME}`,
    description: config.metaDescription,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function LpSaludTarificadorPage() {
  const [config, theme] = await Promise.all([
    getPaidLandingSaludConfig(),
    getTheme(),
  ]);
  return (
    <PaidTarificadorSalud
      phone={config.phone}
      logoUrl={theme.logoUrl || theme.minimalLogoUrl || ""}
    />
  );
}
