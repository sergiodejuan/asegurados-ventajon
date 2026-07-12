import { Header } from "./Header";
import { Footer } from "./Footer";
import { StickyMobileCta } from "./StickyMobileCta";
import { Check, IconByName, ArrowRight } from "./icons";
import { otherPosts, type Post, type PostSection } from "@/lib/posts";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

function ArticleSection({ section }: { section: PostSection }) {
  return (
    <div id={section.id} className="mt-8 scroll-mt-32">
      <h2 className="font-display text-[22px] font-extrabold text-navy">{section.h2}</h2>
      {section.paragraphs.map((p, i) => (
        <p key={i} className="mt-3 text-[15px] leading-relaxed text-ink">{p}</p>
      ))}
      {section.bullets && (
        <ul className="mt-3 flex flex-col gap-2">
          {section.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                <Check width={13} height={13} />
              </span>
              <span className="text-[15px] leading-relaxed text-ink">{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PostPage({ post }: { post: Post }) {
  const related = otherPosts(post.slug);
  const toc = [...post.sectionsBeforePromo, ...post.sectionsAfterPromo];

  return (
    <>
      <Header showProgress crumbs={[{ label: "Actualidad", href: "/actualidad" }, { label: post.title }]} />
      <main id="contenido">
        {/* HERO a todo el ancho, como la referencia */}
        <section className="w-full bg-gradient-to-br from-navy to-navy-deep px-5 py-14 text-center text-white md:py-20">
          <p className="text-[13px] font-bold uppercase tracking-wide text-white/70">{post.category}</p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-[30px] font-extrabold leading-[1.15] md:text-[44px]">{post.title}</h1>
          <div className="mt-7">
            <a
              href={post.cta.href}
              className="inline-flex items-center justify-center rounded-card bg-white px-6 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-white/90"
            >
              {post.cta.label}
            </a>
          </div>
        </section>

        <div className="mx-auto max-w-app px-5 py-10 md:max-w-3xl md:py-14">
          <p className="text-[13px] text-slate2">{formatDate(post.publishedAt)} · {post.readMinutes} min de lectura</p>
          <p className="mt-4 text-[17px] leading-relaxed text-ink md:text-[18px]">{post.dek}</p>

          {/* Índice */}
          <nav aria-label="Índice del artículo" className="mt-8 rounded-[20px] border border-hair bg-white p-5 shadow-soft">
            <p className="text-[15px] font-bold text-navy">Índice</p>
            <ul className="mt-3 flex flex-col gap-2">
              {toc.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-[14px] font-medium text-navy underline underline-offset-2">{s.h2}</a>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mt-8 text-[15px] leading-relaxed text-ink">{post.intro}</p>

          {post.sectionsBeforePromo.map((s) => <ArticleSection key={s.id} section={s} />)}

          {/* Inserción de CTA a mitad de artículo */}
          <div className="relative mt-10 overflow-hidden rounded-[20px] bg-mint px-6 py-7">
            <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-mint-deep/70 sm:block">
              <IconByName name="shield" width={56} height={56} />
            </span>
            <p className="max-w-sm text-[18px] font-extrabold leading-tight text-navy-deep">{post.promo.headline}</p>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-navy-deep/80">{post.promo.sub}</p>
            <a
              href={post.promo.ctaHref}
              className="mt-4 inline-flex items-center justify-center rounded-card bg-navy px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              {post.promo.ctaLabel}
            </a>
          </div>

          {post.sectionsAfterPromo.map((s) => <ArticleSection key={s.id} section={s} />)}

          {/* Autoría */}
          <div className="mt-10 flex items-center gap-4 rounded-[20px] border border-hair bg-white p-5 shadow-soft">
            <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-navy text-[16px] font-extrabold text-white">AV</span>
            <div>
              <p className="text-[15px] font-bold text-navy">Equipo Asegurados Ventajon</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-slate2">
                Correduría de seguros. Comparamos entre las mejores compañías del país para ayudarte a elegir sin letra pequeña.
              </p>
            </div>
          </div>
        </div>

        {/* También podría interesarte */}
        <section aria-labelledby="relacionados" className="mx-auto mt-4 max-w-app px-5 pb-14 md:max-w-5xl lg:max-w-6xl">
          <h2 id="relacionados" className="text-[22px] font-extrabold text-navy md:text-[26px]">También podría interesarte</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug} className="flex flex-col rounded-card border border-hair bg-white p-5 shadow-soft">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                  <IconByName name="doc" width={20} height={20} />
                </span>
                <p className="mt-4 text-[12px] font-bold uppercase tracking-wide text-brand-red">{p.category}</p>
                <p className="mt-1 text-[16px] font-bold leading-snug text-ink">{p.title}</p>
                <a href={`/actualidad/${p.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy">
                  Leer más <ArrowRight width={14} height={14} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <Footer />
      <StickyMobileCta label={post.cta.label} href={post.cta.href} />
    </>
  );
}
