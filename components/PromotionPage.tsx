import { Header } from "./Header";
import { Footer } from "./Footer";
import { StickyMobileCta } from "./StickyMobileCta";
import { PromotionCard } from "./PromotionCard";
import { Check, Phone, WhatsApp, ChevronRight } from "./icons";
import { CALLER_NUMBERS, SITE_URL } from "@/lib/brand";
import type { Promotion } from "@/lib/promotions";
import { otherPromotions } from "@/lib/store";

function telHref(n: string) {
  return "tel:" + n.replace(/[^\d+]/g, "");
}

// Página propia de una promoción ("/promociones/[slug]"), fiel al diseño de
// referencia (Línea Directa): foto de cabecera con titular superpuesto,
// tarjeta flotante con el CTA principal y la alternativa por teléfono, cuerpo
// del artículo y bases legales embebidas en una caja aparte.
export async function PromotionPage({ promo }: { promo: Promotion }) {
  const related = await otherPromotions(promo.id);
  const llamadmeHref = `/quiero-que-me-llamen${promo.producto ? `?producto=${promo.producto}` : ""}&utm_campaign=promo-${promo.slug}`;
  const pageUrl = `${SITE_URL}/promociones/${promo.slug}`;
  const telefono = CALLER_NUMBERS[0]?.number ?? "";

  return (
    <>
      <Header crumbs={[{ label: "Promociones", href: "/promociones" }, { label: promo.tituloTarjeta }]} />
      <main id="contenido">
        {/* HERO + tarjeta flotante */}
        <section className="relative mx-auto mt-6 max-w-app px-5 md:mb-28 md:mt-10 md:max-w-5xl lg:max-w-6xl">
          <div className="relative h-64 w-full overflow-hidden rounded-[24px] bg-navy-deep md:h-[420px]">
            {promo.imagenUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={promo.imagenUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-navy to-navy-deep" />
            )}
            {/* Degradado reforzado (estilo Línea Directa): ver nota en
                PromotionCard.tsx. */}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink from-0% via-ink/85 via-45% to-transparent to-95%" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:max-w-md md:p-10">
              <p className="text-[26px] font-extrabold leading-[1.1] text-white md:text-[36px]">{promo.h1}</p>
              {promo.validoHasta && <p className="mt-2 text-[13px] text-white/85 md:text-[14px]">{promo.validoHasta}</p>}
            </div>
          </div>

          {/* Tarjeta flotante: superpuesta en escritorio, apilada debajo (sin
              solapar el titular ni la foto) en móvil. */}
          <div className="relative mt-4 rounded-[20px] bg-white p-5 shadow-card md:absolute md:-bottom-16 md:right-8 md:mt-0 md:w-[300px]">
            <a
              href={promo.ctaHref}
              className="flex items-center justify-center gap-1.5 rounded-pill bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
            >
              {promo.ctaTexto}
              <ChevronRight width={16} height={16} />
            </a>

            {telefono && (
              <div className="mt-4 flex items-center gap-2.5 border-t border-hair pt-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mist text-navy">
                  <Phone width={16} height={16} />
                </span>
                <p className="text-[13px] leading-snug text-slate2">
                  ¿Prefieres por teléfono?
                  <br />
                  <a href={telHref(telefono)} className="font-bold text-emerald-600">{telefono}</a>
                </p>
              </div>
            )}

            <a
              href={llamadmeHref}
              className="mt-3 flex items-center justify-center rounded-pill bg-emerald-600 px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Llamadme gratis
            </a>
          </div>
        </section>

        <div className="mx-auto max-w-app px-5 py-10 md:max-w-3xl md:py-14">
          <h2 className="font-display text-[24px] font-extrabold leading-tight text-navy md:text-[30px]">{promo.subtitulo}</h2>

          {promo.introParrafos.filter(Boolean).map((p, i) => (
            <p key={i} className="mt-4 text-[15px] leading-relaxed text-ink">{p}</p>
          ))}

          {promo.bases.filter(Boolean).length > 0 && (
            <div className="mt-8 rounded-[20px] bg-mist p-5 md:p-6">
              <p className="text-[15px] font-bold text-navy">Bases:</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {promo.bases.filter(Boolean).map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check width={12} height={12} />
                    </span>
                    <span className="text-[14px] leading-relaxed text-ink">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Compartir */}
          <div className="mt-8 flex items-center gap-3 border-t border-hair pt-6">
            <p className="text-[13px] font-semibold text-ink">Compartir esta promoción</p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${promo.tituloTarjeta} — ${pageUrl}`)}`}
              target="_blank" rel="noopener noreferrer" aria-label="Compartir por WhatsApp"
              className="grid h-9 w-9 place-items-center rounded-full bg-mist text-navy transition-colors hover:bg-hair"
            >
              <WhatsApp className="text-[#25D366]" />
            </a>
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="mas-promociones" className="mx-auto mt-4 max-w-app px-5 pb-14 md:max-w-5xl lg:max-w-6xl">
            <h2 id="mas-promociones" className="text-[22px] font-extrabold text-navy md:text-[26px]">Más promociones</h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {related.map((p) => <PromotionCard key={p.id} promo={p} />)}
            </ul>
          </section>
        )}
      </main>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <Footer />
      <StickyMobileCta label={promo.ctaTexto} href={promo.ctaHref} secondaryLabel="Llamadme gratis" secondaryHref={llamadmeHref} />
    </>
  );
}
