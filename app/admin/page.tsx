"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { ChevronDown } from "@/components/icons";
import { quoteNumber } from "@/lib/quote";

type Activity = { at: string; type: string; note: string };
type ConsentRecord = {
  at: string; ip: string; userAgent: string; source: string; page: string;
  privacidad: { granted: boolean; at?: string };
  contacto: { granted: boolean; at?: string };
  comercial: { granted: boolean; at?: string };
};
type LeadSubmission = { id: string; at: string; source: string; producto: string; data: Record<string, unknown>; precioAprox?: number | null };
type Lead = {
  id: string; createdAt: string; updatedAt: string;
  source: string; sources: string[]; producto: string; status: string; nextStep: string;
  nombre: string; telefono: string; email: string; codigoPostal: string;
  inicio: string; numAsegurados: number | null; coberturaDental: boolean | null;
  motivo: string; fumador: boolean | null;
  fechaNacimiento: string; sexo: string; yaTieneSeguro: boolean | null;
  seguroActualImporte: number | null; seguroActualPeriodo: string; seguroActualServicios: string[];
  diaLlamada: string; turnoLlamada: string; presupuestoId: string;
  aceptaPrivacidad: boolean; autorizaContacto: boolean; aceptaComercial: boolean;
  consents: ConsentRecord[];
  utm: Record<string, string | undefined>; activity: Activity[];
  submissions: LeadSubmission[];
};

const SUBMISSION_FIELD_LABELS: Record<string, string> = {
  inicio: "Inicio deseado", fechaInicioPersonalizada: "Fecha elegida", codigoPostal: "Código postal",
  numAsegurados: "Personas a asegurar", coberturaDental: "Cobertura dental", motivo: "Motivo",
  fumador: "Fumador", fechaNacimiento: "Fecha de nacimiento", sexo: "Sexo", yaTieneSeguro: "Ya tenía seguro",
  seguroActualImporte: "Pagaba antes", seguroActualPeriodo: "Periodicidad", seguroActualServicios: "Servicios actuales",
  compania: "Compañía de interés", producto: "Producto",
  diaLlamada: "Día preferido", turnoLlamada: "Turno preferido",
};

function formatSubmissionValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}

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

export default function AdminLeadsPage() {
  return (
    <AdminShell active="leads">
      <LeadsCrm />
    </AdminShell>
  );
}

