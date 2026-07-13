"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type Lead = {
  id: string; nombre: string; telefono: string; email: string; updatedAt: string; anonymizedAt: string;
};

function fmt(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso)); }
  catch { return iso; }
}

export default function AdminRgpdPage() {
  return (
    <AdminShell active="rgpd">
      <RgpdAdmin />
    </AdminShell>
  );
}

function RgpdAdmin() {
  const { token, agent } = useAdminToken();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/leads", { headers: { "x-admin-token": token } });
    const body = await res.json();
    if (body.ok) setLeads(body.leads);
    setLoaded(true);
  };

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return leads.filter((l) => `${l.nombre} ${l.telefono} ${l.email}`.toLowerCase().includes(q)).slice(0, 20);
  }, [leads, query]);

  const anonymized = useMemo(
    () => leads.filter((l) => l.anonymizedAt).sort((a, b) => b.anonymizedAt.localeCompare(a.anonymizedAt)),
    [leads]
  );

  async function anonymize(l: Lead) {
    if (!window.confirm(`¿Seguro que quieres anonimizar los datos de ${l.nombre || l.telefono}? No se puede deshacer.`)) return;
    await fetch(`/api/admin/leads/${l.id}/anonymize`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ agente: agent }),
    });
    load();
  }

  if (!loaded) {
    return <main className="mx-auto max-w-3xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <h1 className="text-[22px] font-extrabold text-navy">Auditoría RGPD</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Derecho de acceso/portabilidad (exportar) y de supresión (anonimizar) de datos de clientes, y
        registro de las solicitudes ya atendidas — para cumplimiento DGSFP/RGPD.
      </p>

      <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
        <h2 className="text-[14px] font-bold text-navy">Buscar cliente</h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre, teléfono o email…"
          className="mt-2 w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]" />
        {query.trim() && (
          <ul className="mt-3 flex flex-col gap-2">
            {results.length === 0 && <li className="text-[13px] text-slate2">Sin resultados.</li>}
            {results.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-hair p-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">{l.nombre || "Sin nombre"}</p>
                  <p className="truncate text-[12px] text-slate2 tnums">{l.telefono} · {l.email}</p>
                </div>
                {l.anonymizedAt ? (
                  <span className="shrink-0 rounded-pill bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    Anonimizado {fmt(l.anonymizedAt)}
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center gap-3">
                    <a href={`/api/admin/leads/${l.id}/export?token=${encodeURIComponent(token)}`} className="text-[12px] font-semibold text-navy underline">
                      Exportar
                    </a>
                    <button onClick={() => anonymize(l)} className="text-[12px] font-semibold text-brand-red underline">
                      Anonimizar
                    </button>
                    <a href={`/admin?lead=${l.id}`} className="text-[12px] font-semibold text-slate2 underline">Ver ficha</a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
        <h2 className="text-[14px] font-bold text-navy">Solicitudes de supresión atendidas ({anonymized.length})</h2>
        {anonymized.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate2">Ninguna todavía.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {anonymized.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 rounded-card border border-hair p-3 text-[13px]">
                <span className="tnums text-slate2">ID {l.id.slice(0, 8)}…</span>
                <span className="font-semibold text-ink">{fmt(l.anonymizedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
