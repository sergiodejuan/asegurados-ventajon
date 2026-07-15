"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { ImageField } from "@/components/admin/ImageField";
import { emptyBlock, slugifyTitle, type Post, type PostBlock } from "@/lib/posts";

const BLANK: Post = {
  id: "", slug: "", status: "borrador", category: "", title: "", dek: "",
  featuredImageUrl: "", headerImageUrl: "", metaTitle: "", metaDescription: "",
  readMinutes: 5, publishedAt: new Date().toISOString().slice(0, 10), updatedAt: "",
  cta: { label: "Calcula tu precio", href: "/tarificador" }, intro: "", blocks: [],
};

const BLOCK_TYPE_LABELS: Record<PostBlock["type"], string> = {
  h2: "Encabezado (H2)", p: "Párrafo", bullets: "Lista", promo: "Bloque CTA destacado",
};

export default function AdminBlogEditorPage({ params }: { params: { id: string } }) {
  return (
    <AdminShell active="blog">
      <BlogEditor id={params.id} />
    </AdminShell>
  );
}

function BlogEditor({ id }: { id: string }) {
  const { token } = useAdminToken();
  const router = useRouter();
  const isNew = id === "nuevo";
  const [post, setPost] = useState<Post>(BLANK);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setPost(body.post);
      setSlugTouched(true);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [id, isNew, token]);

  useEffect(() => { load(); }, [load]);

  function setTitle(title: string) {
    setPost((p) => ({ ...p, title, slug: slugTouched ? p.slug : slugifyTitle(title) }));
  }

  function updateBlock(index: number, patch: Partial<PostBlock>) {
    setPost((p) => ({ ...p, blocks: p.blocks.map((b, i) => (i === index ? ({ ...b, ...patch } as PostBlock) : b)) }));
  }
  function addBlock(type: PostBlock["type"]) {
    setPost((p) => ({ ...p, blocks: [...p.blocks, emptyBlock(type)] }));
  }
  function removeBlock(index: number) {
    setPost((p) => ({ ...p, blocks: p.blocks.filter((_, i) => i !== index) }));
  }
  function moveBlock(index: number, dir: -1 | 1) {
    setPost((p) => {
      const j = index + dir;
      if (j < 0 || j >= p.blocks.length) return p;
      const blocks = [...p.blocks];
      [blocks[index], blocks[j]] = [blocks[j], blocks[index]];
      return { ...p, blocks };
    });
  }

  async function save() {
    if (!post.title.trim()) { setError("Falta el título."); return; }
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch(isNew ? "/api/admin/posts" : `/api/admin/posts/${id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(post),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setPost(body.post);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
        if (isNew) router.push(`/admin/blog/${body.post.id}`);
      } else {
        setError(body.error ?? "No se pudo guardar.");
      }
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  async function remove() {
    if (isNew || !confirm("¿Eliminar esta entrada? No se puede deshacer.")) return;
    const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.ok) router.push("/admin/blog");
  }

  if (loading) return <main className="mx-auto max-w-3xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
      <a href="/admin/blog" className="text-[13px] font-semibold text-navy">← Volver al listado</a>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-navy">{isNew ? "Nueva entrada" : "Editar entrada"}</h1>
        <div className="flex overflow-hidden rounded-pill border border-hair">
          {(["borrador", "publicado"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setPost((p) => ({ ...p, status: s }))}
              className={`px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors ${post.status === s ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}

      <div className="mt-5 flex flex-col gap-6">
        {/* Título y datos básicos */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Título y datos básicos</h2>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Título</span>
            <input value={post.title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[15px] font-semibold" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Slug (URL: /actualidad/…)</span>
            <input value={post.slug} onChange={(e) => { setSlugTouched(true); setPost((p) => ({ ...p, slug: slugifyTitle(e.target.value) })); }}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums" />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Categoría</span>
              <input value={post.category} onChange={(e) => setPost((p) => ({ ...p, category: e.target.value }))}
                placeholder="p.ej. Seguros de salud"
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Fecha de publicación</span>
              <input type="date" value={post.publishedAt} onChange={(e) => setPost((p) => ({ ...p, publishedAt: e.target.value }))}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums" />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Descripción corta (tarjeta y debajo del título)</span>
            <textarea value={post.dek} onChange={(e) => setPost((p) => ({ ...p, dek: e.target.value }))} rows={3}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          </label>
          <label className="mt-3 block max-w-[160px]">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Minutos de lectura</span>
            <input type="number" min={1} max={60} value={post.readMinutes}
              onChange={(e) => setPost((p) => ({ ...p, readMinutes: Number(e.target.value) || 1 }))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums" />
          </label>
        </section>

        {/* Imágenes */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Imágenes</h2>
          <ImageField
            label="Imagen destacada"
            hint="Se muestra en la tarjeta del listado de Actualidad y en «también podría interesarte». Sin imagen, se muestra un icono."
            value={post.featuredImageUrl}
            onChange={(v) => setPost((p) => ({ ...p, featuredImageUrl: v }))}
            maxWidth={1200} mime="image/jpeg"
            preview="h-16 w-24"
            wide
          />
          <ImageField
            label="Imagen de cabecera del artículo"
            hint="Fondo de la cabecera del artículo. Sin imagen, se usa el degradado de marca, como hasta ahora."
            value={post.headerImageUrl}
            onChange={(v) => setPost((p) => ({ ...p, headerImageUrl: v }))}
            maxWidth={1600} mime="image/jpeg"
            preview="h-16 w-28"
            wide
          />
        </section>

        {/* SEO */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">SEO</h2>
          <label className="mt-3 block">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-ink">Meta título</span>
              <span className="text-[11px] tnums text-slate2">{post.metaTitle.length} · recomendado ≈60</span>
            </div>
            <input value={post.metaTitle} onChange={(e) => setPost((p) => ({ ...p, metaTitle: e.target.value }))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
          </label>
          <label className="mt-3 block">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-ink">Meta descripción</span>
              <span className="text-[11px] tnums text-slate2">{post.metaDescription.length} · recomendado ≈155</span>
            </div>
            <textarea value={post.metaDescription} onChange={(e) => setPost((p) => ({ ...p, metaDescription: e.target.value }))} rows={3}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          </label>
        </section>

        {/* Introducción y CTA */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Introducción</h2>
          <textarea value={post.intro} onChange={(e) => setPost((p) => ({ ...p, intro: e.target.value }))} rows={4}
            className="mt-3 w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          <p className="mt-4 text-[13px] font-semibold text-ink">CTA principal (cabecera y barra móvil)</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-[11px] font-semibold text-ink">Texto del botón</span>
              <input value={post.cta.label} onChange={(e) => setPost((p) => ({ ...p, cta: { ...p.cta, label: e.target.value } }))}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-semibold text-ink">Enlace</span>
              <input value={post.cta.href} onChange={(e) => setPost((p) => ({ ...p, cta: { ...p.cta, href: e.target.value } }))}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
          </div>
        </section>

        {/* Contenido por bloques */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Contenido</h2>
          <p className="mt-1 text-[12px] text-slate2">
            Añade el artículo por bloques: encabezados, párrafos, listas y, donde quieras, un bloque de CTA destacado.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {post.blocks.map((block, i) => (
              <BlockRow
                key={i}
                block={block}
                index={i}
                total={post.blocks.length}
                onChange={(patch) => updateBlock(i, patch)}
                onRemove={() => removeBlock(i)}
                onMove={(dir) => moveBlock(i, dir)}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(BLOCK_TYPE_LABELS) as PostBlock["type"][]).map((t) => (
              <button key={t} type="button" onClick={() => addBlock(t)}
                className="rounded-pill border border-dashed border-hair px-3.5 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-mist">
                + {BLOCK_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </section>

        {!isNew && (
          <button onClick={remove}
            className="self-start rounded-card px-4 py-2 text-[13px] font-semibold text-brand-red transition-colors hover:bg-brand-red/10">
            Eliminar entrada
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
          <button onClick={save} disabled={saving}
            className="flex items-center justify-center rounded-card bg-navy px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40">
            {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </main>
  );
}

function BlockRow({
  block, index, total, onChange, onRemove, onMove,
}: {
  block: PostBlock; index: number; total: number;
  onChange: (patch: Partial<PostBlock>) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-card border border-hair bg-mist p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate2">{BLOCK_TYPE_LABELS[block.type]}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0}
            className="rounded px-1.5 py-0.5 text-[13px] font-bold text-navy disabled:opacity-30" aria-label="Subir">↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1}
            className="rounded px-1.5 py-0.5 text-[13px] font-bold text-navy disabled:opacity-30" aria-label="Bajar">↓</button>
          <button type="button" onClick={onRemove}
            className="ml-1 rounded px-1.5 py-0.5 text-[12px] font-semibold text-brand-red">Quitar</button>
        </div>
      </div>

      {block.type === "h2" && (
        <input value={block.text} onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Texto del encabezado…"
          className="mt-2 w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] font-semibold" />
      )}
      {block.type === "p" && (
        <textarea value={block.text} onChange={(e) => onChange({ text: e.target.value })} rows={3}
          placeholder="Texto del párrafo…"
          className="mt-2 w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
      )}
      {block.type === "bullets" && (
        <textarea value={block.items.join("\n")} onChange={(e) => onChange({ items: e.target.value.split("\n") })} rows={4}
          placeholder="Un elemento por línea…"
          className="mt-2 w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
      )}
      {block.type === "promo" && (
        <div className="mt-2 flex flex-col gap-2">
          <input value={block.headline} onChange={(e) => onChange({ headline: e.target.value })}
            placeholder="Titular del bloque…"
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] font-semibold" />
          <textarea value={block.sub} onChange={(e) => onChange({ sub: e.target.value })} rows={2}
            placeholder="Texto de apoyo…"
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={block.ctaLabel} onChange={(e) => onChange({ ctaLabel: e.target.value })}
              placeholder={`Texto del botón (p.ej. "Calcula tu precio")`}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            <input value={block.ctaHref} onChange={(e) => onChange({ ctaHref: e.target.value })}
              placeholder="Enlace del botón…"
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
          </div>
        </div>
      )}
    </div>
  );
}