function LeadsCrm() {
  const { token } = useAdminToken();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<string[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [storage, setStorage] = useState("");
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterSource, setFilterSource] = useState("all");
  const [filterProducto, setFilterProducto] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"lista" | "pipeline">("lista");
  const [selected, setSelected] = useState<Lead | null>(null);

  const load = useCallback(async (tk: string) => {
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/admin/leads", { headers: { "x-admin-token": tk } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setLeads(body.leads); setSources(body.sources); setStatuses(body.statuses);
      setStatusLabels(body.statusLabels); setStorage(body.storage); setLoadedOnce(true);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, []);

  useEffect(() => { load(token); }, [token, load]);

  async function openLead(id: string) {
    // Se pide la ficha fresca (no la del listado, que puede estar desactualizada
    // si el propio cliente ha cambiado sus datos desde /area-cliente).
    try {
      const res = await fetch(`/api/admin/leads/${id}`, { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (res.ok && body.ok) {
        setSelected(body.lead);
        setLeads((prev) => prev.map((l) => (l.id === body.lead.id ? body.lead : l)));
        return;
      }
    } catch { /* si falla, se cae al fallback de abajo */ }
    setSelected(leads.find((l) => l.id === id) ?? null);
  }

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
      const params = new URLSearchParams();
      if (filterSource !== "all") params.set("source", filterSource);
      if (filterProducto !== "all") params.set("producto", filterProducto);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/admin/export?${params.toString()}`, { headers: { "x-admin-token": token } });
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

  const productos = useMemo(
    () => Array.from(new Set(leads.map((l) => l.producto).filter(Boolean))).sort(),
    [leads]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (filterSource !== "all" && !l.sources.includes(filterSource)) return false;
      if (filterProducto !== "all" && l.producto !== filterProducto) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (q) {
        const hay = `${l.nombre} ${l.telefono} ${l.email} ${l.codigoPostal}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, filterSource, filterProducto, filterStatus, search]);

  const statCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const s of statuses) acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, [leads, statuses]);
  const total = leads.length;
  const wonRate = total ? Math.round(((statCounts["ganado"] ?? 0) / total) * 100) : 0;

  if (!loadedOnce) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10 text-center text-[14px] text-slate2">
        {error ? <p role="alert" className="font-medium text-brand-red">{error}</p> : loading ? "Cargando…" : null}
      </main>
    );
  }

  /* ------------------------------- Ficha ---------------------------------- */
  if (selected) {
    const l = selected;
    const latestConsent = l.consents?.[0];
    const numPresupuestos = (l.submissions ?? []).filter((s) => s.source === "tarificador-salud" || s.source === "tarificador-vida").length;

    return (
      <main className="mx-auto max-w-6xl px-5 py-6">
        <button onClick={() => setSelected(null)} className="text-[14px] font-semibold text-navy">← Volver al listado</button>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
          {/* IZQUIERDA (30%): ficha del cliente */}
          <div className="flex flex-col gap-4">
            <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-[19px] font-extrabold leading-tight text-navy">{l.nombre || "Sin nombre"}</h1>
                <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[l.status] ?? "bg-slate-200"}`}>
                  {statusLabels[l.status] ?? l.status}
                </span>
              </div>
              <p className="mt-1 text-[14px] tnums text-slate2">{l.telefono || "sin teléfono"}</p>
              <p className="text-[14px] text-slate2">{l.email || "sin email"}</p>

              <dl className="mt-5 flex flex-col gap-2.5 text-[13px]">
                <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Fuente(s)</dt><dd className="text-right font-medium text-ink">{l.sources.map((s) => sources[s] ?? s).join(", ")}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Producto</dt><dd className="text-right font-medium capitalize text-ink">{l.producto || "—"}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Código postal</dt><dd className="text-right font-medium tnums text-ink">{l.codigoPostal || "—"}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Alta</dt><dd className="text-right font-medium text-ink">{fmt(l.createdAt)}</dd></div>
                {l.fechaNacimiento && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Nacimiento</dt><dd className="text-right font-medium text-ink">{l.fechaNacimiento} ({l.sexo})</dd></div>}
                {l.numAsegurados != null && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Asegurados</dt><dd className="text-right font-medium text-ink">{l.numAsegurados}</dd></div>}
                {l.coberturaDental != null && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Dental</dt><dd className="text-right font-medium text-ink">{l.coberturaDental ? "Sí" : "No"}</dd></div>}
                {l.yaTieneSeguro != null && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Ya tiene seguro</dt><dd className="text-right font-medium text-ink">{l.yaTieneSeguro ? "Sí" : "No"}</dd></div>}
                {l.motivo && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Motivo (vida)</dt><dd className="text-right font-medium text-ink">{l.motivo}</dd></div>}
                {l.fumador != null && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Fumador</dt><dd className="text-right font-medium text-ink">{l.fumador ? "Sí" : "No"}</dd></div>}
                {l.seguroActualImporte != null && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Paga ahora</dt><dd className="text-right font-medium tnums text-ink">{l.seguroActualImporte} € / {l.seguroActualPeriodo || "mes"}</dd></div>}
                {l.diaLlamada && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Día preferido</dt><dd className="text-right font-medium text-ink">{l.diaLlamada}</dd></div>}
                {l.turnoLlamada && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Turno preferido</dt><dd className="text-right font-medium text-ink">{l.turnoLlamada}</dd></div>}
                {l.presupuestoId && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Último presupuesto</dt><dd className="text-right font-medium tnums text-ink">#{quoteNumber(l.presupuestoId)}</dd></div>}
                {(l.seguroActualServicios?.length ?? 0) > 0 && <div><dt className="text-slate2">Servicios actuales</dt><dd className="mt-0.5 font-medium text-ink">{l.seguroActualServicios.join(", ")}</dd></div>}
                {l.utm?.source && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">utm_source</dt><dd className="text-right font-medium text-ink">{l.utm.source}</dd></div>}
                {l.utm?.campaign && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">utm_campaign</dt><dd className="text-right font-medium text-ink">{l.utm.campaign}</dd></div>}
              </dl>

              <div className="mt-5 border-t border-hair pt-4">
                <p className="text-[12px] font-semibold text-ink">Último consentimiento</p>
                {latestConsent ? (
                  <div className="mt-1.5 text-[12px] leading-relaxed text-slate2">
                    <p>{fmt(latestConsent.at)} · {sources[latestConsent.source] ?? latestConsent.source}</p>
                    <p className="mt-1">
                      Privacidad: <b className="text-ink">{latestConsent.privacidad?.granted ? "sí" : "no"}</b>
                      {" · "}Contacto: <b className="text-ink">{latestConsent.contacto?.granted ? "sí" : "no"}</b>
                      {" · "}Comercial: <b className="text-ink">{latestConsent.comercial?.granted ? "sí" : "no"}</b>
                    </p>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[12px] text-slate2">Sin registro de consentimiento.</p>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
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
              <input id="next" defaultValue={l.nextStep} placeholder="p.ej. Llamar mañana 10:00…"
                className="mt-2 w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]"
                onKeyDown={(e) => { if (e.key === "Enter") patch(l.id, { nextStep: (e.target as HTMLInputElement).value }); }} />
              <p className="mt-1 text-[12px] text-slate2">Pulsa Enter para guardar.</p>
            </div>
          </div>

          {/* DERECHA (70%): paneles colapsables */}
          <div className="flex flex-col gap-4">
            <CollapsiblePanel title="Actividad">
              <ActivityPanel activity={l.activity} />
            </CollapsiblePanel>

            <CollapsiblePanel title="Contactos con el cliente">
              <ContactLogPanel activity={l.activity} onLog={(channel) => patch(l.id, { contact: { channel } })} />
            </CollapsiblePanel>

            <CollapsiblePanel title="Notas">
              <NotesPanel activity={l.activity} onSave={(txt) => patch(l.id, { note: txt })} />
            </CollapsiblePanel>

            <CollapsiblePanel title={`Presupuestos (${numPresupuestos})`}>
              <PresupuestosPanel submissions={l.submissions ?? []} />
            </CollapsiblePanel>
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------ Listado --------------------------------- */
  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-navy">CRM · Leads</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="rounded-pill border border-navy px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
            Exportar CSV (filtro actual)
          </button>
          <span className="rounded-pill bg-navy/10 px-2.5 py-1 text-[11px] font-semibold text-navy">
            {storage === "kv" ? "KV" : "memoria (dev)"}
          </span>
        </div>
      </div>

      {storage !== "kv" && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          Estás en modo memoria (no persistente). Conecta Vercel KV para almacenamiento durable — ver README.
        </p>
      )}

      {/* Dashboard */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total" value={total} active={filterStatus === "all"} onClick={() => setFilterStatus("all")} />
        {statuses.map((s) => (
          <StatTile key={s} label={statusLabels[s] ?? s} value={statCounts[s] ?? 0}
            active={filterStatus === s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)} />
        ))}
      </div>
      <p className="mt-2 text-[12px] text-slate2">Tasa de éxito (ganado / total): <b className="text-ink">{wonRate}%</b></p>

      {/* Filtros */}
      <div className="mt-5 flex flex-col gap-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono, email o código postal…"
          className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]"
        />
        <div role="tablist" aria-label="Filtrar por fuente" className="flex flex-wrap gap-2">
          <FilterTab label={`Todas las fuentes (${leads.length})`} active={filterSource === "all"} onClick={() => setFilterSource("all")} />
          {Object.entries(sources).map(([key, label]) => (
            <FilterTab key={key} label={`${label} (${leads.filter((l) => l.sources.includes(key)).length})`} active={filterSource === key} onClick={() => setFilterSource(key)} />
          ))}
        </div>
        {productos.length > 0 && (
          <div role="tablist" aria-label="Filtrar por producto" className="flex flex-wrap gap-2">
            <FilterTab label="Todos los productos" active={filterProducto === "all"} onClick={() => setFilterProducto("all")} small />
            {productos.map((p) => (
              <FilterTab key={p} label={p} active={filterProducto === p} onClick={() => setFilterProducto(p)} small />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-slate2">{visible.length} resultado{visible.length === 1 ? "" : "s"}</p>
          <div className="flex gap-1 rounded-pill border border-hair bg-white p-1">
            <ViewToggle label="Lista" active={view === "lista"} onClick={() => setView("lista")} />
            <ViewToggle label="Pipeline" active={view === "pipeline"} onClick={() => setView("pipeline")} />
          </div>
        </div>
      </div>

      {view === "pipeline" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {statuses.map((s) => {
            const col = visible.filter((l) => l.status === s);
            return (
              <div key={s} className="rounded-card border border-hair bg-white p-3">
                <p className="text-[12px] font-bold text-navy">{statusLabels[s] ?? s} ({col.length})</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {col.map((l) => (
                    <li key={l.id}>
                      <button onClick={() => openLead(l.id)} className="w-full rounded-lg border border-hair bg-mist px-3 py-2 text-left transition-colors hover:bg-hair/60">
                        <p className="truncate text-[12px] font-semibold text-ink">{l.nombre || "Sin nombre"}</p>
                        <p className="truncate text-[11px] text-slate2 tnums">{l.telefono}</p>
                      </button>
                    </li>
                  ))}
                  {col.length === 0 && <li className="text-[11px] text-slate2">—</li>}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {visible.length === 0 && <li className="rounded-card border border-hair bg-white p-5 text-center text-[14px] text-slate2">No hay leads con estos filtros.</li>}
          {visible.map((l) => (
            <li key={l.id}>
              <button onClick={() => openLead(l.id)} className="flex w-full items-center justify-between gap-3 rounded-card border border-hair bg-white px-4 py-3.5 text-left transition-colors hover:bg-mist">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{l.nombre || "Sin nombre"}</p>
                  <p className="truncate text-[13px] text-slate2 tnums">
                    {l.telefono} · {sources[l.source] ?? l.source}{l.producto ? ` · ${l.producto}` : ""} · {fmt(l.updatedAt)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[l.status] ?? "bg-slate-200"}`}>
                  {statusLabels[l.status] ?? l.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function StatTile({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-card border p-3 text-left transition-colors ${active ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}
    >
      <p className={`text-[20px] font-extrabold tnums ${active ? "text-white" : "text-navy"}`}>{value}</p>
      <p className={`truncate text-[11px] font-medium ${active ? "text-white/80" : "text-slate2"}`}>{label}</p>
    </button>
  );
}

function ViewToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-pill px-3 py-1 text-[12px] font-semibold transition-colors ${active ? "bg-navy text-white" : "text-navy hover:bg-mist"}`}>
      {label}
    </button>
  );
}

function FilterTab({ label, active, onClick, small }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick}
      className={`rounded-pill capitalize transition-colors ${small ? "px-3 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]"} font-semibold ${active ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
      {label}
    </button>
  );
}

