import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCta } from "@/components/StickyMobileCta";
import { Testimonials } from "@/components/Testimonials";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Check, IconByName } from "@/components/icons";
import { BRAND_NAME, PARTNERS, ECOSYSTEM_MEMBERS, VENTAJAS, TRUST_STATS } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Quiénes somos — ${BRAND_NAME}`,
  description: "Somos una correduría de seguros que compara entre las principales aseguradoras de España. Descubre el ecosistema Ventajon y por qué trabajamos de tu lado, en toda España.",
};

const PROCESO = [
  { n: "1", t: "Cuéntanos qué necesitas", d: "Un formulario de un minuto o una llamada, como prefieras." },
  { n: "2", t: "Comparamos por ti", d: "Entre las mejores aseguradoras del país, con tus datos reales." },
  { n: "3", t: "Te llamamos con tu propuesta", d: "Sin letra pequeña: te explicamos qué cubre y qué no." },
  { n: "4", t: "Eliges sin compromiso", d: "Tú decides si contratar, cambiar o esperar. Nunca hay presión." },
];

const REGIONES = [
  "Madrid", "Cataluña", "Andalucía", "Comunidad Valenciana", "Canarias", "Islas Baleares", "País Vasco", "Galicia", "Castilla y León", "Castilla-La Mancha", "Aragón", "Murcia",
];

const FAQ_QUIENES_SOMOS = [
  { q: "¿Sois una aseguradora?", a: "No. Somos correduría de seguros: un intermediario independiente que compara entre varias aseguradoras para encontrar la que mejor se ajusta a ti. No vendemos un único producto ni representamos a una sola compañía." },
  { q: "¿Qué es el ecosistema Ventajon?", a: "Es la comunidad de socios y clientes a la que pertenece Asegurados Ventajon, con más poder de negociación frente a las aseguradoras y condiciones que, en solitario, serían más difíciles de conseguir. Formar parte de este ecosistema es lo que nos permite comparar con ventaja real para ti." },
  { q: "¿En qué zonas de España trabajáis?", a: "En toda España. Todo nuestro proceso es online y por teléfono, así que da igual dónde vivas; eso sí, tenemos una cercanía especial con Canarias y Baleares, de donde parte nuestro equipo." },
  { q: "¿Cómo ganáis dinero si comparar es gratis?", a: "Cobramos una comisión a la aseguradora que finalmente elijas, como cualquier correduría. Nunca cobramos al cliente por comparar ni por el asesoramiento, y eso no cambia el precio que tú pagas por tu póliza." },
  { q: "¿Con qué aseguradoras trabajáis?", a: "Con las principales compañías del país: Mapfre, Adeslas, Asisa, Zurich y Generali, entre otras. Seguimos ampliando acuerdos para ofrecerte siempre más opciones donde comparar." },
];

export default function QuienesSomos() {
  return (
    <>
      <Header />
      <main id="contenido">
        {/* HERO */}
        <section className="mx-auto max-w-app px-5 pt-8 md:max-w-5xl md:pt-16 lg:max-w-6xl">
          <div className="md:grid md:grid-cols-2 md:items-center md:gap-16">
            <div className="md:col-start-1 md:row-start-1">
              <span className="inline-flex items-center rounded-pill bg-brand-red/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand-red">
                Quiénes somos
              </span>
              <h1 className="mt-4 text-[32px] font-extrabold leading-[1.1] tracking-tight text-navy md:text-[44px] lg:text-[52px]">
                El ecosistema que compara por ti, en toda España
              </h1>
              <p className="mt-3 text-[16px] leading-relaxed text-slate2 md:text-[18px] md:max-w-md">
                Somos una correduría de seguros aliada con las principales compañías del país. No vendemos un único
                producto: comparamos por ti para que pagues lo justo, sin trucos ni letra pequeña.
              </p>
            </div>
            <div
              role="img"
              aria-label="El ecosistema Ventajon, aliado con las principales aseguradoras"
              className="mt-6 grid h-52 place-items-center overflow-hidden rounded-[24px] bg-gradient-to-br from-navy to-navy-deep text-white/90 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:h-full md:min-h-[380px]"
            >
              <IconByName name="compare" width={64} height={64} />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row md:col-start-1 md:row-start-2 md:mt-0">
              <a href="/tarificador" className="flex items-center justify-center rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep sm:flex-1">Calcula tu precio</a>
              <a href="/quiero-que-me-llamen" className="flex items-center justify-center rounded-card bg-navy px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-navy-deep sm:flex-1">Te llamamos gratis</a>
            </div>
          </div>
        </section>

        {/* ESTADÍSTICAS */}
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

        {/* QUIÉNES SOMOS */}
        <section aria-labelledby="quienes" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="md:grid md:grid-cols-2 md:items-center md:gap-16">
            <div>
              <h2 id="quienes" className="text-[24px] font-extrabold text-navy md:text-[30px]">Quiénes somos</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
                Asegurados Ventajon nació con una idea sencilla: comparar seguros no debería ser complicado ni estar
                sesgado hacia el interés de una única compañía. Somos correduría de seguros, lo que significa que
                trabajamos para ti, no para una aseguradora concreta.
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
                Empezamos con cercanía en Canarias y Baleares, y hoy trabajamos con clientes en todo el territorio
                nacional: todo nuestro proceso es online y por teléfono, así que da igual desde dónde nos escribas.
              </p>
            </div>
            <ul className="mt-6 flex flex-col gap-3 md:mt-0">
              {[
                "Correduría independiente, no agentes de una única aseguradora.",
                "Comparamos entre varias compañías con cada cliente.",
                "Sin coste ni compromiso por comparar.",
                "100% online: todo por teléfono o WhatsApp, sin desplazamientos.",
              ].map((c) => (
                <li key={c} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy/10 text-navy"><Check width={15} height={15} /></span>
                  <span className="text-[15px] font-medium text-ink">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ECOSISTEMA VENTAJON */}
        <section aria-labelledby="ecosistema" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] border border-hair bg-white p-6 shadow-soft md:p-10">
            <h2 id="ecosistema" className="text-[24px] font-extrabold text-navy md:text-[30px]">El ecosistema Ventajon</h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate2 md:text-[16px]">
              Asegurados Ventajon forma parte de un ecosistema más amplio, con {ECOSYSTEM_MEMBERS}. Pertenecer a esta
              comunidad nos da algo que una correduría pequeña e independiente difícilmente conseguiría en solitario:
              más poder de negociación frente a las aseguradoras y condiciones exclusivas que trasladamos directamente
              a ti.
            </p>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                "Mayor poder de negociación frente a las aseguradoras.",
                "Condiciones y coberturas exclusivas del ecosistema.",
                "Acompañamiento personalizado en cada comparativa.",
                `Una comunidad de ${ECOSYSTEM_MEMBERS} que ya confía en el modelo.`,
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red"><Check width={15} height={15} /></span>
                  <span className="text-[15px] font-medium text-ink">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ALIANZA CON ASEGURADORAS LÍDERES */}
        <section aria-labelledby="alianza" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <h2 id="alianza" className="text-[24px] font-extrabold text-navy md:text-[30px]">Aliados con las aseguradoras líderes de España</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate2 md:text-[16px] md:max-w-2xl">
            No trabajamos con una única marca: comparamos entre varias de las compañías más solventes del país, para
            que la decisión final sea tuya, con toda la información encima de la mesa.
          </p>
          <ul className="mt-5 flex flex-wrap gap-3" translate="no">
            {PARTNERS.map((p) => (
              <li key={p} className="rounded-pill border border-hair bg-white px-5 py-2.5 text-[15px] font-bold text-navy shadow-soft">{p}</li>
            ))}
          </ul>
        </section>

        {/* CÓMO TRABAJAMOS */}
        <section aria-labelledby="proceso" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <h2 id="proceso" className="text-[24px] font-extrabold text-navy md:text-[30px]">Cómo trabajamos</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-4">
            {PROCESO.map((p) => (
              <li key={p.n} className="rounded-card border border-hair bg-white p-5 shadow-soft">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-[14px] font-extrabold text-white">{p.n}</span>
                <p className="mt-4 text-[15px] font-bold text-ink">{p.t}</p>
                <p className="mt-1 text-[13px] leading-snug text-slate2">{p.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* VENTAJAS */}
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

        {/* COBERTURA NACIONAL */}
        <section aria-labelledby="nacional" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] bg-mist p-6 md:p-10">
            <h2 id="nacional" className="text-[24px] font-extrabold text-navy md:text-[30px]">Presencia en toda España</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate2 md:text-[16px]">
              Al ser un servicio 100% online y telefónico, trabajamos con clientes en todas las comunidades autónomas,
              entre ellas:
            </p>
            <ul className="mt-4 flex flex-wrap gap-2" translate="no">
              {REGIONES.map((r) => (
                <li key={r} className="rounded-pill border border-hair bg-white px-3.5 py-1.5 text-[13px] font-semibold text-navy">{r}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* TESTIMONIOS */}
        <Testimonials heading="Lo que dicen quienes ya han comparado con nosotros" />

        {/* FAQ */}
        <FaqAccordion heading="Preguntas frecuentes sobre nosotros" items={FAQ_QUIENES_SOMOS} />

        {/* CTA final */}
        <section className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="rounded-[24px] bg-navy p-6 text-white md:flex md:items-center md:justify-between md:gap-10 md:p-12">
            <div>
              <h2 className="text-[22px] font-extrabold leading-tight md:text-[28px]">¿Empezamos?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/80 md:text-[16px]">
                Calcula tu precio en 1 minuto o deja que te llamemos. Sin coste ni compromiso, estés donde estés.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-3 md:mt-0 md:flex-row md:shrink-0">
              <a href="/tarificador" className="flex items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep">Calcula tu precio</a>
              <a href="/quiero-que-me-llamen" className="flex items-center justify-center rounded-card border border-white/30 px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-white/10">Te llamamos gratis</a>
            </div>
          </div>
        </section>

        {/* SEO */}
        <section aria-labelledby="seo-heading" className="mx-auto mt-14 max-w-app px-5 pb-4 md:mt-24 md:max-w-2xl">
          <h2 id="seo-heading" className="text-[22px] font-extrabold text-navy md:text-[26px]">Correduría de seguros online en toda España</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate2">
            Buscar un comparador de seguros de confianza es el primer paso para no pagar de más. Asegurados Ventajon es
            una correduría de seguros que compara tu perfil entre varias de las aseguradoras líderes del país —como
            Mapfre, Adeslas, Asisa, Zurich y Generali— para encontrar la póliza que de verdad se ajusta a lo que
            necesitas, ya sea un seguro de salud, de vida, de decesos, de hogar o de auto.
          </p>
          <div className="mt-6">
            <h3 className="text-[16px] font-bold text-navy">¿Por qué una correduría y no una aseguradora directa?</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-slate2">
              Un agente de una única aseguradora solo puede ofrecerte sus propios productos. Nosotros, al comparar
              entre varias compañías, te ayudamos a encontrar la que mejor precio y cobertura ofrece para tu perfil
              concreto, sin ningún coste por el servicio de comparación.
            </p>
          </div>
          <div className="mt-6">
            <h3 className="text-[16px] font-bold text-navy">Cobertura en toda España</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-slate2">
              Nuestro modelo 100% online y telefónico nos permite atender a clientes de cualquier comunidad autónoma,
              con una cercanía especial en Canarias y Baleares, origen de nuestro equipo.
            </p>
          </div>
        </section>
      </main>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <Footer />
      <StickyMobileCta label="Calcula tu precio" href="/tarificador" secondaryLabel="Que te llamen" secondaryHref="/quiero-que-me-llamen" />
    </>
  );
}
