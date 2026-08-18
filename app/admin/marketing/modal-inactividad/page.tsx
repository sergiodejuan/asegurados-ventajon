"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { DEFAULT_INACTIVITY_MODAL, type InactivityModalConfig } from "@/lib/inactivityModal";

const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 900;

// Redimensiona/comprime la imagen en el navegador antes de subirla como data
// URL (mismo patrón que /admin/productos con los logos).
function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ModalInactividadPage() {
  return (
    <AdminShell active="modal-inactividad">
      <ModalInactividadAdmin />
    </AdminShell>
  );
}

function ModalInactividadAdmin() {
  const { token } = useAdminToken();
  const [cfg, setCfg] = useState<InactivityModalConfig>(DEFAULT_INACTIVITY_MODAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/inactivity-modal", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setCfg({ ...DEFAULT_INACTIVITY_MODAL, ...body.config });
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof InactivityModalConfig>(key: K, value: InactivityModalConfig[K]) {
    setCfg((c) => ({ ...c, [key]: value }));
  }

  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError(null);
    if (file.size > MAX_IMAGE_FILE_BYTES) { setImgError("El archivo pesa demasiado. Usa uno de menos de 5 MB."); return; }
    setProcessing(true);
    try { set("imagenUrl", await resizeImageFile(file)); }
    catch { setImgError("No se pudo procesar la imagen. Prueba con otro archivo."); }
    setProcessing(false);
  }

  async function save() {
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch("/api/admin/inactivity-modal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(cfg),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo guardar."); setSaving(false); return; }
      setCfg({ ...DEFAULT_INACTIVITY_MODAL, ...body.config });
      setSaved(true); setTimeout(() => setSaved(false), 1800);
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="text-[22px] font-extrabold text-navy">Modal de inactividad (comparativa)</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Se muestra en la comparativa cuando el usuario pasa unos segundos sin actividad. Sirve para
        re-enganchar y llevarle a tarificar o a que le llamen. Los cambios se aplican al instante.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading ? (
        <p className="mt-4 text-[13px] text-slate2">Cargando…</p>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* Formulario */}
          <div className="flex flex-col gap-4">
            <label className="flex items-center justify-between gap-3 rounded-card border border-hair bg-white px-4 py-3">
              <span className="text-[14px] font-semibold text-ink">Modal activo</span>
              <input type="checkbox" checked={cfg.activo} onChange={(e) => set("activo", e.target.checked)} className="h-5 w-5 accent-navy" />
            </label>

            <div className="flex gap-3">
              <label className="flex-1">
                <span className="mb-1 block text-[12px] font-semibold text-ink">Segundos de inactividad</span>
                <input inputMode="numeric" value={String(cfg.segundos)} onChange={(e) => set("segundos", Number(e.target.value.replace(/\D/g, "")) || 0)}
                  className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-[12px] font-semibold text-ink">Veces máx. por sesión</span>
                <input inputMode="numeric" value={String(cfg.maxPorSesion)} onChange={(e) => set("maxPorSesion", Number(e.target.value.replace(/\D/g, "")) || 1)}
                  className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
              </label>
            </div>

            <div className="rounded-card border border-hair bg-white p-4">
              <span className="mb-1 block text-[12px] font-semibold text-ink">Imagen de fondo</span>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {cfg.imagenUrl && <img src={cfg.imagenUrl} alt="" className="h-12 w-16 rounded border border-hair object-cover" />}
                <input ref={fileRef} type="file" accept="image/*" onChange={onImageChange} className="text-[13px]" />
                {processing && <span className="text-[12px] text-slate2">Procesando…</span>}
              </div>
              <label className="mt-2 block">
                <span className="mb-1 block text-[11px] font-semibold text-slate2">…o pega un enlace https:// de imagen</span>
                <input value={cfg.imagenUrl.startsWith("data:") ? "" : cfg.imagenUrl} onChange={(e) => set("imagenUrl", e.target.value)}
                  placeholder="https://…" className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
              </label>
              {cfg.imagenUrl && (
                <button type="button" onClick={() => { set("imagenUrl", ""); if (fileRef.current) fileRef.current.value = ""; }}
                  className="mt-1.5 text-[12px] font-semibold text-brand-red underline">Quitar imagen</button>
              )}
              {imgError && <p role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{imgError}</p>}
            </div>

            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Rótulo (eyebrow)</span>
              <input value={cfg.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} placeholder="DESDE"
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Título</span>
              <input value={cfg.titulo} onChange={(e) => set("titulo", e.target.value)}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Precio / titular grande</span>
              <input value={cfg.precioTexto} onChange={(e) => set("precioTexto", e.target.value)}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Descripción</span>
              <textarea value={cfg.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={2}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-card border border-hair bg-white px-4 py-3">
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-ink">Capturar teléfono en el modal</span>
                <span className="block text-[12px] text-slate2">Muestra un campo de teléfono + botón (registra la llamada). Si lo desactivas, el botón es solo un enlace.</span>
              </span>
              <input type="checkbox" checked={cfg.capturaTelefono} onChange={(e) => set("capturaTelefono", e.target.checked)} className="h-5 w-5 shrink-0 accent-navy" />
            </label>

            <div className="flex gap-3">
              <label className="flex-1">
                <span className="mb-1 block text-[12px] font-semibold text-ink">Texto del botón</span>
                <input value={cfg.ctaTexto} onChange={(e) => set("ctaTexto", e.target.value)}
                  className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
              </label>
              {!cfg.capturaTelefono && (
                <label className="flex-1">
                  <span className="mb-1 block text-[12px] font-semibold text-ink">Enlace del botón</span>
                  <input value={cfg.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} placeholder="/tarificador"
                    className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
                </label>
              )}
            </div>

            <label>
              <span className="mb-1 block text-[12px] font-semibold text-ink">Páginas donde se muestra (una por línea)</span>
              <textarea
                value={cfg.paginas.join("\n")}
                onChange={(e) => set("paginas", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                rows={4}
                placeholder={"/comparativa\n/seguro-de-salud\n/lp/*"}
                className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] tnums"
              />
              <span className="mt-1 block text-[11px] leading-relaxed text-slate2">
                Rutas exactas (p.ej. <code>/comparativa</code>) o con comodín de prefijo acabando en <code>*</code> (p.ej. <code>/lp/*</code> para todas las landings).
                Déjalo vacío para mostrarlo en todas las páginas (nunca en admin ni en el área de cliente).
              </span>
            </label>

            <button onClick={save} disabled={saving}
              className="flex items-center justify-center rounded-card bg-navy px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40">
              {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
            </button>
          </div>

          {/* Vista previa */}
          <div className="lg:sticky lg:top-6">
            <p className="mb-2 text-[12px] font-semibold text-slate2">Vista previa</p>
            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[24px] bg-navy shadow-card">
              <div
                className="relative flex min-h-[420px] flex-col justify-end p-6"
                style={cfg.imagenUrl ? { backgroundImage: `url(${cfg.imagenUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              >
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
                <div className="relative">
                  {cfg.titulo && <h3 className="text-[26px] font-extrabold leading-tight text-white">{cfg.titulo}</h3>}
                  {cfg.eyebrow && <p className="mt-3 text-[12px] font-bold uppercase tracking-wide text-white/70">{cfg.eyebrow}</p>}
                  {cfg.precioTexto && <p className="mt-0.5 text-[28px] font-extrabold leading-tight text-white">{cfg.precioTexto}</p>}
                  {cfg.descripcion && <p className="mt-3 text-[15px] leading-relaxed text-white/85">{cfg.descripcion}</p>}
                  {cfg.capturaTelefono ? (
                    <div className="mt-5 flex items-stretch gap-1.5 rounded-pill bg-white p-1">
                      <span className="min-w-0 flex-1 px-3 py-2.5 text-[15px] text-slate2/60">Tu teléfono</span>
                      <span className="shrink-0 rounded-pill bg-brand-red px-4 py-2.5 text-[14px] font-bold text-white">{cfg.ctaTexto || "Que me llamen gratis"}</span>
                    </div>
                  ) : (
                    <div className="mt-5 flex w-full items-center justify-center rounded-pill bg-brand-red px-5 py-4 text-[16px] font-bold text-white">
                      {cfg.ctaTexto || "Ver mi precio"}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!cfg.activo && <p className="mt-2 text-center text-[12px] font-medium text-brand-red">Desactivado: no se muestra en la web.</p>}
          </div>
        </div>
      )}
    </main>
  );
}
