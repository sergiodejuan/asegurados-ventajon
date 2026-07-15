"use client";

import { useRef, useState } from "react";

export const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;

export function resizeImageFile(file: File, maxWidth: number, mime: "image/png" | "image/jpeg", quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL(mime, mime === "image/jpeg" ? quality : undefined));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageField({
  label, hint, value, onChange, maxWidth, mime, preview, wide,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  maxWidth: number; mime: "image/png" | "image/jpeg"; preview: string; wide?: boolean;
}) {
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    if (file.size > MAX_IMAGE_FILE_BYTES) { setErr("El archivo pesa demasiado (máx. 10 MB)."); return; }
    setProcessing(true);
    try { onChange(await resizeImageFile(file, maxWidth, mime)); }
    catch { setErr("No se pudo procesar la imagen."); }
    setProcessing(false);
  }

  return (
    <label className="mt-3 block first:mt-0">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      <div className={`flex items-center gap-3 ${wide ? "" : ""}`}>
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={`shrink-0 rounded border border-hair bg-mist object-contain p-1 ${preview}`} />
        )}
        <div className="min-w-0 flex-1">
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="text-[13px]" />
          {processing && <span className="ml-2 text-[12px] text-slate2">Procesando…</span>}
        </div>
        {value && (
          <button type="button" onClick={() => { onChange(""); if (fileRef.current) fileRef.current.value = ""; }}
            className="shrink-0 text-[12px] font-semibold text-brand-red underline">
            Quitar
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-slate2">{hint}</p>}
      {err && <p role="alert" className="mt-1 text-[11px] font-medium text-brand-red">{err}</p>}
    </label>
  );
}
