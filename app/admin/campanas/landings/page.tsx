"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import type { Landing } from "@/lib/landings";

const PRODUCTO_LABELS: Record<Landing["producto"], string> = {
  salud: "Salud", vida: "Vida", auto: "Auto", decesos: "Decesos", hogar: "Hogar",
};

function fmt(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)); }
  catch { return iso; }
}

export default function AdminLandingsPage() {
  return (
    <AdminShell active="landings">
      <Listado />
    </AdminShell>
  );
}

function Listado() {
  const { token } = useAdminToken();
  const [landings, setLandings] = useState<Landing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/landings", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setLandings(body.landings);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta landing? No se puede deshacer.")) return;
    const res = await fetch(`/api/admin/landings/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.ok) setLandings((ls) => ls.filter((l) => l.id !== id));
  }

  async function duplicate(l: Landing) {
    const newSlug = window.prompt("Slug de la copia (se servirá en /lp/<slug>)", `${l.slug}-copia`);
    if (!newSlug) return;
    setDuplicating(l.id);
    try {
      const res = await fetch(`/api/admin/landings/${l.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ newSlug }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) { alert(body.error ?? "No se pudo duplicar."); setDuplicating(null); return; }
      window.location.href = `/admin/campanas/landings/${body.landing.id}`;
    } catch { alert("Error de conexión."); setDuplicating(null); }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Landings paid</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Landings de captación servidas en <code className="rounded bg-mist px-1.5 py-0.5 text-[12px]">/lp/[slug]</code>,
            pensadas como URL destino de anuncios (Google/Meta Ads). Duplica una landing existente para lanzar
            variantes por ramo o por público objetivo y compararlas entre sí.
          </p>
        </div>
        <a href="/admin/campanas/landings/nueva"
          className="shrink-0 rounded-card bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
          + Nueva landing
        </a>
      </div>

      <a href="/admin/campanas/landings/comparar" className="mt-4 inline-block text-[13px] font-semibold text-navy underline">
        Ver dashboard de comparación →
      </a>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}
      {!loading && landings.length === 0 && <p className="mt-6 text-[13px] text-slate2">Todavía no hay landings.</p>}

      <ul className="mt-5 flex flex-col gap-3">
        {landings.map((l) => (
          <li key={l.id} className="flex flex-col gap-3 rounded-card border border-hair bg-white p-4 shadow-soft sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${l.status === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {l.status === "publicado" ? "Publicada" : "Borrador"}
                </span>
                <span className="rounded-pill bg-navy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
                  {PRODUCTO_LABELS[l.producto]}
                </span>
              </div>
              <p className="mt-1 truncate text-[15px] font-bold text-ink">{l.hero.h1 || "(sin titular)"}</p>
              <p className="mt-0.5 truncate text-[12px] text-slate2">/lp/{l.slug} · actualizado {fmt(l.updatedAt)}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <a href={`/lp/${l.slug}`} target="_blank" rel="noopener noreferrer"
                className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
                Ver
              </a>
              <a href={`/admin/campanas/landings/${l.id}`}
                className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
                Editar
              </a>
              <button onClick={() => duplicate(l)} disabled={duplicating === l.id}
                className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist disabled:opacity-60">
                {duplicating === l.id ? "Duplicando…" : "Duplicar"}
              </button>
              <button onClick={() => remove(l.id)}
                className="rounded-pill px-3 py-1.5 text-[12px] font-semibold text-brand-red transition-colors hover:bg-brand-red/10">
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
