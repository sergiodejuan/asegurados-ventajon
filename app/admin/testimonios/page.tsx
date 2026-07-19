"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import type { Testimonio } from "@/lib/testimonios";

function fmt(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(iso)); }
  catch { return iso; }
}

export default function AdminTestimoniosPage() {
  return (
    <AdminShell active="testimonios">
      <TestimoniosAdmin />
    </AdminShell>
  );
}

function TestimoniosAdmin() {
  const { token } = useAdminToken();
  const [testimonios, setTestimonios] = useState<Testimonio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/testimonios", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setTestimonios(body.testimonios);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("¿Eliminar este testimonio? No se puede deshacer.")) return;
    const res = await fetch(`/api/admin/testimonios/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.ok) setTestimonios((ts) => ts.filter((t) => t.id !== id));
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Testimonios</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Historias reales de clientes asegurados, contadas en formato scrollytelling en su propia página
            (/testimonios/…) y listadas en el grid de /testimonios.
          </p>
        </div>
        <a href="/admin/testimonios/nuevo"
          className="shrink-0 rounded-card bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
          + Nueva historia
        </a>
      </div>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && testimonios.length === 0 && (
        <p className="mt-6 text-[13px] text-slate2">
          Todavía no hay testimonios. Crea el primero con el consentimiento de la familia protagonista —
          nunca se publican historias inventadas.
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-3">
        {testimonios.map((t) => (
          <li key={t.id} className="flex flex-col gap-3 rounded-card border border-hair bg-white p-4 shadow-soft sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.fotoDestacada ? (
                <img src={t.fotoDestacada} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-mist text-[11px] font-semibold text-slate2">Sin foto</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${t.status === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {t.status === "publicado" ? "Publicado" : "Borrador"}
                  </span>
                  <p className="truncate text-[12px] font-medium text-slate2">{t.ubicacion || "Sin ubicación"}</p>
                </div>
                <p className="mt-1 truncate text-[15px] font-bold text-ink">{t.nombre || "(sin nombre)"}</p>
                <p className="mt-0.5 truncate text-[12px] text-slate2">
                  /testimonios/{t.slug || "—"} · {fmt(t.publishedAt)} · {t.capitulos.length} {t.capitulos.length === 1 ? "capítulo" : "capítulos"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <a href={`/testimonios/${t.slug}`} target="_blank" rel="noopener noreferrer"
                className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
                Ver
              </a>
              <a href={`/admin/testimonios/${t.id}`}
                className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
                Editar
              </a>
              <button onClick={() => remove(t.id)}
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