function CollapsiblePanel({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[24px] border border-hair bg-white shadow-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 p-6 text-left">
        <h2 className="text-[15px] font-bold text-navy">{title}</h2>
        <span aria-hidden="true" className={`shrink-0 text-navy transition-transform ${open ? "rotate-180" : ""}`}>
          <ChevronDown width={18} height={18} />
        </span>
      </button>
      {open && <div className="border-t border-hair px-6 pb-6 pt-4">{children}</div>}
    </div>
  );
}

function ActivityPanel({ activity }: { activity: Activity[] }) {
  const entries = activity.filter((a) => a.type !== "note" && a.type !== "contact");
  if (entries.length === 0) return <p className="text-[13px] text-slate2">Sin actividad registrada.</p>;
  return (
    <ol className="flex flex-col gap-4">
      {entries.map((a, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-red" />
          <div>
            <p className="text-[14px] text-ink">{a.note}</p>
            <p className="text-[12px] text-slate2">{fmt(a.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const CONTACT_CHANNELS = [
  { key: "llamada", label: "Llamada realizada" },
  { key: "whatsapp", label: "WhatsApp enviado" },
  { key: "email", label: "Email enviado" },
];

function ContactLogPanel({ activity, onLog }: { activity: Activity[]; onLog: (channel: string) => void }) {
  const entries = activity.filter((a) => a.type === "contact");
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {CONTACT_CHANNELS.map((c) => (
          <button key={c.key} onClick={() => onLog(c.key)}
            className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
            {c.label}
          </button>
        ))}
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 text-[13px] text-slate2">Sin contactos registrados todavía.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {entries.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-navy" />
              <div>
                <p className="text-[14px] text-ink">{a.note}</p>
                <p className="text-[12px] text-slate2">{fmt(a.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NotesPanel({ activity, onSave }: { activity: Activity[]; onSave: (txt: string) => void }) {
  const entries = activity.filter((a) => a.type === "note");
  return (
    <div>
      <NoteBox onSave={onSave} />
      {entries.length === 0 ? (
        <p className="mt-3 text-[13px] text-slate2">Sin notas todavía.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {entries.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-red" />
              <div>
                <p className="text-[14px] text-ink">{a.note}</p>
                <p className="text-[12px] text-slate2">{fmt(a.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PresupuestosPanel({ submissions }: { submissions: LeadSubmission[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const presupuestos = useMemo(
    () => submissions
      .filter((s) => s.source === "tarificador-salud" || s.source === "tarificador-vida")
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    [submissions]
  );

  if (presupuestos.length === 0) return <p className="text-[13px] text-slate2">Sin presupuestos generados.</p>;

  return (
    <ol className="flex flex-col gap-2">
      {presupuestos.map((s) => {
        const open = expandedId === s.id;
        const fields = Object.entries(s.data).filter(([k, v]) => SUBMISSION_FIELD_LABELS[k] && v !== "" && v !== null && v !== undefined);
        return (
          <li key={s.id} className="rounded-card border border-hair">
            <button type="button" onClick={() => setExpandedId(open ? null : s.id)} className="flex w-full items-center justify-between gap-3 p-3.5 text-left">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold tnums text-ink">#{quoteNumber(s.id)} <span className="font-normal capitalize text-slate2">· {s.producto}</span></p>
                <p className="text-[12px] text-slate2">{fmt(s.at)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {s.precioAprox != null && <span className="text-[13px] font-bold tnums text-navy">≈ {s.precioAprox.toFixed(2)} €/mes</span>}
                <span aria-hidden="true" className={`text-navy transition-transform ${open ? "rotate-180" : ""}`}>
                  <ChevronDown width={16} height={16} />
                </span>
              </div>
            </button>
            {open && (
              <div className="border-t border-hair p-3.5">
                {fields.length > 0 ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                    {fields.map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-slate2">{SUBMISSION_FIELD_LABELS[k] ?? k}</dt>
                        <dd className="font-medium text-ink">{formatSubmissionValue(v)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : <p className="text-[12px] text-slate2">Sin detalles adicionales.</p>}
                {s.precioAprox != null && (
                  <p className="mt-2 text-[11px] leading-relaxed text-slate2">
                    Precio orientativo según la compañía recomendada del catálogo; no es una cotización en firme.
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
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
