"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { CampaignBannersPanel } from "@/components/admin/CampaignBannersPanel";
import { isPromotionActive, type Promotion } from "@/lib/promotions";

function fmt(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(iso)); }
  catch { return iso; }
}

type Tab = "promociones" | "campana";

export default function AdminPromocionesPage() {
  return (
    <Suspense fallback={null}>
      <AdminPromocionesPageInner />
    </Suspense>
  );
}

function AdminPromocionesPageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "campana" ? "campana" : "promociones");

  return (
    <AdminShell active={tab === "campana" ? "campana" : "promociones"}>
      <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold text-navy">Promociones</h1>
            <p className="mt-1 text-[13px] leading-relaxed text-slate2">
              Promociones (con página propia en /promociones) y banners de campaña de la Home, en un mismo sitio:
              ambos alimentan el carrusel de la portada, así que aquí eliges qué se muestra ahí.
            </p>
          </div>
          {tab === "promociones" && (
            <a href="/admin/promociones/nueva"
              className="shrink-0 rounded-card bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
              + Nueva promoción
            </a>
          )}
        </div>

        <div className="mt-5 flex overflow-hidden rounded-pill border border-hair" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "promociones"} onClick={() => setTab("promociones")}
            className={`px-4 py-2 text-[13px] font-semibold transition-colors ${tab === "promociones" ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
            Promociones
          </button>
          <button type="button" role="tab" aria-selected={tab === "campana"} onClick={() => setTab("campana")}
            className={`px-4 py-2 text-[13px] font-semibold transition-colors ${tab === "campana" ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
            Banners de campaña
          </button>
        </div>

        <div className="mt-5">
          {tab === "promociones" ? <PromocionesAdmin /> : <CampaignBannersPanel />}
        </div>
      </main>
    </AdminShell>
  );
}

function PromocionesAdmin() {
  const { token } = useAdminToken();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/promotions", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setPromotions(body.promotions);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta promoción? No se puede deshacer.")) return;
    const res = await fetch(`/api/admin/promotions/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.ok) setPromotions((ps) => ps.filter((p) => p.id !== id));
  }

  async function toggleMostrarEnHome(p: Promotion) {
    const mostrarEnHome = !p.mostrarEnHome;
    setPromotions((ps) => ps.map((x) => (x.id === p.id ? { ...x, mostrarEnHome } : x)));
    const res = await fetch(`/api/admin/promotions/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ mostrarEnHome }),
    });
    if (!res.ok) setPromotions((ps) => ps.map((x) => (x.id === p.id ? { ...x, mostrarEnHome: !mostrarEnHome } : x)));
  }

  return (
    <>
      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && promotions.length === 0 && <p className="mt-6 text-[13px] text-slate2">Todavía no hay promociones.</p>}

      <ul className="mt-1 flex flex-col gap-3">
        {promotions.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 rounded-card border border-hair bg-white p-4 shadow-soft sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.imagenUrl ? (
                <img src={p.imagenUrl} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-mist text-[11px] font-semibold text-slate2">Sin foto</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.status === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {p.status === "publicado" ? "Publicada" : "Borrador"}
                  </span>
                  {p.status === "publicado" && !isPromotionActive(p) && (
                    <span className="rounded-pill bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      Expirada
                    </span>
                  )}
                  {p.mostrarEnHome && (
                    <span className="rounded-pill bg-navy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
                      En la Home
                    </span>
                  )}
                  <p className="truncate text-[12px] font-medium text-slate2">{p.categoria || "Sin categoría"}</p>
                </div>
                <p className="mt-1 truncate text-[15px] font-bold text-ink">{p.tituloTarjeta || "(sin título)"}</p>
                <p className="mt-0.5 truncate text-[12px] text-slate2">
                  /promociones/{p.slug || "—"} · {fmt(p.publishedAt)}
                  {p.finPromocion && <> · hasta {fmt(p.finPromocion)}</>}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button onClick={() => toggleMostrarEnHome(p)}
                title="Mostrar u ocultar esta promoción en el carrusel de la Home"
                className={`rounded-pill px-3 py-1.5 text-[12px] font-semibold transition-colors ${p.mostrarEnHome ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
                {p.mostrarEnHome ? "Quitar de la Home" : "Mostrar en la Home"}
              </button>
              <a href={`/promociones/${p.slug}`} target="_blank" rel="noopener noreferrer"
                className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
                Ver
              </a>
              <a href={`/admin/promociones/${p.id}`}
                className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
                Editar
              </a>
              <button onClick={() => remove(p.id)}
                className="rounded-pill px-3 py-1.5 text-[12px] font-semibold text-brand-red transition-colors hover:bg-brand-red/10">
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
