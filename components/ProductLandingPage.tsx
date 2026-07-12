import { Header } from "./Header";
import { Footer } from "./Footer";
import { Check, ChevronDown, IconByName, Star } from "./icons";
import { BRAND_NAME, ECOSYSTEM_MEMBERS, PARTNERS } from "@/lib/brand";
import { PRODUCT_PAGES, TESTIMONIALS_PLACEHOLDER_NOTE, type ProductPage } from "@/lib/productPages";

const EXAMPLE_TESTIMONIALS = [
  { name: "Carmen R.", place: "Las Palmas de Gran Canaria", quote: "Me explicaron las opciones sin prisa y sin venderme nada de más. Se agradece." },
  { name: "Javier M.", place: "Palma de Mallorca", quote: "Comparé con lo que ya tenía y acabé pagando menos por más cobertura." },
  { name: "Ana T.", place: "Santa Cruz de Tenerife", quote: "Todo por teléfono, sin ir a ninguna oficina. Rápido y sin letra pequeña." },
];

export function ProductLandingPage({ page }: { page: ProductPage }) {
  const otros = PRODUCT_PAGES.filter((p) => p.slug !== page.slug);

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
            </div>

            <div
              role="img"
              aria-label={page.badge}
              className="mt-6 grid h-52 place-items-center overflow-hidden rounded-[24px] bg-gradient-to-br from-navy to-navy-deep text-white/90 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:h-full md:min-h-[380px]"
            >
              <IconByName name={page.heroIcon} width={64} height={64} />
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
          <ul className="mt-4 flex flex-wrap gap-2" translate="no">
            {PARTNERS.map((p) => (
              <li key={p} className="rounded-pill border border-hair bg-white px-3.5 py-1.5 text-[14px] font-semibold text-navy">{p}</li>
            ))}
          </ul>
        </section>

        {/* TESTIMONIOS */}
        <section aria-labelledby="testimonios" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <h2 id="testimonios" className="text-[22px] font-extrabold text-navy md:text-[26px]">Lo que dicen quienes ya han comparado</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {EXAMPLE_TESTIMONIALS.map((t) => (
              <li key={t.name} className="relative rounded-card border border-hair bg-white p-5 shadow-soft">
                <span className="absolute right-4 top-4 rounded-pill bg-mist px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate2">Ejemplo</span>
                <div className="flex gap-0.5 text-brand-red" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} />)}
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-ink">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-3 text-[13px] font-semibold text-navy">{t.name} <span className="font-normal text-slate2">· {t.place}</span></p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-slate2">{TESTIMONIALS_PLACEHOLDER_NOTE}</p>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-3xl">
          <h2 id="faq" className="text-[22px] font-extrabold text-navy md:text-[26px]">Preguntas frecuentes</h2>
          <div className="mt-5 flex flex-col gap-2">
            {page.faq.map((f) => (
              <details key={f.q} className="group rounded-card border border-hair bg-white px-5 py-4 open:shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-ink marker:content-none">
                  {f.q}
                  <span aria-hidden="true" className="shrink-0 text-navy transition-transform group-open:rotate-180">
                    <ChevronDown width={18} height={18} />
                  </span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-slate2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

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
      <Footer />
    </>
  );
}
