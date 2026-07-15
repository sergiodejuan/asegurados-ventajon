import { Header } from "./Header";
import { Footer } from "./Footer";
import { StickyMobileCta } from "./StickyMobileCta";
import { PostCard } from "./PostCard";
import { Check, IconByName } from "./icons";
import type { Post, PostBlock } from "@/lib/posts";
import { otherPosts } from "@/lib/store";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

function ArticleBlock({ block }: { block: PostBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 id={block.id} className="mt-8 scroll-mt-32 font-display text-[22px] font-extrabold text-navy">{block.text}</h2>;
    case "p":
      return <p className="mt-3 text-[15px] leading-relaxed text-ink">{block.text}</p>;
    case "bullets":
      return (
        <ul className="mt-3 flex flex-col gap-2">
          {block.items.filter(Boolean).map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                <Check width={13} height={13} />
              </span>
              <span className="text-[15px] leading-relaxed text-ink">{b}</span>
            </li>
          ))}
        </ul>
      );
    case "promo":
      return (
        <div className="relative mt-8 overflow-hidden rounded-[20px] bg-mint px-6 py-7">
          <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-mint-deep/70 sm:block">
            <IconByName name="shield" width={56} height={56} />
          </span>
          <p className="max-w-sm text-[18px] font-extrabold leading-tight text-navy-deep">{block.headline}</p>
          <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-navy-deep/80">{block.sub}</p>
          <a
            href={block.ctaHref}
            className="mt-4 inline-flex items-center justify-center rounded-card bg-navy px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep"
          >
            {block.ctaLabel}
          </a>
        </div>
      );
  }
}

export async function PostPage({ post }: { post: Post }) {
  const related = await otherPosts(post.id);
  const toc = post.blocks.filter((b): b is Extract<PostBlock, { type: "h2" }> => b.type === "h2");

  return (
    <>
      <Header showProgress crumbs={[{ label: "Actualidad", href: "/actualidad" }, { label: post.title }]} />
      <main id="contenido">
        {/* HERO a todo el ancho, con foto de cabecera opcional */}
        <section className="relative w-full overflow-hidden px-5 py-14 text-center text-white md:py-20">
          {post.headerImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.headerImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-navy/90 via-navy-deep/85 to-ink/80" />
            </>
          ) : (
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-navy to-navy-deep" />
          )}
          <div className="relative">
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
          </div>
        </section>

        <div className="mx-auto max-w-app px-5 py-10 md:max-w-3xl md:py-14">
          <p className="text-[13px] text-slate2">{formatDate(post.publishedAt)} · {post.readMinutes} min de lectura</p>
          <p className="mt-4 text-[17px] leading-relaxed text-ink md:text-[18px]">{post.dek}</p>

          {/* Índice */}
          {toc.length > 0 && (
            <nav aria-label="Índice del artículo" className="mt-8 rounded-[20px] border border-hair bg-white p-5 shadow-soft">
              <p className="text-[15px] font-bold text-navy">Índice</p>
              <ul className="mt-3 flex flex-col gap-2">
                {toc.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-[14px] font-medium text-navy underline underline-offset-2">{s.text}</a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <p className="mt-8 text-[15px] leading-relaxed text-ink">{post.intro}</p>

          {post.blocks.map((block, i) => <ArticleBlock key={i} block={block} />)}

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
        {related.length > 0 && (
          <section aria-labelledby="relacionados" className="mx-auto mt-4 max-w-app px-5 pb-14 md:max-w-5xl lg:max-w-6xl">
            <h2 id="relacionados" className="text-[22px] font-extrabold text-navy md:text-[26px]">También podría interesarte</h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {related.map((p) => <PostCard key={p.id} post={p} />)}
            </ul>
          </section>
        )}
      </main>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <Footer />
      <StickyMobileCta label={post.cta.label} href={post.cta.href} />
    </>
  );
}
