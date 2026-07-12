"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type Product = {
  id: string;
  producto: "salud" | "vida";
  compania: string;
  activo: boolean;
  destacado: boolean;
  orden: number;
  precioConCopago?: number;
  precioSinCopago?: number;
  precio?: number;
  condiciones: string;
  servicios: string[];
  updatedAt: string;
};

export default function AdminProductosPage() {
  return (
    <AdminShell active="productos">
      <ProductsAdmin />
    </AdminShell>
  );
}

function ProductsAdmin() {
  const { token } = useAdminToken();
  const [producto, setProducto] = useState<"salud" | "vida">("salud");
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
        {(["salud", "vida"] as const).map((p) => (
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
                <p className="text-[16px] font-bold text-ink">{p.compania}</p>
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
          + Añadir compañía a {producto === "salud" ? "seguro de salud" : "seguro de vida"}
        </button>
      )}
    </main>
  );
}

function ProductEditor({ product, onSave }: { product: Product; onSave: (patch: Partial<Product>) => Promise<boolean> }) {
  const [conCopago, setConCopago] = useState(String(product.precioConCopago ?? ""));
  const [sinCopago, setSinCopago] = useState(String(product.precioSinCopago ?? ""));
  const [precio, setPrecio] = useState(String(product.precio ?? ""));
  const [orden, setOrden] = useState(String(product.orden ?? 1));
  const [condiciones, setCondiciones] = useState(product.condiciones ?? "");
  const [servicios, setServicios] = useState(product.servicios.join("\n"));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true); setSaved(false);
    const patch: Partial<Product> =
      product.producto === "salud"
        ? { precioConCopago: Number(conCopago) || 0, precioSinCopago: Number(sinCopago) || 0 }
        : { precio: Number(precio) || 0 };
    patch.orden = Number(orden) || 1;
    patch.condiciones = condiciones;
    patch.servicios = servicios.split("\n").map((s) => s.trim()).filter(Boolean);
    const ok = await onSave(patch);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 1800); }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-card border border-hair bg-mist p-4">
      {product.producto === "salud" ? (
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Precio con copago (€/mes)</span>
            <input inputMode="decimal" value={conCopago} onChange={(e) => setConCopago(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-[12px] font-semibold text-ink">Precio sin copago (€/mes)</span>
            <input inputMode="decimal" value={sinCopago} onChange={(e) => setSinCopago(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
          </label>
        </div>
      ) : (
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-ink">Precio (€/mes)</span>
          <input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value.replace(/[^\d.]/g, ""))}
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
        </label>
      )}

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
