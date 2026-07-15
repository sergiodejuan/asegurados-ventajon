import { IconByName } from "./icons";
import type { Post } from "@/lib/posts";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

function categoryIcon(category: string) {
  if (category.includes("vida")) return "life";
  if (category.includes("salud")) return "shield";
  if (category.includes("auto")) return "car";
  return "doc";
}

// Tarjeta de artículo: imagen a sangre arriba, título y descripción debajo,
// enlace "Lee el artículo completo". La imagen y el título son cada uno su
// propio enlace (no toda la tarjeta), para que ambos sean clicables sin
// anidar enlaces.
export function PostCard({ post }: { post: Post }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-[20px] border border-hair bg-white shadow-soft">
      <a href={`/actualidad/${post.slug}`} className="block aspect-[4/3] shrink-0 overflow-hidden bg-mist" aria-hidden="true" tabIndex={-1}>
        {post.featuredImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.featuredImageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-brand-red/50">
            <IconByName name={categoryIcon(post.category)} width={40} height={40} />
          </div>
        )}
      </a>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[12px] font-bold uppercase tracking-wide text-brand-red">{post.category}</p>
        <a href={`/actualidad/${post.slug}`} className="mt-1.5 font-display text-[19px] font-extrabold leading-snug text-navy transition-colors hover:text-navy-deep">
          {post.title}
        </a>
        <p className="mt-2 flex-1 text-[14px] leading-relaxed text-slate2">{post.dek}</p>
        <p className="mt-4 text-[12px] text-slate2">{formatDate(post.publishedAt)} · {post.readMinutes} min de lectura</p>
        <a href={`/actualidad/${post.slug}`} className="mt-3 inline-block text-[14px] font-bold text-navy underline underline-offset-2">
          Lee el artículo completo
        </a>
      </div>
    </li>
  );
}
