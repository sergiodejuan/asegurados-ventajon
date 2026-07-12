"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type Banner = {
  imageDataUrl: string;
  price: string;
  headline: string;
  sub: string;
  ctaLabel: string;
  ctaHref: string;
  updatedAt: string;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB de partida (se comprime después)
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

export default function AdminCampanaPage() {
  return (
    <AdminShell active="campana">
      <CampanaAdmin />
    </AdminShell>
  );
}

function CampanaAdmin() {
  const { token } = useAdminToken();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [price, setPrice] = useState("");
  const [headline, setHeadline] = useState("");
  const [sub, setSub] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/campaign", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      const b: Banner = body.banner;
      setBanner(b);
      setImageDataUrl(b.imageDataUrl);
      setPrice(b.price);
      setHeadline(b.headline);
      setSub(b.sub);
      setCtaLabel(b.ctaLabel);
      setCtaHref(b.ctaHref);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("La imagen pesa demasiado. Usa una de menos de 10 MB.");
      return;
    }
    setProcessingImage(true);
    try {
      const dataUrl = await resizeImageFile(file);
      setImageDataUrl(dataUrl);
    } catch {
      setError("No se pudo procesar la imagen. Prueba con otro archivo.");
    }
    setProcessingImage(false);
  }

  async function handleSave() {
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ imageDataUrl, price, headline, sub, ctaLabel, ctaHref }),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setBanner(body.banner);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      } else {
        setError(body.error ?? "No se pudo guardar.");
      }
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="text-[22px] font-extrabold text-navy">Banner de campaña</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Se muestra en la home, entre &ldquo;Elige tu seguro&rdquo; y &ldquo;Por qué elegirnos&rdquo;. Los cambios se aplican al instante.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {banner && (
        <div className="mt-5 flex flex-col gap-4">
          {/* Vista previa */}
          <div
            className={`relative overflow-hidden rounded-[20px] px-5 py-8 text-white ${!imageDataUrl ? "bg-gradient-to-br from-navy to-navy-deep" : ""}`}
            style={imageDataUrl ? {
              backgroundImage: `linear-gradient(to bottom right, rgba(18,32,79,.85), rgba(18,32,79,.55)), url(${imageDataUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
            } : undefined}
          >
            <span className="inline-flex items-center rounded-pill bg-brand-red px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide text-white">
              {price || "Precio de campaña"}
            </span>
            <h2 className="mt-3 text-[20px] font-extrabold leading-tight">{headline || "Titular del banner"}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/85">{sub || "Texto secundario del banner."}</p>
            <span className="mt-4 inline-flex items-center justify-center rounded-card bg-white px-4 py-2.5 text-[13px] font-semibold text-navy">
              {ctaLabel || "Texto del botón"}
            </span>
          </div>

          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Imagen de fondo</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="text-[13px]" />
            {processingImage && <span className="ml-2 text-[12px] text-slate2">Procesando…</span>}
            {imageDataUrl && (
              <button
                type="button"
                onClick={() => { setImageDataUrl(""); if (fileRef.current) fileRef.current.value = ""; }}
                className="ml-3 text-[12px] font-semibold text-brand-red underline"
              >
                Quitar imagen
              </button>
            )}
          </label>

          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink">Precio de campaña (badge)</span>
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Desde 35€/mes"
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>

          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink">Titular</span>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>

          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink">Texto secundario</span>
            <textarea value={sub} onChange={(e) => setSub(e.target.value)} rows={2}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>

          <div className="flex gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-[12px] font-semibold text-ink">Texto del botón</span>
              <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[12px] font-semibold text-ink">Enlace del botón</span>
              <input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/tarificador"
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
            </label>
          </div>

          <button onClick={handleSave} disabled={saving || processingImage}
            className="flex items-center justify-center rounded-card bg-navy px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40">
            {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
          </button>
        </div>
      )}
    </main>
  );
}
