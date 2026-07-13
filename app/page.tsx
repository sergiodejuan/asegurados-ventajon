import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCta } from "@/components/StickyMobileCta";
import { CoverageTabs } from "@/components/CoverageTabs";
import { CampaignBanner } from "@/components/CampaignBanner";
import { Testimonials } from "@/components/Testimonials";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Check, IconByName, ArrowRight } from "@/components/icons";
import { CompanyLogo } from "@/components/Comparativa";
import { PARTNERS, ECOSYSTEM_MEMBERS, VENTAJAS, TRUST_STATS } from "@/lib/brand";
import { PRODUCT_PAGES } from "@/lib/productPages";
import { getTheme } from "@/lib/store";

const PRODUCT_BLURBS: Record<string, string> = {
  salud: "Con o sin copago. Calcula tu precio al instante.",
  vida: "Protege a los tuyos y tu hipoteca.",
  decesos: "Tranquilidad para tu familia, sin tabúes.",
  hogar: "Tu vivienda cubierta al mejor precio.",
  auto: "A terceros o a todo riesgo, comparado por un experto.",
};

const FAQ_GENERAL = [
  { q: "¿Sois una aseguradora?", a: "No. Somos correduría de seguros: comparamos entre varias compañías para encontrar la que mejor se ajusta a ti, no vendemos un único producto." },
  { q: "¿Cuánto cuesta compararse con vosotros?", a: "Nada. La comparativa y el asesoramiento son 100% gratuitos y sin compromiso de contratación." },
  { q: "¿Qué seguros comparáis?", a: "Salud, vida, decesos, hogar y auto, entre las principales aseguradoras del país: Mapfre, Adeslas, Asisa, Zurich y Generali." },
  { q: "¿Cómo me contactáis?", a: "Como prefieras: por teléfono, WhatsApp o completando el formulario online. Tú eliges cuándo y cómo." },
  { q: "¿En qué zonas trabajáis?", a: "Trabajamos en toda España, con atención especialmente cercana en Canarias y Baleares." },
];

