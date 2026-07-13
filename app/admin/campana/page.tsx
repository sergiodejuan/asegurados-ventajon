"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { makeSlideId, type CampaignSlide, type CampaignConfig } from "@/lib/campaign";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.72;

function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function newSlide(): CampaignSlide {
  return {
    id: makeSlideId(), imageDataUrl: "", price: "Desde 35€/mes", headline: "Nueva campaña",
    sub: "Texto secundario de la campaña.", ctaLabel: "Calcula tu precio", ctaHref: "/tarificador", activo: true,
  };
}

export default function AdminCampanaPage() {
  return (
    <AdminShell active="campana">
      <CampanaAdmin />
    </AdminShell>
  );
}

function CampanaAdmin() {
  const { token } = useAdminToken();
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/campaign", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setConfig(body.config);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function updateSlide(id: string, patch: Partial<CampaignSlide>) {
    setConfig((c) => (c ? { ...c, slides: c.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : c));
  }

  function addSlide() {
    setConfig((c) => (c ? { ...c, slides: [...c.slides, newSlide()] } : c));
  }

  function removeSlide(id: string) {
    setConfig((c) => (c ? { ...c, slides: c.slides.filter((s) => s.id !== id) } : c));
  }

  function moveSlide(id: string, dir: -1 | 1) {
    setConfig((c) => {
      if (!c) return c;
      const i = c.slides.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.slides.length) return c;
      const slides = [...c.slides];
      [slides[i], slides[j]] = [slides[j], slides[i]];
      return { ...c, slides };
    });
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(config),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setConfig(body.config);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      } else {
        setError(body.error ?? "No se pudo guardar.");
      }
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold text-navy">Banners de campaña</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Se muestran en la home, en un carrusel automático. Puedes añadir varias diapositivas, reordenarlas,
        ocultar alguna sin borrarla y ajustar el tiempo entre cada una. Los cambios se aplican al instante.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {config && (
        <div className="mt-5 flex flex-col gap-4">
          <label className="flex items-center justify-between rounded-card border border-hair bg-white p-4">
            <span className="text-[13px] font-semibold text-ink">Tiempo entre diapositivas (segundos)</span>
            <input
              type="number" min={2} max={30}
              value={Math.round(config.intervalMs / 1000)}
              onChange={(e) => setConfig((c) => (c ? { ...c, intervalMs: Math.max(2, Math.min(30, Number(e.target.value) || 6)) * 1000 } : c))}
              className="w-20 rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums"
            />
          </label>

          {config.slides.map((slide, i) => (
            <SlideEditor
              key={slide.id}
              slide={slide}
              index={i}
              total={config.slides.length}
              onChange={(patch) => updateSlide(slide.id, patch)}
              onRemove={() => removeSlide(slide.id)}
              onMove={(dir) => moveSlide(slide.id, dir)}
            />
          ))}

          <button onClick={addSlide}
            className="flex items-center justify-center rounded-card border border-dashed border-hair px-5 py-3.5 text-[14px] font-semibold text-navy transition-colors hover:bg-mist">
            + Añadir diapositiva
          </button>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-end gap-3">
          <button onClick={handleSave} disabled={saving || loading || !config}
            className="flex items-center justify-center rounded-card bg-navy px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40">
            {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </main>
  );
}

function SlideEditor({
  slide, index, total, onChange, onRemove, onMove,
}: {
  slide: CampaignSlide; index: number; total: number;
  onChange: (patch: Partial<CampaignSlide>) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const [processingImage, setProcessingImage] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError(null);
    if (file.size > MAX_FILE_BYTES) { setImgError("La imagen pesa demasiado. Usa una de menos de 10 MB."); return; }
    setProcessingImage(true);
    try { onChange({ imageDataUrl: await resizeImageFile(file) }); }
    catch { setImgError("No se pudo procesar la imagen. Prueba con otro archivo."); }
    setProcessingImage(false);
  }

  return (
    <div className="rounded-[20px] border border-hair bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-bold text-navy">Diapositiva {index + 1}{!slide.activo && <span className="ml-2 rounded-pill bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Oculta</span>}</p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} title="Subir"
            className="rounded-pill border border-hair px-2 py-1 text-[11px] font-semibold text-navy disabled:opacity-30">↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} title="Bajar"
            className="rounded-pill border border-hair px-2 py-1 text-[11px] font-semibold text-navy disabled:opacity-30">↓</button>
          <button type="button" onClick={() => onChange({ activo: !slide.activo })}
            className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold transition-colors ${slide.activo ? "border border-hair text-navy hover:bg-mist" : "bg-navy text-white"}`}>
            {slide.activo ? "Ocultar" : "Mostrar"}
          </button>
          <button type="button" onClick={onRemove} disabled={total <= 1} title={total <= 1 ? "Debe quedar al menos una diapositiva" : "Eliminar"}
            className="rounded-pill px-2.5 py-1 text-[11px] font-semibold text-brand-red hover:bg-brand-red/10 disabled:opacity-30">
            Eliminar
          </button>
        </div>
      </div>

      {/* Vista previa */}
      <div
        className={`relative mt-3 overflow-hidden rounded-[16px] px-5 py-7 text-white ${!slide.imageDataUrl ? "bg-gradient-to-br from-navy to-navy-deep" : ""}`}
        style={slide.imageDataUrl ? {
          backgroundImage: `linear-gradient(to bottom right, rgba(18,32,79,.85), rgba(18,32,79,.55)), url(${slide.imageDataUrl})`,
          backgroundSize: "cover", backgroundPosition: "center",
        } : undefined}
      >
        <span className="inline-flex items-center rounded-pill bg-brand-red px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide text-white">
          {slide.price || "Precio de campaña"}
        </span>
        <h2 className="mt-3 text-[20px] font-extrabold leading-tight">{slide.headline || "Titular del banner"}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/85">{slide.sub || "Texto secundario del banner."}</p>
        <span className="mt-4 inline-flex items-center justify-center rounded-card bg-white px-4 py-2.5 text-[13px] font-semibold text-navy">
          {slide.ctaLabel || "Texto del botón"}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink">Imagen de fondo</span>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="text-[13px]" />
          {processingImage && <span className="ml-2 text-[12px] text-slate2">Procesando…</span>}
          {slide.imageDataUrl && (
            <button type="button" onClick={() => { onChange({ imageDataUrl: "" }); if (fileRef.current) fileRef.current.value = ""; }}
              className="ml-3 text-[12px] font-semibold text-brand-red underline">
              Quitar imagen
            </button>
          )}
          {imgError && <p role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{imgError}</p>}
        </label>

        <label>
          <span className="mb-1 block text-[12px] font-semibold text-ink">Precio de campaña (badge)</span>
          <input value={slide.price} onChange={(e) => onChange({ price: e.target.value })} placeholder="Desde 35€/mes"
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-ink">Titular</span>
          <input value={slide.headline} onChange={(e) => onChange({ headline: e.target.value })}
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-ink">Texto secundario</span>
          <textarea value={slide.sub} onChange={(e) => onChange({ sub: e.target.value })} rows={2}
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
        </label>
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Texto del botón</span>
            <input value={slide.ctaLabel} onChange={(e) => onChange({ ctaLabel: e.target.value })}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Enlace del botón</span>
            <input value={slide.ctaHref} onChange={(e) => onChange({ ctaHref: e.target.value })} placeholder="/tarificador"
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>
        </div>
      </div>
    </div>
  );
}
