"use client";

import { useCallback, useEffect, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";

type Activity = { at: string; type: string; note: string };
type ConsentRecord = {
  at: string; ip: string; userAgent: string; source: string; page: string;
  privacidad: { granted: boolean; at?: string };
  contacto: { granted: boolean; at?: string };
  comercial: { granted: boolean; at?: string };
};
type Lead = {
  id: string; createdAt: string; updatedAt: string;
  source: string; sources: string[]; producto: string; status: string; nextStep: string;
  nombre: string; telefono: string; email: string; codigoPostal: string;
  inicio: string; numAsegurados: number | null; coberturaDental: boolean | null;
  motivo: string; fumador: boolean | null;
  fechaNacimiento: string; sexo: string; yaTieneSeguro: boolean | null;
  seguroActualImporte: number | null; seguroActualPeriodo: string; seguroActualServicios: string[];
  aceptaPrivacidad: boolean; autorizaContacto: boolean; aceptaComercial: boolean;
  consents: ConsentRecord[];
  utm: Record<string, string | undefined>; activity: Activity[];
};

const STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-brand-red/10 text-brand-red-deep",
  contactado: "bg-navy/10 text-navy",
  presupuestado: "bg-amber-100 text-amber-700",
  ganado: "bg-emerald-100 text-emerald-700",
  perdido: "bg-slate-200 text-slate-600",
};

