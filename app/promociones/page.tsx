import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCta } from "@/components/StickyMobileCta";
import { PromotionCard } from "@/components/PromotionCard";
import { BRAND_NAME, SITE_URL } from "@/lib/brand";
import { listPromotions } from "@/lib/store";

const TITLE = `Promociones de seguros — ${BRAND_NAME}`;
const DESCRIPTION =
  "Descubre las promociones y ofertas activas de Asegurados Ventajon: mejor precio garantizado, condiciones especiales y descuentos en seguros de salud, vida, hogar, auto y decesos.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, locale: "es_ES", type: "website" },
};

// Página padre (listado), pensada para posicionar "promociones seguros" y la
// marca: contenido fijo y fuerte en SEO aquí, igual que /actualidad; lo
// editable desde /admin/promociones es cada promoción (la página hija).
export default async function PromocionesPage() {
  const promotions = await listPromotions({ onlyPublished: true });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Promociones", item: `${SITE_URL}/promociones` },
        ],
      },
      {
        "@type": "CollectionPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/promociones`,
      },
    ],
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main id="contenido">
        <section className="w-full bg-gradient-to-br from-navy to-navy-deep px-5 py-14 text-center text-white md:py-20">
          <span className="inline-flex items-center rounded-pill bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-white/80">
            Promociones
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-[32px] font-extrabold leading-[1.1] md:text-[44px]">
            Promociones de seguros de {BRAND_NAME}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-white/85 md:text-[17px]">
            Descubre las ofertas y condiciones especiales que tenemos activas ahora mismo para premiar a quien compara
            con nosotros: mejor precio garantizado, descuentos y ventajas en salud, vida, hogar, auto y decesos.
          </p>
        </section>

        <section aria-label="Promociones" className="mx-auto mt-14 max-w-app px-5 pb-14 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          {promotions.length === 0 ? (
            <p className="text-center text-[14px] text-slate2">Ahora mismo no hay promociones activas. Vuelve pronto.</p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {promotions.map((p) => <PromotionCard key={p.id} promo={p} />)}
            </ul>
          )}
        </section>

        <section className="mx-auto mt-4 max-w-app px-5 pb-14 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] bg-navy p-6 text-white md:flex md:items-center md:justify-between md:gap-10 md:p-12">
            <div>
              <h2 className="text-[22px] font-extrabold leading-tight md:text-[28px]">¿Empezamos?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/80 md:text-[16px]">
                Calcula tu precio en 1 minuto o deja que te llamemos. Sin coste ni compromiso.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-3 md:mt-0 md:flex-row md:shrink-0">
              <a href="/tarificador" className="flex items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep">Calcula tu precio</a>
              <a href="/quiero-que-me-llamen" className="flex items-center justify-center rounded-card border border-white/30 px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-white/10">Te llamamos gratis</a>
            </div>
          </div>
        </section>
      </main>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <Footer />
      <StickyMobileCta label="Calcula tu precio" href="/tarificador" secondaryLabel="Que te llamen" secondaryHref="/quiero-que-me-llamen" />
    </>
  );
}
