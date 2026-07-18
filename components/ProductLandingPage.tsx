import { Header } from "./Header";
import { Footer } from "./Footer";
import { StickyMobileCta } from "./StickyMobileCta";
import { Testimonials } from "./Testimonials";
import { FaqAccordion } from "./FaqAccordion";
import { Check, IconByName } from "./icons";
import { PartnerBadge } from "./PartnerBadge";
import { SocialProofBadge } from "./SocialProofBadge";
import { ECOSYSTEM_MEMBERS, PARTNERS } from "@/lib/brand";
import { PRODUCT_PAGES, type ProductPage } from "@/lib/productPages";
import { GEO_LANDING_PAGES } from "@/lib/geoLandingPages";
import { getTheme } from "@/lib/store";

export async function ProductLandingPage({ page }: { page: ProductPage }) {
  const otros = PRODUCT_PAGES.filter((p) => p.slug !== page.slug);
  const theme = await getTheme();
  const heroImage = theme.heroImages[page.slug];

  return (
    <>
      <Header showProgress />
      <main id="contenido">
        {/* HERO */}
        <section className="mx-auto max-w-app px-5 pt-8 md:max-w-5xl md:pt-16 lg:max-w-6xl">
          <div className="md:grid md:grid-cols-2 md:items-center md:gap-16">
            <div className="md:col-start-1 md:row-start-1">
              <span className="inline-flex items-center rounded-pill bg-brand-red/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand-red">
                {page.badge}
              </span>
              <h1 className="mt-4 text-[32px] font-extrabold leading-[1.1] tracking-tight text-navy md:text-[44px] lg:text-[52px]">
                {page.h1}
              </h1>
              <p className="mt-3 text-[16px] leading-relaxed text-slate2 md:text-[18px] md:max-w-md">
                {page.subheadline}
              </p>
              <SocialProofBadge />
            </div>

            <div
              role="img"
              aria-label={page.badge}
              className="mt-6 h-52 overflow-hidden rounded-[24px] bg-gradient-to-br from-navy to-navy-deep text-white/90 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:h-full md:min-h-[380px]"
            >
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <IconByName name={page.heroIcon} width={64} height={64} />
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row md:col-start-1 md:row-start-2 md:mt-0">
              <a href={page.cta.href}
                className="flex items-center justify-center rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep sm:flex-1">
                {page.cta.label}
              </a>
              <a href={page.ctaSecondary.href}
                className="flex items-center justify-center rounded-card bg-navy px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-navy-deep sm:flex-1">
                {page.ctaSecondary.label}
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
            {page.benefits.map((v) => (
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

        {/* COBERTURA */}
        <section aria-labelledby="cobertura" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] border border-hair bg-white p-6 shadow-soft md:p-10">
            <h2 id="cobertura" className="text-[22px] font-extrabold text-navy md:text-[26px]">{page.coverage.title}</h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {page.coverage.bullets.map((b) => (
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
        </section>

        {/* SALUD POR ISLA (solo en la página de salud) */}
        {page.slug === "salud" && (
          <section aria-labelledby="por-isla" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
            <h2 id="por-isla" className="text-[18px] font-bold text-navy">Seguro de salud por isla en Canarias</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {GEO_LANDING_PAGES.map((g) => (
                <li key={g.slug}>
                  <a href={g.path} className="inline-flex items-center rounded-pill border border-hair bg-white px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:bg-mist">
                    {g.islandName}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* TESTIMONIOS */}
        <Testimonials />

        {/* FAQ */}
        <FaqAccordion items={page.faq} />

        {/* CTA final */}
        <section className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] bg-navy p-6 text-white md:flex md:items-center md:justify-between md:gap-10 md:p-12">
            <div>
              <h2 className="text-[22px] font-extrabold leading-tight md:text-[28px]">¿Empezamos?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/80 md:text-[16px]">
                {page.cta.href.startsWith("/tarificador")
                  ? "Calcula tu precio en 1 minuto o deja que te llamemos. Sin compromiso."
                  : "Un asesor te llama y compara por ti. Sin coste ni compromiso."}
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-3 md:mt-0 md:flex-row md:shrink-0">
              <a href={page.cta.href} className="flex items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep">{page.cta.label}</a>
              <a href="/quiero-que-me-llamen" className="flex items-center justify-center rounded-card border border-white/30 px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-white/10">Te llamamos gratis</a>
            </div>
          </div>
        </section>

        {/* SEO */}
        <section aria-labelledby="seo-heading" className="mx-auto mt-14 max-w-app px-5 pb-4 md:mt-24 md:max-w-2xl">
          <h2 id="seo-heading" className="text-[22px] font-extrabold text-navy md:text-[26px]">Todo sobre el {page.badge.toLowerCase()}</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate2">{page.seo.intro}</p>
          {page.seo.sections.map((s) => (
            <div key={s.h2} className="mt-6">
              <h3 className="text-[16px] font-bold text-navy">{s.h2}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">{s.p}</p>
            </div>
          ))}
        </section>

        {/* OTROS PRODUCTOS */}
        <section aria-labelledby="otros" className="mt-14 md:mt-24">
          <div className="mx-auto max-w-app px-5 md:max-w-5xl lg:max-w-6xl">
            <h2 id="otros" className="text-[22px] font-extrabold text-navy md:text-[26px]">También comparamos</h2>
          </div>
          <ul aria-label="Otros productos" className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:max-w-5xl md:grid md:grid-cols-4 md:snap-none md:overflow-visible md:px-5 md:pb-0 lg:max-w-6xl">
            {otros.map((p) => (
              <li key={p.slug} className="flex w-[200px] shrink-0 snap-start flex-col rounded-card border border-hair bg-white p-4 shadow-soft md:w-auto">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                  <IconByName name={p.heroIcon} width={18} height={18} />
                </span>
                <p className="mt-3 text-[14px] font-bold text-ink">{p.badge}</p>
                <a href={p.path} className="mt-3 text-[13px] font-semibold text-navy underline">Ver más</a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <Footer />
      <StickyMobileCta label={page.cta.label} href={page.cta.href} secondaryLabel={page.ctaSecondary.label} secondaryHref={page.ctaSecondary.href} />
    </>
  );
}
