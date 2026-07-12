import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CoverageTabs } from "@/components/CoverageTabs";
import { Check, IconByName, ArrowRight } from "@/components/icons";
import {
  PARTNERS, ECOSYSTEM_MEMBERS,
  VENTAJAS, OTROS_PRODUCTOS,
} from "@/lib/brand";

export default function Home() {
  return (
    <>
      <Header />

      <main id="contenido">
        {/* HERO */}
        <section className="mx-auto max-w-app px-5 pt-8 md:max-w-5xl md:pt-16 lg:max-w-6xl">
          <div className="md:grid md:grid-cols-2 md:items-center md:gap-16">
            <div className="md:col-start-1 md:row-start-1">
              <span className="inline-flex items-center rounded-pill bg-brand-red/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand-red">
                Seguro de salud
              </span>
              <h1 className="mt-4 text-[34px] font-extrabold leading-[1.05] tracking-tight text-navy md:text-[48px] lg:text-[56px]">
                Asegurarte bien<br />es de listos
              </h1>
              <p className="mt-3 text-[16px] leading-relaxed text-slate2 md:text-[18px] md:max-w-md">
                Comparamos tu seguro de salud entre las mejores compañías para que pagues lo justo.
                Sin trucos, sin letra pequeña.
              </p>
            </div>

            {/* Imagen de marca (placeholder — sustituir por foto real aprobada) */}
            <div
              role="img"
              aria-label="Familia bien atendida por su seguro de salud"
              className="mt-6 grid h-52 place-items-center overflow-hidden rounded-[24px] bg-gradient-to-br from-navy to-navy-deep text-white/90 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:h-full md:min-h-[420px]"
            >
              <IconByName name="shield" width={64} height={64} />
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
          </div>
        </section>

        {/* VENTAJAS (carrusel en mobile, grid en escritorio) */}
        <section aria-labelledby="ventajas" className="mt-14 md:mt-24">
          <div className="mx-auto max-w-app px-5 md:max-w-5xl lg:max-w-6xl">
            <h2 id="ventajas" className="text-[24px] font-extrabold text-navy md:text-[30px]">Las mejores ventajas</h2>
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

        {/* COBERTURAS */}
        <section aria-labelledby="cob" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <div className="md:mx-auto md:max-w-2xl md:text-center">
            <h2 id="cob" className="text-[24px] font-extrabold leading-tight text-navy md:text-[30px]">
              Tu seguro de salud con las mejores coberturas
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
              Elijas la modalidad que elijas, comparamos por ti entre las mejores compañías.
            </p>
          </div>
          <div className="mt-6 md:mx-auto md:max-w-2xl"><CoverageTabs /></div>
        </section>

        {/* OTROS PRODUCTOS (carrusel en mobile, grid en escritorio) */}
        <section aria-labelledby="otros" className="mt-14 md:mt-24">
          <div className="mx-auto max-w-app px-5 md:max-w-5xl lg:max-w-6xl">
            <h2 id="otros" className="text-[24px] font-extrabold text-navy md:text-[30px]">Otros productos</h2>
          </div>
          <ul aria-label="Otros productos" className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:max-w-5xl md:grid md:grid-cols-4 md:snap-none md:overflow-visible md:px-5 md:pb-0 lg:max-w-6xl">
            {OTROS_PRODUCTOS.map((p) => (
              <li key={p.producto} className="flex w-[240px] shrink-0 snap-start flex-col rounded-card border border-hair bg-white p-5 shadow-soft md:w-auto">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                  <IconByName name={p.icon} width={22} height={22} />
                </span>
                <p className="mt-4 text-[17px] font-bold text-ink">{p.t}</p>
                <p className="mt-1 flex-1 text-[14px] leading-relaxed text-slate2">{p.d}</p>
                <a href={p.href}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-card bg-brand-red px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
                  Ver seguro de {p.t.toLowerCase()} <ArrowRight width={17} height={17} />
                </a>
              </li>
            ))}
          </ul>
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
                  <li key={p} className="rounded-pill border border-hair bg-white px-3.5 py-1.5 text-[14px] font-semibold text-navy">{p}</li>
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

      <Footer />
    </>
  );
}
