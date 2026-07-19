"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { ImageField } from "@/components/admin/ImageField";
import { slugifyTestimonioTitle, makeCapituloId, type Testimonio, type TestimonioCapitulo } from "@/lib/testimonios";

const PRODUCTO_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "General (sin ramo concreto)" },
  { value: "salud", label: "Salud" },
  { value: "vida", label: "Vida" },
  { value: "decesos", label: "Decesos" },
  { value: "hogar", label: "Hogar" },
  { value: "auto", label: "Auto" },
];

const BLANK: Testimonio = {
  id: "", slug: "", status: "borrador", nombre: "", ubicacion: "", producto: "",
  resumen: "", cita: "", fotoDestacada: "", galeria: [], capitulos: [],
  ctaTexto: "Calcula tu precio", ctaHref: "/tarificador",
  metaTitle: "", metaDescription: "", publishedAt: new Date().toISOString().slice(0, 10), updatedAt: "",
};

export default function AdminTestimonioEditorPage({ params }: { params: { id: string } }) {
  return (
    <AdminShell active="testimonios">
      <TestimonioEditor id={params.id} />
    </AdminShell>
  );
}

function TestimonioEditor({ id }: { id: string }) {
  const { token } = useAdminToken();
  const router = useRouter();
  const isNew = id === "nuevo";
  const [t, setT] = useState<Testimonio>(BLANK);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/testimonios/${id}`, { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setT(body.testimonio);
      setSlugTouched(true);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [id, isNew, token]);

  useEffect(() => { load(); }, [load]);

  function setNombre(nombre: string) {
    setT((p) => ({ ...p, nombre, slug: slugTouched ? p.slug : slugifyTestimonioTitle(nombre) }));
  }

  function setGaleriaFoto(idx: number, url: string) {
    setT((p) => {
      const galeria = [...p.galeria];
      if (url) galeria[idx] = url;
      else galeria.splice(idx, 1);
      return { ...p, galeria };
    });
  }

  function addCapitulo() {
    const nuevo: TestimonioCapitulo = { id: makeCapituloId(), titulo: "", texto: "" };
    setT((p) => ({ ...p, capitulos: [...p.capitulos, nuevo] }));
  }
  function updateCapitulo(cid: string, patch: Partial<TestimonioCapitulo>) {
    setT((p) => ({ ...p, capitulos: p.capitulos.map((c) => (c.id === cid ? { ...c, ...patch } : c)) }));
  }
  function removeCapitulo(cid: string) {
    setT((p) => ({ ...p, capitulos: p.capitulos.filter((c) => c.id !== cid) }));
  }
  function moveCapitulo(cid: string, dir: -1 | 1) {
    setT((p) => {
      const idx = p.capitulos.findIndex((c) => c.id === cid);
      const next = idx + dir;
      if (idx === -1 || next < 0 || next >= p.capitulos.length) return p;
      const capitulos = [...p.capitulos];
      [capitulos[idx], capitulos[next]] = [capitulos[next], capitulos[idx]];
      return { ...p, capitulos };
    });
  }

  async function save() {
    if (!t.nombre.trim()) { setError("Falta el nombre de la familia/persona protagonista."); return; }
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch(isNew ? "/api/admin/testimonios" : `/api/admin/testimonios/${id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(t),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setT(body.testimonio);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
        if (isNew) router.push(`/admin/testimonios/${body.testimonio.id}`);
      } else {
        setError(body.error ?? "No se pudo guardar.");
      }
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  async function remove() {
    if (isNew || !confirm("¿Eliminar este testimonio? No se puede deshacer.")) return;
    const res = await fetch(`/api/admin/testimonios/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.ok) router.push("/admin/testimonios");
  }

  if (loading) return <main className="mx-auto max-w-3xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
      <a href="/admin/testimonios" className="text-[13px] font-semibold text-navy">← Volver al listado</a>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-navy">{isNew ? "Nueva historia" : "Editar historia"}</h1>
        <div className="flex overflow-hidden rounded-pill border border-hair">
          {(["borrador", "publicado"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setT((p) => ({ ...p, status: s }))}
              className={`px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors ${t.status === s ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}

      <div className="mt-5 flex flex-col gap-6">
        {/* Vista previa de la tarjeta del grid */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Vista previa — tarjeta del grid</h2>
          <div className="relative mt-3 h-48 overflow-hidden rounded-[16px] bg-mist">
            {t.fotoDestacada ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.fotoDestacada} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-[12px] text-slate2">Sin foto</div>
            )}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-[17px] font-extrabold leading-snug text-white">{t.nombre || "Nombre de la familia"}</p>
              <p className="mt-1 text-[12px] text-white/85">{t.ubicacion || "Ubicación"}</p>
              <span className="mt-3 inline-flex items-center justify-center rounded-pill bg-white px-4 py-2 text-[12px] font-semibold text-ink">Leer su historia</span>
            </div>
          </div>
        </section>

        {/* Datos básicos */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Datos básicos</h2>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Nombre (familia o persona protagonista)</span>
            <input value={t.nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Familia Rodríguez"
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[15px] font-semibold" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Slug (URL: /testimonios/…)</span>
            <input value={t.slug} onChange={(e) => { setSlugTouched(true); setT((p) => ({ ...p, slug: slugifyTestimonioTitle(e.target.value) })); }}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums" />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Ubicación</span>
              <input value={t.ubicacion} onChange={(e) => setT((p) => ({ ...p, ubicacion: e.target.value }))}
                placeholder="Las Palmas de Gran Canaria"
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Fecha de publicación</span>
              <input type="date" value={t.publishedAt} onChange={(e) => setT((p) => ({ ...p, publishedAt: e.target.value }))}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums" />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Resumen (teaser de la tarjeta y meta descripción base)</span>
            <textarea value={t.resumen} onChange={(e) => setT((p) => ({ ...p, resumen: e.target.value }))} rows={2}
              placeholder="Cómo la familia Rodríguez encontró tranquilidad para su día a día."
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Frase destacada (cita, opcional)</span>
            <textarea value={t.cita} onChange={(e) => setT((p) => ({ ...p, cita: e.target.value }))} rows={2}
              placeholder="«Por fin dejamos de preocuparnos y empezamos a vivir tranquilos.»"
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          </label>
        </section>

        {/* Fotos */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Fotos</h2>
          <p className="mt-1 text-[12px] text-slate2">
            La foto destacada es el hero de la historia y la tarjeta del grid. Las 3 de galería se reparten entre
            los capítulos del relato al leer la historia.
          </p>
          <ImageField
            label="Foto destacada"
            value={t.fotoDestacada}
            onChange={(v) => setT((p) => ({ ...p, fotoDestacada: v }))}
            maxWidth={1600} mime="image/jpeg" preview="h-16 w-24"
          />
          {[0, 1, 2].map((i) => (
            <ImageField
              key={i}
              label={`Foto de galería ${i + 1}`}
              value={t.galeria[i] ?? ""}
              onChange={(v) => setGaleriaFoto(i, v)}
              maxWidth={1400} mime="image/jpeg" preview="h-16 w-24"
            />
          ))}
        </section>

        {/* Capítulos (scrollytelling) */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-navy">Capítulos de la historia</h2>
              <p className="mt-1 text-[12px] text-slate2">Cada capítulo aparece como un bloque propio con animación al hacer scroll.</p>
            </div>
            <button type="button" onClick={addCapitulo}
              className="shrink-0 rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
              + Añadir capítulo
            </button>
          </div>

          {t.capitulos.length === 0 && (
            <p className="mt-4 text-[13px] text-slate2">Todavía no hay capítulos. Añade el primero.</p>
          )}

          <div className="mt-4 flex flex-col gap-4">
            {t.capitulos.map((c, i) => (
              <div key={c.id} className="rounded-card border border-hair bg-mist/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate2">Capítulo {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveCapitulo(c.id, -1)} disabled={i === 0}
                      className="rounded-full px-2 py-1 text-[12px] font-semibold text-navy hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveCapitulo(c.id, 1)} disabled={i === t.capitulos.length - 1}
                      className="rounded-full px-2 py-1 text-[12px] font-semibold text-navy hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => removeCapitulo(c.id)}
                      className="rounded-full px-2 py-1 text-[12px] font-semibold text-brand-red hover:bg-brand-red/10">Eliminar</button>
                  </div>
                </div>
                <label className="mt-2 block">
                  <span className="mb-1 block text-[12px] font-semibold text-ink">Título del capítulo</span>
                  <input value={c.titulo} onChange={(e) => updateCapitulo(c.id, { titulo: e.target.value })}
                    placeholder="Cómo empezó todo"
                    className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] font-semibold" />
                </label>
                <label className="mt-2 block">
                  <span className="mb-1 block text-[12px] font-semibold text-ink">Texto (un párrafo por línea en blanco)</span>
                  <textarea value={c.texto} onChange={(e) => updateCapitulo(c.id, { texto: e.target.value })} rows={4}
                    className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Llamada a la acción</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Texto del botón</span>
              <input value={t.ctaTexto} onChange={(e) => setT((p) => ({ ...p, ctaTexto: e.target.value }))}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Enlace del botón</span>
              <input value={t.ctaHref} onChange={(e) => setT((p) => ({ ...p, ctaHref: e.target.value }))} placeholder="/tarificador"
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
          </div>
          <label className="mt-3 block max-w-xs">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Ramo relacionado</span>
            <select value={t.producto} onChange={(e) => setT((p) => ({ ...p, producto: e.target.value }))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]">
              {PRODUCTO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </section>

        {/* SEO */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">SEO</h2>
          <label className="mt-3 block">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-ink">Meta título</span>
              <span className="text-[11px] tnums text-slate2">{t.metaTitle.length} · recomendado ≈60</span>
            </div>
            <input value={t.metaTitle} onChange={(e) => setT((p) => ({ ...p, metaTitle: e.target.value }))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
          </label>
          <label className="mt-3 block">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-ink">Meta descripción</span>
              <span className="text-[11px] tnums text-slate2">{t.metaDescription.length} · recomendado ≈155</span>
            </div>
            <textarea value={t.metaDescription} onChange={(e) => setT((p) => ({ ...p, metaDescription: e.target.value }))} rows={3}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          </label>
        </section>

        {!isNew && (
          <button onClick={remove}
            className="self-start rounded-card px-4 py-2 text-[13px] font-semibold text-brand-red transition-colors hover:bg-brand-red/10">
            Eliminar testimonio
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