export default async function Home() {
  const theme = await getTheme();
  const heroImage = theme.heroImages.home;
  return (
    <>
      <Header />

      <main id="contenido">
        {/* HERO */}
        <section className="mx-auto max-w-app px-5 pt-8 md:max-w-5xl md:pt-16 lg:max-w-6xl">
          <div className="md:grid md:grid-cols-2 md:items-center md:gap-16">
            <div className="md:col-start-1 md:row-start-1">
              <span className="inline-flex items-center rounded-pill bg-brand-red/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand-red">
                Correduría de seguros
              </span>
              <h1 className="mt-4 text-[34px] font-extrabold leading-[1.05] tracking-tight text-navy md:text-[48px] lg:text-[56px]">
                Asegurarte bien<br />es de listos
              </h1>
              <p className="mt-3 text-[16px] leading-relaxed text-slate2 md:text-[18px] md:max-w-md">
                Comparamos tu seguro de salud, vida, decesos, hogar y auto entre las mejores compañías
                para que pagues lo justo. Sin trucos, sin letra pequeña.
              </p>
            </div>

            {/* Imagen de marca: editable desde /admin/diseno; si no hay foto, placeholder con icono */}
            <div
              role="img"
              aria-label="Comparamos tu seguro entre las mejores compañías"
              className="mt-6 h-52 overflow-hidden rounded-[24px] bg-gradient-to-br from-navy to-navy-deep text-white/90 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:h-full md:min-h-[420px]"
            >
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <IconByName name="compare" width={64} height={64} />
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row md:col-start-1 md:row-start-2 md:mt-0">
              <a href="/tarificador"
                className="flex items-center justify-center rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep sm:flex-1">
                Calcula tu precio
              </a>
              <a href="/quiero-que-me-llamen"
                className="flex items-center justify-center rounded-card bg-navy px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-navy-deep sm:flex-1">
                Te llamamos gratis
              </a>
            </div>
            <p className="mt-3 text-[12px] font-medium text-slate2 md:col-start-1 md:row-start-3">
              Sin coste · Sin compromiso · {ECOSYSTEM_MEMBERS} en el ecosistema Ventajon
            </p>
          </div>
        </section>

        {/* ESTADÍSTICAS DE CONFIANZA */}
        <section aria-label="Datos de Asegurados Ventajon" className="mx-auto mt-10 max-w-app px-5 md:mt-16 md:max-w-5xl lg:max-w-6xl">
          <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-hair bg-white p-5 shadow-soft md:grid-cols-4 md:gap-6 md:p-8">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-[26px] font-extrabold tnums text-navy md:text-[32px]">{s.value}</p>
                <p className="mt-1 text-[12px] leading-snug text-slate2 md:text-[13px]">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ELIGE TU SEGURO (carrusel en mobile, grid en escritorio) */}
        <section aria-labelledby="elige" className="mt-14 md:mt-24">
          <div className="mx-auto max-w-app px-5 md:max-w-5xl lg:max-w-6xl">
            <h2 id="elige" className="text-[24px] font-extrabold text-navy md:text-[30px]">Elige tu seguro</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
              Comparamos entre las mejores compañías para cada producto. Tú eliges por dónde empezar.
            </p>
          </div>
          <ul aria-label="Productos" className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:max-w-5xl md:grid md:grid-cols-3 md:snap-none md:overflow-visible md:px-5 md:pb-0 lg:max-w-6xl lg:grid-cols-5">
            {PRODUCT_PAGES.map((p) => (
              <li key={p.slug} className="flex w-[230px] shrink-0 snap-start flex-col rounded-card border border-hair bg-white p-5 shadow-soft md:w-auto">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                  <IconByName name={p.heroIcon} width={22} height={22} />
                </span>
                <p className="mt-4 text-[16px] font-bold text-ink">{p.badge}</p>
                <p className="mt-1 flex-1 text-[13px] leading-relaxed text-slate2">{PRODUCT_BLURBS[p.slug]}</p>
                <a href={p.path} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy">
                  Ver {p.badge.toLowerCase()} <ArrowRight width={14} height={14} />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <CampaignBanner />

        {/* VENTAJAS (carrusel en mobile, grid en escritorio) */}
        <section aria-labelledby="ventajas" className="mt-14 md:mt-24">
          <div className="mx-auto max-w-app px-5 md:max-w-5xl lg:max-w-6xl">
            <h2 id="ventajas" className="text-[24px] font-extrabold text-navy md:text-[30px]">Por qué elegirnos</h2>
          </div>
          <ul aria-label="Ventajas" className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:max-w-5xl md:grid md:grid-cols-4 md:snap-none md:overflow-visible md:px-5 md:pb-0 lg:max-w-6xl">
            {VENTAJAS.map((v) => (
              <li key={v.t} className="w-[240px] shrink-0 snap-start rounded-card border border-hair bg-white p-5 shadow-soft md:w-auto">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                  <IconByName name={v.icon} width={22} height={22} />
                </span>
                <p className="mt-4 text-[17px] font-bold text-ink">{v.t}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-slate2">{v.d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* SEGURO DE SALUD, EN DETALLE (producto estrella: tarificador al instante) */}
        <section aria-labelledby="cob" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="md:mx-auto md:max-w-2xl md:text-center">
            <h2 id="cob" className="text-[24px] font-extrabold leading-tight text-navy md:text-[30px]">
              Nuestro seguro de salud, en detalle
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
              Nuestro producto con más demanda: calcula tu precio real al instante, con o sin copago.
            </p>
          </div>
          <div className="mt-6 md:mx-auto md:max-w-2xl"><CoverageTabs /></div>
        </section>

        {/* CONFIANZA + COMPAÑÍAS */}
        <section aria-labelledby="conf" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="md:grid md:grid-cols-[1.1fr_1fr] md:items-start md:gap-16">
            <div>
              <h2 id="conf" className="text-[24px] font-extrabold text-navy md:text-[30px]">Comparamos entre las mejores</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
                Trabajamos con las principales aseguradoras del país para encontrar la que te conviene.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2" translate="no">
                {PARTNERS.map((p) => (
                  <li key={p} className="flex items-center gap-2 rounded-pill border border-hair bg-white px-3.5 py-1.5 text-[14px] font-semibold text-navy">
                    <CompanyLogo logoUrl={theme.partnerLogos[p]} compania={p} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <ul className="mt-6 flex flex-col gap-3 md:mt-0">
              {["De tu lado, no de la compañía.", "Sin trucos, sin letra pequeña.", `Parte del ecosistema Ventajon, con ${ECOSYSTEM_MEMBERS}.`].map((c) => (
                <li key={c} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy/10 text-navy"><Check width={15} height={15} /></span>
                  <span className="text-[15px] font-medium text-ink">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* TESTIMONIOS */}
        <Testimonials />

        {/* FAQ GENERAL */}
        <FaqAccordion heading="Preguntas frecuentes" items={FAQ_GENERAL} />

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
