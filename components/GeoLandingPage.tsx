import { Header } from "./Header";
import { Footer } from "./Footer";
import { StickyMobileCta } from "./StickyMobileCta";
import { Testimonials, EXAMPLE_TESTIMONIALS } from "./Testimonials";
import { FaqAccordion } from "./FaqAccordion";
import { Check, IconByName } from "./icons";
import { PartnerBadge } from "./PartnerBadge";
import { ECOSYSTEM_MEMBERS, PARTNERS, TRUST_STATS } from "@/lib/brand";
import { getProductPage } from "@/lib/productPages";
import type { GeoLandingPage as GeoLandingPageData } from "@/lib/geoLandingPages";
import { getTheme } from "@/lib/store";

// Landing geoposicionada de seguro de salud (una por isla/zona de Canarias):
// mismo producto y componentes base que /seguro-de-salud, con la cabecera,
// el precio, la sección local y el FAQ adaptados a la isla — ver
// lib/geoLandingPages.ts para el contenido de cada una.
export async function GeoLandingPage({ geo }: { geo: GeoLandingPageData }) {
  const base = getProductPage("salud")!;
  const theme = await getTheme();
  const heroImage = theme.heroImages.salud;
  const faq = [...base.faq, ...geo.localFaq];
  const localTestimonial = EXAMPLE_TESTIMONIALS.find((t) => t.place.includes(geo.islandName.split(" ")[0]));
  const testimonials = localTestimonial
    ? [localTestimonial, ...EXAMPLE_TESTIMONIALS.filter((t) => t !== localTestimonial)]
    : EXAMPLE_TESTIMONIALS;

  const benefits = base.benefits.map((b) =>
    b.icon === "pin" ? { ...b, d: `Trabajamos en toda España, con cercanía especial en ${geo.islandName}.` } : b
  );

  return (
    <>
      <Header showProgress />
      <main id="contenido">
        {/* HERO */}
        <section className="mx-auto max-w-app px-5 pt-8 md:max-w-5xl md:pt-16 lg:max-w-6xl">
          <div className="md:grid md:grid-cols-2 md:items-center md:gap-16">
            <div className="md:col-start-1 md:row-start-1">
              <a href="/seguro-de-salud" className="text-[12px] font-semibold text-slate2 underline">← Seguro de salud</a>
              <span className="mt-3 block w-fit rounded-pill bg-brand-red/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand-red">
                {geo.badge}
              </span>
              <h1 className="mt-4 text-[30px] font-extrabold leading-[1.1] tracking-tight text-navy md:text-[42px] lg:text-[48px]">
                {geo.h1}
              </h1>
              <p className="mt-3 text-[16px] leading-relaxed text-slate2 md:text-[18px] md:max-w-md">
                {geo.subheadline}
              </p>
              <p className="mt-4 text-[22px] font-extrabold text-navy md:text-[26px]">{geo.priceLine}</p>
            </div>

            <div
              role="img"
              aria-label={geo.badge}
              className="mt-6 h-52 overflow-hidden rounded-[24px] bg-gradient-to-br from-navy to-navy-deep text-white/90 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:h-full md:min-h-[380px]"
            >
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <IconByName name={base.heroIcon} width={64} height={64} />
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row md:col-start-1 md:row-start-2 md:mt-0">
              <a href={base.cta.href}
                className="flex items-center justify-center rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep sm:flex-1">
                {base.cta.label}
              </a>
              <a href={base.ctaSecondary.href}
                className="flex items-center justify-center rounded-card bg-navy px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-navy-deep sm:flex-1">
                {base.ctaSecondary.label}
              </a>
            </div>
            <p className="mt-3 text-[12px] font-medium text-slate2 md:col-start-1 md:row-start-3">
              Sin coste · Sin compromiso · {ECOSYSTEM_MEMBERS} en el ecosistema Ventajon
            </p>
          </div>
        </section>

        {/* BENEFICIOS */}
        <section aria-labelledby="beneficios" className="mt-14 md:mt-24">
          <div className="mx-auto max-w-app px-5 md:max-w-5xl lg:max-w-6xl">
            <h2 id="beneficios" className="text-[22px] font-extrabold text-navy md:text-[28px]">Por qué comparar con nosotros</h2>
          </div>
          <ul aria-label="Beneficios" className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:max-w-5xl md:grid md:grid-cols-4 md:snap-none md:overflow-visible md:px-5 md:pb-0 lg:max-w-6xl">
            {benefits.map((v) => (
              <li key={v.t} className="w-[230px] shrink-0 snap-start rounded-card border border-hair bg-white p-5 shadow-soft md:w-auto">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                  <IconByName name={v.icon} width={22} height={22} />
                </span>
                <p className="mt-4 text-[16px] font-bold text-ink">{v.t}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-slate2">{v.d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* LOCAL */}
        <section aria-labelledby="local" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] border border-hair bg-white p-6 shadow-soft md:p-10">
            <h2 id="local" className="text-[22px] font-extrabold text-navy md:text-[26px]">Seguro de salud pensado para {geo.islandName}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-slate2">{geo.localIntro}</p>
            <p className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-slate2">Comparamos tu código postal en</p>
            <ul className="mt-2 flex flex-wrap gap-2" translate="no">
              {geo.localidades.map((l) => (
                <li key={l} className="rounded-pill bg-mist px-3 py-1 text-[12px] font-semibold text-navy">{l}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* COBERTURA */}
        <section aria-labelledby="cobertura" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] border border-hair bg-white p-6 shadow-soft md:p-10">
            <h2 id="cobertura" className="text-[22px] font-extrabold text-navy md:text-[26px]">{base.coverage.title}</h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {base.coverage.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy/10 text-navy"><Check width={15} height={15} /></span>
                  <span className="text-[15px] font-medium text-ink">{b}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[12px] leading-relaxed text-slate2">
              La cobertura exacta depende de la póliza y compañía elegida; te la confirma tu asesor sin compromiso.
            </p>
          </div>
        </section>

        {/* CONFIANZA */}
        <section aria-labelledby="conf" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <h2 id="conf" className="text-[22px] font-extrabold text-navy md:text-[26px]">Comparamos entre las mejores</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
            Trabajamos con las principales aseguradoras del país para encontrar la que te conviene.
          </p>
          <ul className="mt-4 flex flex-wrap items-center gap-4" translate="no">
            {PARTNERS.map((p) => (
              <PartnerBadge key={p} name={p} logoUrl={theme.partnerLogos[p]} />
            ))}
          </ul>
          <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {TRUST_STATS.map((s) => (
              <li key={s.label} className="rounded-card border border-hair bg-white p-4 text-center shadow-soft">
                <p className="text-[20px] font-extrabold text-navy tnums">{s.value}</p>
                <p className="mt-1 text-[12px] leading-snug text-slate2">{s.label}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* TESTIMONIOS */}
        <Testimonials items={testimonials} />

        {/* FAQ */}
        <FaqAccordion items={faq} />

        {/* CTA final */}
        <section className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] bg-navy p-6 text-white md:flex md:items-center md:justify-between md:gap-10 md:p-12">
            <div>
              <h2 className="text-[22px] font-extrabold leading-tight md:text-[28px]">¿Empezamos?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/80 md:text-[16px]">
                Calcula tu precio en 1 minuto o deja que te llamemos. Sin compromiso.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-3 md:mt-0 md:flex-row md:shrink-0">
              <a href={base.cta.href} className="flex items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep">{base.cta.label}</a>
              <a href={base.ctaSecondary.href} className="flex items-center justify-center rounded-card border border-white/30 px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-white/10">Te llamamos gratis</a>
            </div>
          </div>
        </section>

        {/* SEO */}
        <section aria-labelledby="seo-heading" className="mx-auto mt-14 max-w-app px-5 pb-4 md:mt-24 md:max-w-2xl">
          <h2 id="seo-heading" className="text-[22px] font-extrabold text-navy md:text-[26px]">Todo sobre el seguro de salud en {geo.islandName}</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate2">{base.seo.intro}</p>
          {base.seo.sections.map((s) => (
            <div key={s.h2} className="mt-6">
              <h3 className="text-[16px] font-bold text-navy">{s.h2}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">{s.p}</p>
            </div>
          ))}
        </section>
      </main>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <Footer />
      <StickyMobileCta label={base.cta.label} href={base.cta.href} secondaryLabel={base.ctaSecondary.label} secondaryHref={base.ctaSecondary.href} />
    </>
  );
}
