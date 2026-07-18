"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { IconByName } from "@/components/icons";
import { makeExitIntentId, type ExitIntentCampaign, type ExitIntentConfig } from "@/lib/exitIntentCampaign";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.75;

const ICON_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Sin icono" },
  { value: "flower", label: "Salud" },
  { value: "life", label: "Vida" },
  { value: "car", label: "Auto" },
  { value: "home", label: "Hogar" },
  { value: "shield", label: "Escudo / seguridad" },
  { value: "compare", label: "Comparar" },
  { value: "doc", label: "Documento" },
  { value: "pin", label: "Ubicación" },
];

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

function newCampaign(): ExitIntentCampaign {
  return {
    id: makeExitIntentId(), nombre: "Nuevo exit-intent", activo: true, orden: 99,
    imagenUrl: "", iconName: "flower", colorPanel: "red",
    titulo: "Tu seguro desde X €/mes",
    ctaTexto: "Calcula tu precio", ctaHref: "/tarificador",
    ctaSecundarioPrefijo: "Si lo prefieres, ", ctaSecundarioTexto: "te llamamos gratis", ctaSecundarioHref: "/quiero-que-me-llamen",
    maxPorSesion: 1,
  };
}

export default function AdminExitIntentsPage() {
  return (
    <AdminShell active="exitintents">
      <ExitIntentsAdmin />
    </AdminShell>
  );
}

