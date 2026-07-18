"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { resizeImageFile } from "@/components/admin/ImageField";
import { slugifyPromotionTitle, type Promotion } from "@/lib/promotions";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const PRODUCTO_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Genérico (sin ramo concreto)" },
  { value: "salud", label: "Salud" },
  { value: "vida", label: "Vida" },
  { value: "decesos", label: "Decesos" },
  { value: "hogar", label: "Hogar" },
  { value: "auto", label: "Auto" },
];

const BLANK: Promotion = {
  id: "", slug: "", status: "borrador", categoria: "", imagenUrl: "",
  tituloTarjeta: "", h1: "", validoHasta: "", subtitulo: "",
  introParrafos: [], bases: [], ctaTexto: "Calcula tu precio", ctaHref: "/tarificador",
  producto: "", linkExterno: "", metaTitle: "", metaDescription: "",
  publishedAt: new Date().toISOString().slice(0, 10), finPromocion: "", updatedAt: "",
};

export default function AdminPromocionEditorPage({ params }: { params: { id: string } }) {
  return (
    <AdminShell active="promociones">
      <PromocionEditor id={params.id} />
    </AdminShell>
  );
}

function PromocionEditor({ id }: { id: string }) {
  const { token } = useAdminToken();
  const router = useRouter();
  const isNew = id === "nueva";
  const [promo, setPromo] = useState<Promotion>(BLANK);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isDataUrl = promo.imagenUrl.startsWith("data:");

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/promotions/${id}`, { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setPromo(body.promotion);
      setSlugTouched(true);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [id, isNew, token]);

  useEffect(() => { load(); }, [load]);

  function setTitulo(tituloTarjeta: string) {
    setPromo((p) => ({ ...p, tituloTarjeta, slug: slugTouched ? p.slug : slugifyPromotionTitle(tituloTarjeta) }));
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError(null);
    if (file.size > MAX_FILE_BYTES) { setImgError("La imagen pesa demasiado. Usa una de menos de 10 MB."); return; }
    setProcessingImage(true);
    try { setPromo((p) => ({ ...p, imagenUrl: "" })); const url = await resizeImageFile(file, 1600, "image/jpeg", 0.75); setPromo((p) => ({ ...p, imagenUrl: url })); }
    catch { setImgError("No se pudo procesar la imagen. Prueba con otro archivo."); }
    setProcessingImage(false);
  }

  async function save() {
    if (!promo.tituloTarjeta.trim()) { setError("Falta el título."); return; }
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch(isNew ? "/api/admin/promotions" : `/api/admin/promotions/${id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(promo),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setPromo(body.promotion);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
        if (isNew) router.push(`/admin/promociones/${body.promotion.id}`);
      } else {
        setError(body.error ?? "No se pudo guardar.");
      }
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  async function remove() {
    if (isNew || !confirm("¿Eliminar esta promoción? No se puede deshacer.")) return;
    const res = await fetch(`/api/admin/promotions/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.ok) router.push("/admin/promociones");
  }

  if (loading) return <main className="mx-auto max-w-3xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
      <a href="/admin/promociones" className="text-[13px] font-semibold text-navy">← Volver al listado</a>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-navy">{isNew ? "Nueva promoción" : "Editar promoción"}</h1>
        <div className="flex overflow-hidden rounded-pill border border-hair">
          {(["borrador", "publicado"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setPromo((p) => ({ ...p, status: s }))}
              className={`px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors ${promo.status === s ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}

      <div className="mt-5 flex flex-col gap-6">
        {/* Vista previa fiel al diseño final: tarjeta de listado */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Vista previa — tarjeta del listado</h2>
          <div className="relative mt-3 h-48 overflow-hidden rounded-[16px] bg-mist">
            {promo.imagenUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={promo.imagenUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-[12px] text-slate2">Sin foto</div>
            )}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="max-w-xs text-[17px] font-extrabold leading-snug text-white">{promo.tituloTarjeta || "Titular de la tarjeta"}</p>
              <p className="mt-1.5 text-[12px] text-white/85">{promo.validoHasta}</p>
              <span className="mt-3 inline-flex items-center justify-center rounded-pill bg-white px-4 py-2 text-[12px] font-semibold text-ink">Ver promoción</span>
            </div>
          </div>
        </section>

        {/* Título y datos básicos */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Título y datos básicos</h2>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Titular de la tarjeta (listado)</span>
            <input value={promo.tituloTarjeta} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Obtén el mejor precio garantizado en tu Seguro de Coche"
              className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[15px] font-semibold" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Slug (URL: /promociones/…)</span>
            <input value={promo.slug} onChange={(e) => { setSlugTouched(true); setPromo((p) => ({ ...p, slug: slugifyPromotionTitle(e.target.value) })); }}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums" />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Categoría (etiqueta / migas de pan)</span>
              <input value={promo.categoria} onChange={(e) => setPromo((p) => ({ ...p, categoria: e.target.value }))}
                placeholder="p.ej. Seguro de coche"
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Fecha de publicación</span>
              <input type="date" value={promo.publishedAt} onChange={(e) => setPromo((p) => ({ ...p, publishedAt: e.target.value }))}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums" />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Válida hasta (texto libre)</span>
            <input value={promo.validoHasta} onChange={(e) => setPromo((p) => ({ ...p, validoHasta: e.target.value }))}
              placeholder="Promoción válida hasta el 31/12/2026."
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
          </label>
          <label className="mt-3 block max-w-xs">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Fecha de fin (opcional)</span>
            <input type="date" value={promo.finPromocion} onChange={(e) => setPromo((p) => ({ ...p, finPromocion: e.target.value }))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums" />
            <p className="mt-1 text-[11px] leading-relaxed text-slate2">
              Pasada esa fecha, la promoción se oculta sola del listado y de su página, sin que tengas que editarla.
              Déjalo en blanco si no caduca.
            </p>
          </label>
        </section>

        {/* Imagen */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Foto de cabecera</h2>
          <p className="mt-1 text-[12px] text-slate2">Se usa en la tarjeta del listado y en la cabecera de la página propia de la promoción.</p>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Sube un archivo o pega un enlace</span>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="text-[13px]" />
              {processingImage && <span className="text-[12px] text-slate2">Procesando…</span>}
            </div>
            <input
              value={isDataUrl ? "" : promo.imagenUrl}
              onChange={(e) => setPromo((p) => ({ ...p, imagenUrl: e.target.value }))}
              placeholder={isDataUrl ? "Ya hay un archivo subido — quítalo para pegar un enlace" : "https://ejemplo.com/foto.jpg"}
              disabled={isDataUrl}
              className="mt-2 w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] disabled:bg-mist disabled:text-slate2"
            />
            {promo.imagenUrl && (
              <button type="button" onClick={() => { setPromo((p) => ({ ...p, imagenUrl: "" })); if (fileRef.current) fileRef.current.value = ""; }}
                className="mt-1.5 text-[12px] font-semibold text-brand-red underline">
                Quitar imagen
              </button>
            )}
            {imgError && <p role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{imgError}</p>}
          </label>
        </section>

        {/* Página propia de la promoción */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Página propia de la promoción</h2>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Titular sobre la foto (hero)</span>
            <input value={promo.h1} onChange={(e) => setPromo((p) => ({ ...p, h1: e.target.value }))}
              placeholder="Obtén el mejor precio garantizado"
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Subtítulo debajo de la foto</span>
            <textarea value={promo.subtitulo} onChange={(e) => setPromo((p) => ({ ...p, subtitulo: e.target.value }))} rows={2}
              placeholder="Obtén con Asegurados Ventajon el mejor precio garantizado en tu Seguro de Coche."
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Párrafos del cuerpo (uno por línea)</span>
            <textarea value={promo.introParrafos.join("\n")} onChange={(e) => setPromo((p) => ({ ...p, introParrafos: e.target.value.split("\n") }))} rows={5}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Bases legales (una por línea)</span>
            <textarea value={promo.bases.join("\n")} onChange={(e) => setPromo((p) => ({ ...p, bases: e.target.value.split("\n") }))} rows={5}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          </label>
        </section>

        {/* CTA */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Llamada a la acción</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Texto del botón principal</span>
              <input value={promo.ctaTexto} onChange={(e) => setPromo((p) => ({ ...p, ctaTexto: e.target.value }))}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Enlace del botón principal</span>
              <input value={promo.ctaHref} onChange={(e) => setPromo((p) => ({ ...p, ctaHref: e.target.value }))} placeholder="/tarificador-auto"
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </label>
          </div>
          <label className="mt-3 block max-w-xs">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Ramo (para "Llamadme gratis")</span>
            <select value={promo.producto} onChange={(e) => setPromo((p) => ({ ...p, producto: e.target.value }))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]">
              {PRODUCTO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Enlace propio (opcional)</span>
            <input value={promo.linkExterno} onChange={(e) => setPromo((p) => ({ ...p, linkExterno: e.target.value }))} placeholder="/mes-gratis"
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            <p className="mt-1 text-[11px] leading-relaxed text-slate2">
              Solo si esta promoción ya tiene su propia página en la web (p.ej. /mes-gratis): la tarjeta del listado
              enlazará ahí directamente en vez de crear una página nueva en /promociones/{promo.slug || "…"}.
            </p>
          </label>
        </section>

        {/* SEO */}
        <section className="rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">SEO</h2>
          <label className="mt-3 block">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-ink">Meta título</span>
              <span className="text-[11px] tnums text-slate2">{promo.metaTitle.length} · recomendado ≈60</span>
            </div>
            <input value={promo.metaTitle} onChange={(e) => setPromo((p) => ({ ...p, metaTitle: e.target.value }))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
          </label>
          <label className="mt-3 block">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-ink">Meta descripción</span>
              <span className="text-[11px] tnums text-slate2">{promo.metaDescription.length} · recomendado ≈155</span>
            </div>
            <textarea value={promo.metaDescription} onChange={(e) => setPromo((p) => ({ ...p, metaDescription: e.target.value }))} rows={3}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] leading-relaxed" />
          </label>
        </section>

        {!isNew && (
          <button onClick={remove}
            className="self-start rounded-card px-4 py-2 text-[13px] font-semibold text-brand-red transition-colors hover:bg-brand-red/10">
            Eliminar promoción
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
