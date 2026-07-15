import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCta } from "@/components/StickyMobileCta";
import { PostCard } from "@/components/PostCard";
import { BRAND_NAME } from "@/lib/brand";
import { listPosts } from "@/lib/store";

export const metadata: Metadata = {
  title: `Actualidad — ${BRAND_NAME}`,
  description: "Educación financiera y de seguros: copago, seguros de vida, correduría vs. aseguradora y mucho más, explicado sin letra pequeña.",
};

export default async function Actualidad() {
  const posts = await listPosts({ onlyPublished: true });

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
          {posts.length === 0 ? (
            <p className="text-center text-[14px] text-slate2">Todavía no hay artículos publicados.</p>
          ) : (
            <ul className="grid gap-5 md:grid-cols-3">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </ul>
          )}
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
