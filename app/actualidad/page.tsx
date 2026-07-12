import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCta } from "@/components/StickyMobileCta";
import { IconByName, ArrowRight } from "@/components/icons";
import { BRAND_NAME } from "@/lib/brand";
import { POSTS } from "@/lib/posts";

export const metadata: Metadata = {
  title: `Actualidad — ${BRAND_NAME}`,
  description: "Educación financiera y de seguros: copago, seguros de vida, correduría vs. aseguradora y mucho más, explicado sin letra pequeña.",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export default function Actualidad() {
  return (
    <>
      <Header showProgress />
      <main id="contenido">
        {/* HERO a todo el ancho */}
        <section className="w-full bg-gradient-to-br from-navy to-navy-deep px-5 py-14 text-center text-white md:py-20">
          <span className="inline-flex items-center rounded-pill bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-white/80">
            Actualidad
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-[32px] font-extrabold leading-[1.1] md:text-[44px]">
            Seguros explicados sin letra pequeña
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-white/85 md:text-[17px]">
            Educación financiera y de seguros para ayudarte a decidir con datos, no con prisa: copagos, seguros de vida,
            cómo funciona una correduría y mucho más.
          </p>
        </section>

        {/* Listado de artículos */}
        <section aria-label="Artículos" className="mx-auto mt-14 max-w-app px-5 pb-14 md:mt-24 md:max-w-5xl lg:max-w-6xl">
          <ul className="grid gap-5 md:grid-cols-3">
            {POSTS.map((p) => (
              <li key={p.slug} className="flex flex-col rounded-card border border-hair bg-white p-5 shadow-soft">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                  <IconByName name={p.category.includes("vida") ? "life" : p.category.includes("salud") ? "shield" : "doc"} width={20} height={20} />
                </span>
                <p className="mt-4 text-[12px] font-bold uppercase tracking-wide text-brand-red">{p.category}</p>
                <p className="mt-1 text-[17px] font-bold leading-snug text-ink">{p.title}</p>
                <p className="mt-2 flex-1 text-[14px] leading-relaxed text-slate2">{p.dek}</p>
                <p className="mt-4 text-[12px] text-slate2">{formatDate(p.publishedAt)} · {p.readMinutes} min de lectura</p>
                <a href={`/actualidad/${p.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy">
                  Leer más <ArrowRight width={14} height={14} />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA final */}
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