function fmt(iso: string) {
  try { return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso)); }
  catch { return iso; }
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<string[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [storage, setStorage] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t) setToken(t);
  }, []);

  const load = useCallback(async (tk: string) => {
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/admin/leads", { headers: { "x-admin-token": tk } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setLeads(body.leads); setSources(body.sources); setStatuses(body.statuses);
      setStatusLabels(body.statusLabels); setStorage(body.storage); setReady(true);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, []);

  async function patch(id: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (res.ok && body.ok) {
      setSelected(body.lead);
      setLeads((prev) => prev.map((l) => (l.id === body.lead.id ? body.lead : l)));
    }
  }

  async function exportCsv() {
    try {
      const res = await fetch("/api/admin/export", { headers: { "x-admin-token": token } });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-asegurados-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }

  const visible = filter === "all" ? leads : leads.filter((l) => l.sources.includes(filter));

  /* ------------------------------- Login ---------------------------------- */
  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist px-5">
        <div className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 shadow-card">
          <p className="font-display text-[16px] font-extrabold text-navy" translate="no">{BRAND_NAME}</p>
          <h1 className="mt-3 text-[22px] font-extrabold text-navy">CRM · Leads</h1>
          <p className="mt-1 text-[14px] text-slate2">Introduce el token de acceso.</p>
          <label htmlFor="tk" className="sr-only">Token</label>
          <input id="tk" type="password" value={token} onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(token)}
            placeholder="ADMIN_TOKEN…"
            className="mt-4 w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px]" />
          {error && <p role="alert" className="mt-2 text-[13px] font-medium text-brand-red">{error}</p>}
          <button onClick={() => load(token)} disabled={loading || !token}
            className="mt-4 w-full rounded-card bg-navy px-5 py-3.5 text-[16px] font-semibold text-white disabled:bg-slate2/40">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </main>
    );
  }

  /* ------------------------------- Ficha ---------------------------------- */
  if (selected) {
    const l = selected;
    return (
      <main className="min-h-screen bg-mist">
        <div className="mx-auto max-w-2xl px-5 py-6">
          <button onClick={() => setSelected(null)} className="text-[14px] font-semibold text-navy">← Volver al listado</button>

          <div className="mt-4 rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-extrabold text-navy">{l.nombre || "Sin nombre"}</h1>
                <p className="mt-0.5 text-[14px] text-slate2 tnums">{l.telefono} · {l.email || "sin email"}</p>
              </div>
              <span className={`rounded-pill px-3 py-1 text-[12px] font-bold ${STATUS_COLORS[l.status] ?? "bg-slate-200"}`}>
                {statusLabels[l.status] ?? l.status}
              </span>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
              <div><dt className="text-slate2">Fuente(s)</dt><dd className="font-medium text-ink">{l.sources.map((s) => sources[s] ?? s).join(", ")}</dd></div>
              <div><dt className="text-slate2">Producto</dt><dd className="font-medium text-ink">{l.producto || "—"}</dd></div>
              <div><dt className="text-slate2">Código postal</dt><dd className="font-medium text-ink tnums">{l.codigoPostal || "—"}</dd></div>
              <div><dt className="text-slate2">Alta</dt><dd className="font-medium text-ink">{fmt(l.createdAt)}</dd></div>
              {l.fechaNacimiento && <div><dt className="text-slate2">Nacimiento</dt><dd className="font-medium text-ink">{l.fechaNacimiento} ({l.sexo})</dd></div>}
              {l.numAsegurados != null && <div><dt className="text-slate2">Asegurados</dt><dd className="font-medium text-ink">{l.numAsegurados}</dd></div>}
              {l.coberturaDental != null && <div><dt className="text-slate2">Dental</dt><dd className="font-medium text-ink">{l.coberturaDental ? "Sí" : "No"}</dd></div>}
              {l.yaTieneSeguro != null && <div><dt className="text-slate2">Ya tiene seguro</dt><dd className="font-medium text-ink">{l.yaTieneSeguro ? "Sí" : "No"}</dd></div>}
              {l.motivo && <div><dt className="text-slate2">Motivo (vida)</dt><dd className="font-medium text-ink">{l.motivo}</dd></div>}
              {l.fumador != null && <div><dt className="text-slate2">Fumador</dt><dd className="font-medium text-ink">{l.fumador ? "Sí" : "No"}</dd></div>}
              {l.seguroActualImporte != null && <div><dt className="text-slate2">Paga ahora</dt><dd className="font-medium text-ink tnums">{l.seguroActualImporte} € / {l.seguroActualPeriodo || "mes"}</dd></div>}
              {(l.seguroActualServicios?.length ?? 0) > 0 && <div className="col-span-2"><dt className="text-slate2">Servicios actuales</dt><dd className="font-medium text-ink">{l.seguroActualServicios.join(", ")}</dd></div>}
              {l.utm?.source && <div><dt className="text-slate2">utm_source</dt><dd className="font-medium text-ink">{l.utm.source}</dd></div>}
              {l.utm?.campaign && <div><dt className="text-slate2">utm_campaign</dt><dd className="font-medium text-ink">{l.utm.campaign}</dd></div>}
            </dl>

            <p className="mt-4 text-[12px] text-slate2">
              Consentimientos — privacidad: {l.aceptaPrivacidad ? "sí" : "no"} · contacto: {l.autorizaContacto ? "sí" : "no"} · comercial: {l.aceptaComercial ? "sí" : "no"}
            </p>
          </div>

          {/* Gestión */}
          <div className="mt-4 rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <label className="block text-[13px] font-semibold text-ink">Estado</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button key={s} onClick={() => patch(l.id, { status: s })}
                  className={`rounded-pill px-3 py-1.5 text-[13px] font-semibold transition-colors ${l.status === s ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
                  {statusLabels[s] ?? s}
                </button>
              ))}
            </div>

            <label htmlFor="next" className="mt-5 block text-[13px] font-semibold text-ink">Próximo paso</label>
            <div className="mt-2 flex gap-2">
              <input id="next" defaultValue={l.nextStep} placeholder="p.ej. Llamar mañana 10:00…"
                className="flex-1 rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]"
                onKeyDown={(e) => { if (e.key === "Enter") patch(l.id, { nextStep: (e.target as HTMLInputElement).value }); }} />
            </div>
            <p className="mt-1 text-[12px] text-slate2">Pulsa Enter para guardar.</p>

            <label htmlFor="note" className="mt-5 block text-[13px] font-semibold text-ink">Añadir nota</label>
            <NoteBox onSave={(txt) => patch(l.id, { note: txt })} />
          </div>

          {/* Auditoría de consentimientos */}
          <div className="mt-4 rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <h2 className="text-[15px] font-bold text-navy">Consentimientos (auditoría)</h2>
            {(!l.consents || l.consents.length === 0) && (
              <p className="mt-2 text-[13px] text-slate2">Sin registros (leads anteriores a esta versión).</p>
            )}
            <ol className="mt-3 flex flex-col gap-4">
              {(l.consents ?? []).map((c, i) => (
                <li key={i} className="rounded-card border border-hair p-4">
                  <p className="text-[13px] font-semibold text-ink">{fmt(c.at)} · {sources[c.source] ?? c.source}</p>
                  <ul className="mt-2 flex flex-col gap-1 text-[13px] text-slate2">
                    <li>Privacidad: <b className="text-ink">{c.privacidad?.granted ? "sí" : "no"}</b>{c.privacidad?.at ? ` · ${fmt(c.privacidad.at)}` : ""}</li>
                    <li>Contacto: <b className="text-ink">{c.contacto?.granted ? "sí" : "no"}</b>{c.contacto?.at ? ` · ${fmt(c.contacto.at)}` : ""}</li>
                    <li>Comercial: <b className="text-ink">{c.comercial?.granted ? "sí" : "no"}</b>{c.comercial?.at ? ` · ${fmt(c.comercial.at)}` : ""}</li>
                  </ul>
                  <p className="mt-2 text-[12px] text-slate2">IP: <span className="tnums">{c.ip || "—"}</span> · Página: {c.page || "—"}</p>
                  <p className="mt-1 break-words text-[12px] text-slate2">Dispositivo: {c.userAgent || "—"}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Actividad */}
          <div className="mt-4 rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <h2 className="text-[15px] font-bold text-navy">Actividad</h2>
            <ol className="mt-4 flex flex-col gap-4">
              {l.activity.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-red" />
                  <div>
                    <p className="text-[14px] text-ink">{a.note}</p>
                    <p className="text-[12px] text-slate2">{fmt(a.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------ Listado --------------------------------- */
  return (
    <main className="min-h-screen bg-mist">
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-extrabold text-navy">CRM · Leads</h1>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="rounded-pill border border-navy px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
              Exportar CSV
            </button>
            <span className="rounded-pill bg-navy/10 px-2.5 py-1 text-[11px] font-semibold text-navy">
              {storage === "kv" ? "KV" : "memoria (dev)"}
            </span>
          </div>
        </div>

        <div role="tablist" aria-label="Filtrar por fuente" className="mt-4 flex flex-wrap gap-2">
          <FilterTab label={`Todas (${leads.length})`} active={filter === "all"} onClick={() => setFilter("all")} />
          {Object.entries(sources).map(([key, label]) => (
            <FilterTab key={key} label={`${label} (${leads.filter((l) => l.sources.includes(key)).length})`} active={filter === key} onClick={() => setFilter(key)} />
          ))}
        </div>

        {storage !== "kv" && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            Estás en modo memoria (no persistente). Conecta Vercel KV para almacenamiento durable — ver README.
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-2">
          {visible.length === 0 && <li className="rounded-card border border-hair bg-white p-5 text-center text-[14px] text-slate2">Aún no hay leads en esta fuente.</li>}
          {visible.map((l) => (
            <li key={l.id}>
              <button onClick={() => setSelected(l)} className="flex w-full items-center justify-between gap-3 rounded-card border border-hair bg-white px-4 py-3.5 text-left transition-colors hover:bg-mist">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{l.nombre || "Sin nombre"}</p>
                  <p className="truncate text-[13px] text-slate2 tnums">{l.telefono} · {sources[l.source] ?? l.source} · {fmt(l.updatedAt)}</p>
                </div>
                <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[l.status] ?? "bg-slate-200"}`}>
                  {statusLabels[l.status] ?? l.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick}
      className={`rounded-pill px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${active ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
      {label}
    </button>
  );
}

function NoteBox({ onSave }: { onSave: (txt: string) => void }) {
  const [txt, setTxt] = useState("");
  return (
    <div className="mt-2">
      <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={2}
        placeholder="Escribe una nota de seguimiento…"
        className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]" />
      <button onClick={() => { if (txt.trim()) { onSave(txt.trim()); setTxt(""); } }}
        className="mt-2 rounded-card bg-navy px-4 py-2 text-[14px] font-semibold text-white disabled:bg-slate2/40" disabled={!txt.trim()}>
        Guardar nota
      </button>
    </div>
  );
}