function ExitIntentsAdmin() {
  const { token } = useAdminToken();
  const [config, setConfig] = useState<ExitIntentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/exit-intents", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setConfig(body.config);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function updateCampaign(id: string, patch: Partial<ExitIntentCampaign>) {
    setConfig((c) => (c ? { ...c, campaigns: c.campaigns.map((x) => (x.id === id ? { ...x, ...patch } : x)) } : c));
  }

  function addCampaign() {
    setConfig((c) => (c ? { ...c, campaigns: [...c.campaigns, newCampaign()] } : c));
  }

  function removeCampaign(id: string) {
    setConfig((c) => (c ? { ...c, campaigns: c.campaigns.filter((x) => x.id !== id) } : c));
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch("/api/admin/exit-intents", {
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
      <h1 className="text-[22px] font-extrabold text-navy">Exit-intent de la web general</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Se muestra cuando alguien va a abandonar la web (fuera de los tarificadores, la comparativa y el
        formulario "quiero que me llamen", que ya tienen el suyo propio). Si hay varios activos, se muestra el
        de menor orden. Los cambios se aplican al instante.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {config && (
        <div className="mt-5 flex flex-col gap-4">
          {config.campaigns.map((c) => (
            <CampaignEditor
              key={c.id}
              campaign={c}
              canRemove={config.campaigns.length > 1}
              onChange={(patch) => updateCampaign(c.id, patch)}
              onRemove={() => removeCampaign(c.id)}
            />
          ))}

          <button onClick={addCampaign}
            className="flex items-center justify-center rounded-card border border-dashed border-hair px-5 py-3.5 text-[14px] font-semibold text-navy transition-colors hover:bg-mist">
            + Añadir exit-intent
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

function CampaignEditor({
  campaign, canRemove, onChange, onRemove,
}: {
  campaign: ExitIntentCampaign; canRemove: boolean;
  onChange: (patch: Partial<ExitIntentCampaign>) => void; onRemove: () => void;
}) {
  const [processingImage, setProcessingImage] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isDataUrl = campaign.imagenUrl.startsWith("data:");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError(null);
    if (file.size > MAX_FILE_BYTES) { setImgError("La imagen pesa demasiado. Usa una de menos de 10 MB."); return; }
    setProcessingImage(true);
    try { onChange({ imagenUrl: await resizeImageFile(file) }); }
    catch { setImgError("No se pudo procesar la imagen. Prueba con otro archivo."); }
    setProcessingImage(false);
  }

  return (
    <div className="rounded-[20px] border border-hair bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-ink">Nombre interno</span>
          <input value={campaign.nombre} onChange={(e) => onChange({ nombre: e.target.value })}
            className="rounded-card border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
        </label>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onChange({ activo: !campaign.activo })}
            className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold transition-colors ${campaign.activo ? "border border-hair text-navy hover:bg-mist" : "bg-navy text-white"}`}>
            {campaign.activo ? "Ocultar" : "Mostrar"}
          </button>
          <button type="button" onClick={onRemove} disabled={!canRemove} title={!canRemove ? "Debe quedar al menos uno" : "Eliminar"}
            className="rounded-pill px-2.5 py-1 text-[11px] font-semibold text-brand-red hover:bg-brand-red/10 disabled:opacity-30">
            Eliminar
          </button>
        </div>
      </div>

      {/* Vista previa fiel al diseño final: foto/icono arriba + panel de color */}
      <div className="mt-3 overflow-hidden rounded-[16px] border border-hair">
        <div className="relative flex h-28 items-center justify-center bg-mist">
          {campaign.imagenUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={campaign.imagenUrl} alt="" className="h-full w-full object-cover" />
          ) : campaign.iconName ? (
            <span className={`grid h-14 w-14 place-items-center rounded-full ${campaign.colorPanel === "red" ? "bg-brand-red" : "bg-navy"} text-white`}>
              <IconByName name={campaign.iconName} width={28} height={28} />
            </span>
          ) : (
            <span className="text-[12px] text-slate2">Sin foto ni icono</span>
          )}
          <span aria-hidden="true" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white text-ink shadow-soft">✕</span>
        </div>
        <div className={`px-5 py-6 text-center ${campaign.colorPanel === "red" ? "bg-brand-red" : "bg-navy"}`}>
          <p className="text-[16px] font-bold leading-snug text-white">{campaign.titulo || "Titular del exit-intent"}</p>
          <span className="mt-4 inline-flex items-center justify-center rounded-pill bg-white px-5 py-2.5 text-[13px] font-semibold text-ink">
            {campaign.ctaTexto || "Texto del botón"}
          </span>
          {(campaign.ctaSecundarioPrefijo || campaign.ctaSecundarioTexto) && (
            <p className="mt-3 text-[12px] text-white/90">
              {campaign.ctaSecundarioPrefijo}
              <span className="underline">{campaign.ctaSecundarioTexto}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink">Imagen superior — sube un archivo o pega un enlace</span>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="text-[13px]" />
            {processingImage && <span className="text-[12px] text-slate2">Procesando…</span>}
          </div>
          <input
            value={isDataUrl ? "" : campaign.imagenUrl}
            onChange={(e) => onChange({ imagenUrl: e.target.value })}
            placeholder={isDataUrl ? "Ya hay un archivo subido — quítalo para pegar un enlace" : "https://ejemplo.com/foto.jpg"}
            disabled={isDataUrl}
            className="mt-2 w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px] disabled:bg-mist disabled:text-slate2"
          />
          {campaign.imagenUrl && (
            <button type="button" onClick={() => { onChange({ imagenUrl: "" }); if (fileRef.current) fileRef.current.value = ""; }}
              className="mt-1.5 text-[12px] font-semibold text-brand-red underline">
              Quitar imagen
            </button>
          )}
          {imgError && <p role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{imgError}</p>}
          <p className="mt-1 text-[11px] leading-relaxed text-slate2">
            Sin imagen, se muestra el icono elegido abajo en su lugar (o nada, si tampoco hay icono).
          </p>
        </label>

        <label>
          <span className="mb-1 block text-[12px] font-semibold text-ink">Icono (si no hay imagen)</span>
          <select value={campaign.iconName} onChange={(e) => onChange({ iconName: e.target.value })}
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]">
            {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <div>
          <span className="mb-1 block text-[12px] font-semibold text-ink">Color del panel</span>
          <div className="flex gap-2">
            {(["red", "navy"] as const).map((c) => (
              <button key={c} type="button" onClick={() => onChange({ colorPanel: c })}
                className={`rounded-pill px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${campaign.colorPanel === c ? (c === "red" ? "bg-brand-red text-white" : "bg-navy text-white") : "border border-hair bg-white text-navy hover:bg-mist"}`}>
                {c === "red" ? "Rojo" : "Azul marino"}
              </button>
            ))}
          </div>
        </div>

        <label>
          <span className="mb-1 block text-[12px] font-semibold text-ink">Titular</span>
          <textarea value={campaign.titulo} onChange={(e) => onChange({ titulo: e.target.value })} rows={2}
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
        </label>

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Texto del botón principal</span>
            <input value={campaign.ctaTexto} onChange={(e) => onChange({ ctaTexto: e.target.value })}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Enlace del botón principal</span>
            <input value={campaign.ctaHref} onChange={(e) => onChange({ ctaHref: e.target.value })} placeholder="/tarificador"
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>
        </div>

        <p className="text-[12px] font-semibold text-ink">Enlace secundario (opcional, ej. "Si lo prefieres, te llamamos gratis")</p>
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-[11px] text-slate2">Texto previo (sin subrayar)</span>
            <input value={campaign.ctaSecundarioPrefijo} onChange={(e) => onChange({ ctaSecundarioPrefijo: e.target.value })} placeholder="Si lo prefieres, "
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-[11px] text-slate2">Texto del enlace (subrayado)</span>
            <input value={campaign.ctaSecundarioTexto} onChange={(e) => onChange({ ctaSecundarioTexto: e.target.value })} placeholder="te llamamos gratis"
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
          </label>
        </div>
        <label>
          <span className="mb-1 block text-[11px] text-slate2">Enlace del texto secundario</span>
          <input value={campaign.ctaSecundarioHref} onChange={(e) => onChange({ ctaSecundarioHref: e.target.value })} placeholder="/quiero-que-me-llamen"
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
        </label>

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Veces que aparece por sesión</span>
            <input type="number" min={1} max={10} value={campaign.maxPorSesion}
              onChange={(e) => onChange({ maxPorSesion: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Orden (menor = prioridad si hay varios activos)</span>
            <input type="number" min={1} value={campaign.orden}
              onChange={(e) => onChange({ orden: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
          </label>
        </div>
      </div>
    </div>
  );
}
