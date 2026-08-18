"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { PRICING_ZONAS, copagoTexto, type ProductPricing, type TramoEdad, type DescuentoAsegurados, type PricingZona, type CopagoModo } from "@/lib/catalog";

type Product = {
  id: string;
  producto: "salud" | "vida" | "auto" | "decesos";
  compania: string;
  titulo?: string;
  activo: boolean;
  destacado: boolean;
  orden: number;
  logoUrl?: string;
  precioConCopago?: number;
  precioSinCopago?: number;
  modalidadCopago?: CopagoModo;
  dental?: boolean;
  precio?: number;
  pricing?: ProductPricing;
  condiciones: string;
  servicios: string[];
  updatedAt: string;
};

const MAX_LOGO_FILE_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_WIDTH = 300;

function resizeLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        const scale = Math.min(1, MAX_LOGO_WIDTH / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        // PNG para conservar transparencia (logos suelen llevarla).
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminProductosPage() {
  return (
    <AdminShell active="productos">
      <ProductsAdmin />
    </AdminShell>
  );
}

function ProductsAdmin() {
  const { token } = useAdminToken();
  const [producto, setProducto] = useState<"salud" | "vida" | "auto" | "decesos">("salud");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/products?producto=${producto}`, { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setProducts(body.products);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [producto, token]);

  useEffect(() => { load(); }, [load]);

  async function save(id: string, patch: Partial<Product>) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (res.ok && body.ok) {
      setProducts((prev) => prev.map((p) => (p.id === id ? body.product : p)));
    }
    return res.ok;
  }

  async function toggle(p: Product, field: "activo" | "destacado") {
    await save(p.id, { [field]: !p[field] });
  }

  async function createNew(compania: string) {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({
        producto, compania, activo: true, destacado: false, orden: products.length + 1,
        condiciones: "", servicios: [],
        ...(producto === "salud" ? { precioConCopago: 0, precioSinCopago: 0 } : { precio: 0 }),
      }),
    });
    const body = await res.json();
    if (res.ok && body.ok) {
      setProducts((prev) => [...prev, body.product]);
      setEditingId(body.product.id);
    }
    setCreating(false);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) setEditingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <h1 className="text-[22px] font-extrabold text-navy">Productos y precios</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Precios, condiciones y servicios que se muestran en la comparativa pública. Los cambios se aplican al instante.
      </p>

      <div role="tablist" aria-label="Producto" className="mt-4 flex gap-2">
        {(["salud", "vida", "auto", "decesos"] as const).map((p) => (
          <button key={p} onClick={() => setProducto(p)}
            className={`rounded-pill px-4 py-1.5 text-[13px] font-semibold capitalize transition-colors ${producto === p ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
            Seguro de {p}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      <ul className="mt-4 flex flex-col gap-3">
        {products.map((p) => (
          <li key={p.id} className="rounded-card border border-hair bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.logoUrl && <img src={p.logoUrl} alt="" className="h-7 w-auto max-w-[80px] object-contain" />}
                <p className="text-[16px] font-bold text-ink">{p.compania}{p.titulo ? <span className="font-medium text-slate2"> · {p.titulo}</span> : null}</p>
                {p.destacado && <span className="rounded-pill bg-brand-red/10 px-2 py-0.5 text-[11px] font-bold text-brand-red">Recomendado</span>}
                {!p.activo && <span className="rounded-pill bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">Oculto</span>}
              </div>
              <div className="flex items-center gap-2 text-[13px] tnums text-slate2">
                {producto === "salud"
                  ? <span>Con {p.precioConCopago ?? 0} € · Sin {p.precioSinCopago ?? 0} €/mes</span>
                  : <span>Desde {p.precio ?? 0} €/mes</span>}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => toggle(p, "activo")}
                className={`rounded-pill px-3 py-1 text-[12px] font-semibold transition-colors ${p.activo ? "border border-hair bg-white text-navy hover:bg-mist" : "bg-navy text-white"}`}>
                {p.activo ? "Ocultar de la web" : "Mostrar en la web"}
              </button>
              <button onClick={() => toggle(p, "destacado")}
                className={`rounded-pill px-3 py-1 text-[12px] font-semibold transition-colors ${p.destacado ? "bg-brand-red text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
                {p.destacado ? "Quitar de recomendado" : "Marcar como recomendado"}
              </button>
              <button onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                className="rounded-pill border border-hair bg-white px-3 py-1 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
                {editingId === p.id ? "Cerrar edición" : "Editar precio, condiciones y servicios"}
              </button>
              <button onClick={() => remove(p.id)}
                className="ml-auto rounded-pill px-3 py-1 text-[12px] font-semibold text-brand-red transition-colors hover:bg-brand-red/10">
                Eliminar
              </button>
            </div>

            {editingId === p.id && <ProductEditor product={p} onSave={(patch) => save(p.id, patch)} />}
          </li>
        ))}
      </ul>

      {creating ? (
        <NewCompanyForm onCreate={createNew} onCancel={() => setCreating(false)} />
      ) : (
        <button onClick={() => setCreating(true)}
          className="mt-4 flex w-full items-center justify-center rounded-card border border-dashed border-hair px-5 py-3.5 text-[14px] font-semibold text-navy transition-colors hover:bg-mist">
          + Añadir compañía a seguro de {producto}
        </button>
      )}
    </main>
  );
}

function ProductEditor({ product, onSave }: { product: Product; onSave: (patch: Partial<Product>) => Promise<boolean> }) {
  const [titulo, setTitulo] = useState(product.titulo ?? "");
  const [conCopago, setConCopago] = useState(String(product.precioConCopago ?? ""));
  const [sinCopago, setSinCopago] = useState(String(product.precioSinCopago ?? ""));
  const [modalidadCopago, setModalidadCopago] = useState<CopagoModo>(product.modalidadCopago ?? "sin");
  const [dental, setDental] = useState<boolean>(product.dental ?? false);
  const [precio, setPrecio] = useState(String(product.precio ?? ""));
  const [orden, setOrden] = useState(String(product.orden ?? 1));
  const [condiciones, setCondiciones] = useState(product.condiciones ?? "");
  const [servicios, setServicios] = useState(product.servicios.join("\n"));
  const [pricing, setPricing] = useState<ProductPricing>(product.pricing ?? { tramos: [], descuentos: [] });
  const [logoUrl, setLogoUrl] = useState(product.logoUrl ?? "");
  const [processingLogo, setProcessingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (file.size > MAX_LOGO_FILE_BYTES) { setLogoError("El archivo pesa demasiado. Usa uno de menos de 5 MB."); return; }
    setProcessingLogo(true);
    try { setLogoUrl(await resizeLogoFile(file)); }
    catch { setLogoError("No se pudo procesar la imagen. Prueba con otro archivo."); }
    setProcessingLogo(false);
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    const patch: Partial<Product> =
      product.producto === "salud"
        ? { precioConCopago: Number(conCopago) || 0, precioSinCopago: Number(sinCopago) || 0, modalidadCopago, dental }
        : { precio: Number(precio) || 0 };
    patch.titulo = titulo.trim();
    patch.orden = Number(orden) || 1;
    patch.condiciones = condiciones;
    patch.servicios = servicios.split("\n").map((s) => s.trim()).filter(Boolean);
    patch.logoUrl = logoUrl;
    // Guardamos siempre el objeto pricing (aunque venga vacío): con listas
    // vacías la comparativa cae al precio plano de arriba.
    patch.pricing = pricing;
    const ok = await onSave(patch);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 1800); }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-card border border-hair bg-mist p-4">
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-ink">Logo de la compañía</span>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoUrl && <img src={logoUrl} alt="" className="h-9 w-auto max-w-[100px] rounded border border-hair bg-white object-contain p-1" />}
          <input ref={fileRef} type="file" accept="image/*" onChange={onLogoChange} className="text-[13px]" />
          {processingLogo && <span className="text-[12px] text-slate2">Procesando…</span>}
        </div>
        {logoUrl && (
          <button type="button" onClick={() => { setLogoUrl(""); if (fileRef.current) fileRef.current.value = ""; }}
            className="mt-1.5 text-[12px] font-semibold text-brand-red underline">
            Quitar logo
          </button>
        )}
        {logoError && <p role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{logoError}</p>}
        <p className="mt-1 text-[11px] leading-relaxed text-slate2">
          Solo sube logos que tengas autorización para usar. Sin logo, se muestra el nombre de la compañía en texto.
        </p>
      </label>

      <label>
        <span className="mb-1 block text-[12px] font-semibold text-ink">Título / modalidad (se muestra en la tarjeta)</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="p.ej. Salud Completa Plus"
          className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
        <span className="mt-1 block text-[11px] leading-relaxed text-slate2">Aparece bajo la compañía en la comparativa, como la modalidad de las opciones de Codeoscopic.</span>
      </label>

      {product.producto === "salud" ? (
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3 rounded-card border border-hair bg-white px-4 py-3">
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink">Incluye cobertura dental</span>
              <span className="block text-[11px] text-slate2">Marca esta opción si el producto lleva dental; alimenta los filtros "Con dental" / "Sin dental".</span>
            </span>
            <input type="checkbox" checked={dental} onChange={(e) => setDental(e.target.checked)} className="h-5 w-5 shrink-0 accent-navy" />
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink">Modalidad de copago</span>
            <select value={modalidadCopago} onChange={(e) => setModalidadCopago(e.target.value as CopagoModo)}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] font-semibold">
              <option value="sin">Sin copago (recomendado para negociadas)</option>
              <option value="con">Con copago</option>
              <option value="ambas">Con y sin copago (ambas)</option>
            </select>
            <span className="mt-1 block text-[11px] leading-relaxed text-slate2">{copagoTexto(modalidadCopago)}</span>
          </label>
          <div className="flex gap-3">
            {(modalidadCopago === "con" || modalidadCopago === "ambas") && (
              <label className="flex-1">
                <span className="mb-1 block text-[12px] font-semibold text-ink">Precio con copago (€/mes)</span>
                <input inputMode="decimal" value={conCopago} onChange={(e) => setConCopago(e.target.value.replace(/[^\d.]/g, ""))}
                  className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
              </label>
            )}
            {(modalidadCopago === "sin" || modalidadCopago === "ambas") && (
              <label className="flex-1">
                <span className="mb-1 block text-[12px] font-semibold text-ink">Precio sin copago (€/mes)</span>
                <input inputMode="decimal" value={sinCopago} onChange={(e) => setSinCopago(e.target.value.replace(/[^\d.]/g, ""))}
                  className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
              </label>
            )}
          </div>
        </div>
      ) : (
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-ink">Precio (€/mes)</span>
          <input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value.replace(/[^\d.]/g, ""))}
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
        </label>
      )}

      <AdvancedPricingEditor producto={product.producto} pricing={pricing} onChange={setPricing} />

      <label>
        <span className="mb-1 block text-[12px] font-semibold text-ink">Orden en la comparativa (menor = primero)</span>
        <input inputMode="numeric" value={orden} onChange={(e) => setOrden(e.target.value.replace(/\D/g, ""))}
          className="w-full max-w-[120px] rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
      </label>

      <label>
        <span className="mb-1 block text-[12px] font-semibold text-ink">Servicios incluidos (uno por línea)</span>
        <textarea value={servicios} onChange={(e) => setServicios(e.target.value)} rows={4}
          className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
      </label>

      <label>
        <span className="mb-1 block text-[12px] font-semibold text-ink">Condiciones</span>
        <textarea value={condiciones} onChange={(e) => setCondiciones(e.target.value)} rows={3}
          className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
      </label>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center justify-center rounded-card bg-navy px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40">
        {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
      </button>
    </div>
  );
}

// Configurador de precios por tramo de edad + zona (Canarias/Baleares/
// Península) y de descuentos por nº de asegurados. Todo opcional: sin tramos
// se usa el precio plano; los cambios se reflejan en la comparativa.
function AdvancedPricingEditor({
  producto, pricing, onChange,
}: {
  producto: "salud" | "vida" | "auto" | "decesos";
  pricing: ProductPricing;
  onChange: (p: ProductPricing) => void;
}) {
  const tramos = pricing.tramos ?? [];
  const descuentos = pricing.descuentos ?? [];
  const esSalud = producto === "salud";

  const updateTramos = (next: TramoEdad[]) => onChange({ ...pricing, tramos: next });
  const updateDescuentos = (next: DescuentoAsegurados[]) => onChange({ ...pricing, descuentos: next });

  function setTramoEdad(i: number, field: "min" | "max", v: string) {
    updateTramos(tramos.map((t, k) => (k === i ? { ...t, [field]: Number(v.replace(/\D/g, "")) || 0 } : t)));
  }
  function setZonaPrecio(i: number, zona: PricingZona, field: "conCopago" | "sinCopago" | "precio", v: string) {
    const num = v === "" ? undefined : Number(v.replace(/[^\d.]/g, ""));
    updateTramos(tramos.map((t, k) => {
      if (k !== i) return t;
      return { ...t, porZona: { ...t.porZona, [zona]: { ...(t.porZona[zona] ?? {}), [field]: num } } };
    }));
  }
  function setDescuento(i: number, patch: Partial<DescuentoAsegurados>) {
    updateDescuentos(descuentos.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  }

  return (
    <div className="rounded-card border border-hair bg-white p-3">
      <p className="text-[13px] font-bold text-navy">Precios por tramo de edad y zona</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate2">
        Opcional. Si no defines tramos, se usa el precio de arriba para todas las edades y zonas.
        La comparativa elige el tramo según la edad del titular y su zona (Canarias / Baleares / Península).
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {tramos.map((t, i) => (
          <div key={i} className="rounded-card border border-hair bg-mist/40 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-ink">Edad desde</span>
                <input inputMode="numeric" value={String(t.min)} onChange={(e) => setTramoEdad(i, "min", e.target.value)}
                  className="w-20 rounded-card border border-hair bg-white px-2 py-1.5 text-[13px] tnums" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-ink">hasta</span>
                <input inputMode="numeric" value={String(t.max)} onChange={(e) => setTramoEdad(i, "max", e.target.value)}
                  className="w-20 rounded-card border border-hair bg-white px-2 py-1.5 text-[13px] tnums" />
              </label>
              <button type="button" onClick={() => updateTramos(tramos.filter((_, k) => k !== i))}
                className="ml-auto rounded-pill px-2.5 py-1 text-[12px] font-semibold text-brand-red hover:bg-brand-red/10">
                Eliminar tramo
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {PRICING_ZONAS.map((z) => (
                <div key={z.key} className="flex flex-wrap items-center gap-2">
                  <span className="w-20 shrink-0 text-[12px] font-semibold text-ink">{z.label}</span>
                  {esSalud ? (
                    <>
                      <label className="flex items-center gap-1">
                        <span className="text-[11px] text-slate2">con</span>
                        <input inputMode="decimal" value={t.porZona[z.key]?.conCopago ?? ""} onChange={(e) => setZonaPrecio(i, z.key, "conCopago", e.target.value)}
                          className="w-20 rounded-card border border-hair bg-white px-2 py-1.5 text-[13px] tnums" placeholder="€/mes" />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="text-[11px] text-slate2">sin</span>
                        <input inputMode="decimal" value={t.porZona[z.key]?.sinCopago ?? ""} onChange={(e) => setZonaPrecio(i, z.key, "sinCopago", e.target.value)}
                          className="w-20 rounded-card border border-hair bg-white px-2 py-1.5 text-[13px] tnums" placeholder="€/mes" />
                      </label>
                    </>
                  ) : (
                    <label className="flex items-center gap-1">
                      <span className="text-[11px] text-slate2">precio</span>
                      <input inputMode="decimal" value={t.porZona[z.key]?.precio ?? ""} onChange={(e) => setZonaPrecio(i, z.key, "precio", e.target.value)}
                        className="w-24 rounded-card border border-hair bg-white px-2 py-1.5 text-[13px] tnums" placeholder="€/mes" />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => updateTramos([...tramos, { min: 0, max: 120, porZona: {} }])}
          className="self-start rounded-card border border-dashed border-hair px-3 py-2 text-[13px] font-semibold text-navy hover:bg-mist">
          + Añadir tramo de edad
        </button>
      </div>

      <p className="mt-4 text-[13px] font-bold text-navy">Descuento por nº de asegurados</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate2">
        Opcional. Se aplica a la prima mensual total cuando el nº de asegurados alcanza el umbral.
        Si defines varios, se aplica el de umbral más alto que no supere el nº de asegurados.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {descuentos.map((d, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-slate2">A partir de</span>
            <input inputMode="numeric" value={String(d.desde)} onChange={(e) => setDescuento(i, { desde: Number(e.target.value.replace(/\D/g, "")) || 1 })}
              className="w-16 rounded-card border border-hair bg-white px-2 py-1.5 text-[13px] tnums" />
            <span className="text-[12px] text-slate2">asegurados:</span>
            <input inputMode="decimal" value={String(d.valor)} onChange={(e) => setDescuento(i, { valor: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })}
              className="w-20 rounded-card border border-hair bg-white px-2 py-1.5 text-[13px] tnums" />
            <select value={d.tipo} onChange={(e) => setDescuento(i, { tipo: e.target.value as "eur" | "pct" })}
              className="rounded-card border border-hair bg-white px-2 py-1.5 text-[13px] font-semibold">
              <option value="pct">% de descuento</option>
              <option value="eur">€ de descuento</option>
            </select>
            <button type="button" onClick={() => updateDescuentos(descuentos.filter((_, k) => k !== i))}
              className="ml-auto rounded-pill px-2.5 py-1 text-[12px] font-semibold text-brand-red hover:bg-brand-red/10">
              Eliminar
            </button>
          </div>
        ))}
        <button type="button" onClick={() => updateDescuentos([...descuentos, { desde: 2, tipo: "pct", valor: 0 }])}
          className="self-start rounded-card border border-dashed border-hair px-3 py-2 text-[13px] font-semibold text-navy hover:bg-mist">
          + Añadir descuento
        </button>
      </div>
    </div>
  );
}

function NewCompanyForm({ onCreate, onCancel }: { onCreate: (compania: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="mt-4 flex gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la compañía…"
        className="flex-1 rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]" />
      <button onClick={() => name.trim() && onCreate(name.trim())} disabled={!name.trim()}
        className="rounded-card bg-navy px-4 py-2.5 text-[14px] font-semibold text-white disabled:bg-slate2/40">
        Añadir
      </button>
      <button onClick={onCancel} className="rounded-card border border-hair px-4 py-2.5 text-[14px] font-semibold text-navy hover:bg-mist">
        Cancelar
      </button>
    </div>
  );
}
