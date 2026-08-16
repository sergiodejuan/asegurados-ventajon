import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getReferralByCode, getReferralLandingConfig, getTheme, getPaidLandingSaludConfig } from "@/lib/store";
import { PaidLandingSalud } from "@/components/landings/PaidLandingSalud";
import { SITE_URL } from "@/lib/brand";

// Landing personalizada del amigo (/r/{code}).
//
// El amigo llega desde el link que le compartió el referidor. Aquí:
//   1. Verificamos que el código existe y no está bloqueado.
//   2. Rehusamos indexarla (noindex). No queremos que Google indexe
//      páginas con "María P. te invita" — filtración de nombres.
//   3. Añadimos ?ref=CODE al href del CTA (lib/attribution.ts lo captura
//      en localStorage y lo propaga al POST /api/lead).
//
// Visualmente reutilizamos /lp/salud, con un banner personalizado sobre
// el hero que dice "{referidorNombre} te invita" + explicación del bono.
// Es la landing de conversión más ancha que tenemos — máxima probabilidad
// de que el amigo termine cotizando.

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const doc = await getReferralByCode(decodeURIComponent(params.slug)).catch(() => null);
  const nombre = doc?.referidorNombre ?? "Un amigo";
  return {
    title: `${nombre} te invita a Asegurados Ventajon — 20€ Amazon por cotizar`,
    description: "Recibe 20€ Amazon solo por pedir tu comparativa. Sin compromiso, sin contratar nada.",
    robots: { index: false, follow: false, nocache: true },
    alternates: { canonical: `${SITE_URL}/referidos` },
  };
}

export default async function ReferralPersonalPage({ params }: { params: { slug: string } }) {
  const code = decodeURIComponent(params.slug);
  const [doc, refConfig, saludConfig, theme] = await Promise.all([
    getReferralByCode(code).catch(() => null),
    getReferralLandingConfig(),
    getPaidLandingSaludConfig(),
    getTheme(),
  ]);

  // Código inexistente o bloqueado → redirect a landing genérica para no
  // regalar información sobre qué códigos son válidos.
  if (!doc || doc.bloqueado || !refConfig.programaActivo) {
    redirect("/referidos");
  }

  // Adaptamos la landing paid de salud: añadimos un kicker personal al
  // hero con "{nombre} te invita". La atribución ?ref=CODE se cuela en
  // localStorage vía captureAttribution al montar Analytics.tsx en el
  // cliente — no hay que redirigir a otra URL.
  const personalizedConfig = {
    ...saludConfig,
    hero: {
      ...saludConfig.hero,
      kicker: `${doc.referidorNombre} te invita · ${refConfig.incentivo.montoReferido}€ Amazon por cotizar`,
    },
  };

  return (
    <>
      {/* Inyectamos ?ref=CODE en la URL vía script mínimo — la landing
          en sí no necesita saber del código, pero captureAttribution
          (lib/attribution.ts) sí lo lee al montar y lo persiste. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `if (typeof window !== 'undefined' && window.location && window.location.search.indexOf('ref=') === -1) { const u = new URL(window.location.href); u.searchParams.set('ref', ${JSON.stringify(code)}); history.replaceState(null, '', u.toString()); }`,
        }}
      />
      <PaidLandingSalud
        config={personalizedConfig}
        logoUrl={theme.logoUrl || theme.minimalLogoUrl || ""}
      />
    </>
  );
}
