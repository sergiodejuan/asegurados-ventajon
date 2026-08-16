"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { ChevronDown, WhatsApp } from "@/components/icons";
import { quoteNumber } from "@/lib/quote";
import { fmt, SUBMISSION_FIELD_LABELS, formatSubmissionValue } from "@/lib/adminFormat";
import { StatTile, ViewToggle, FilterTab, FilterDropdown, CollapsiblePanel, NoteBox } from "@/components/admin/Widgets";
import { WhatsAppFollowupModal } from "@/components/admin/WhatsAppFollowupModal";
import { SendEmailModal } from "@/components/admin/SendEmailModal";

type Activity = { at: string; type: string; note: string; meta?: { agente?: string; channel?: string } };
type ConsentRecord = {
  at: string; ip: string; userAgent: string; source: string; page: string;
  privacidad: { granted: boolean; at?: string };
  contacto: { granted: boolean; at?: string };
  comercial: { granted: boolean; at?: string };
};
type LeadSubmission = { id: string; at: string; source: string; producto: string; data: Record<string, unknown>; precioAprox?: number | null };
type EmailLog = {
  id: string; at: string; to: string; subject: string; tipo: string;
  status: "enviado" | "abierto" | "clic";
  openedAt: string; openCount: number; clickedAt: string; clickCount: number;
};
type Lead = {
  id: string; createdAt: string; updatedAt: string;
  source: string; sources: string[]; producto: string; status: string; nextStep: string;
  agenteAsignadoId: string; agenteAsignadoNombre: string;
  nombre: string; telefono: string; email: string; codigoPostal: string;
  inicio: string; numAsegurados: number | null; coberturaDental: boolean | null;
  motivo: string; fumador: boolean | null;
  tipoVehiculo: string; matricula: string; marcaVehiculo: string; modeloVehiculo: string; anioVehiculo: string;
  usoVehiculo: string; antiguedadCarnet: string; coberturaDeseada: string;
  fechaNacimiento: string; sexo: string; yaTieneSeguro: boolean | null;
  seguroActualImporte: number | null; seguroActualPeriodo: string; seguroActualServicios: string[];
  diaLlamada: string; turnoLlamada: string; presupuestoId: string;
  priceMatch: {
    companiaActual: string;
    precioActual: number | null;
    periodicidad: string;
    capturaUrl: string;
    comentario: string;
    solicitadoAt: string;
  } | null;
  aceptaPrivacidad: boolean; autorizaContacto: boolean; aceptaComercial: boolean;
  consents: ConsentRecord[];
  utm: Record<string, string | undefined>; activity: Activity[];
  submissions: LeadSubmission[];
  emails: EmailLog[];
  anonymizedAt: string;
};

const EMAIL_STATUS_COLORS: Record<EmailLog["status"], string> = {
  enviado: "bg-navy/10 text-navy",
  abierto: "bg-amber-100 text-amber-700",
  clic: "bg-emerald-100 text-emerald-700",
};
const EMAIL_STATUS_LABELS: Record<EmailLog["status"], string> = {
  enviado: "Enviado", abierto: "Abierto", clic: "Clic",
};

const STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-brand-red/10 text-brand-red-deep",
  contactado: "bg-navy/10 text-navy",
  presupuestado: "bg-amber-100 text-amber-700",
  ganado: "bg-emerald-100 text-emerald-700",
  perdido: "bg-slate-200 text-slate-600",
};

const USO_LABELS: Record<string, string> = {
  particular: "Particular",
  trabajo: "Trabajo (autónomo o empresa)",
  vtc_taxi: "VTC o taxi",
};
const CARNET_LABELS: Record<string, string> = {
  menos_2: "Menos de 2 años",
  "2_5": "Entre 2 y 5 años",
  mas_5: "Más de 5 años",
};
const COBERTURA_LABELS: Record<string, string> = {
  terceros: "Terceros",
  terceros_ampliado: "Terceros ampliado",
  todo_riesgo: "Todo riesgo",
  no_lo_tengo_claro: "Sin decidir",
};

export default function AdminLeadsPage() {
  return (
    <AdminShell active="leads">
      <LeadsCrm />
    </AdminShell>
  );
}

function LeadsCrm() {
  const { token, agent, identity } = useAdminToken();
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
  const [agents, setAgents] = useState<{ id: string; nombre: string }[]>([]);
  const [filterCartera, setFilterCartera] = useState<"all" | "mia">("all");
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const load = useCallback(async (tk: string) => {
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/admin/leads", { headers: { "x-admin-token": tk } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setLeads(body.leads); setSources(body.sources); setStatuses(body.statuses);
      setStatusLabels(body.statusLabels); setStorage(body.storage); setAgents(body.agents ?? []); setLoadedOnce(true);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, []);

  useEffect(() => { load(token); }, [token, load]);

  // Enlace directo desde la ficha de presupuesto ("vinculación con leads"):
  // /admin?lead={id} abre esa ficha en cuanto el listado esté cargado.
  useEffect(() => {
    if (!loadedOnce) return;
    const leadParam = new URLSearchParams(window.location.search).get("lead");
    if (leadParam) openLead(leadParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedOnce]);

  async function openLead(id: string) {
    setEmailModalOpen(false);
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
      body: JSON.stringify({ ...payload, agente: agent }),
    });
    const body = await res.json();
    if (res.ok && body.ok) {
      setSelected(body.lead);
      setLeads((prev) => prev.map((l) => (l.id === body.lead.id ? body.lead : l)));
    }
  }

  async function assign(id: string, agenteAsignadoId: string) {
    const nombre = agents.find((a) => a.id === agenteAsignadoId)?.nombre ?? "";
    await patch(id, { agenteAsignadoId, agenteAsignadoNombre: nombre });
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
      if (filterCartera === "mia" && l.agenteAsignadoId !== identity?.id) return false;
      if (q) {
        const hay = `${l.nombre} ${l.telefono} ${l.email} ${l.codigoPostal} ${l.utm?.campaign ?? ""} ${l.utm?.source ?? ""} ${l.utm?.medium ?? ""} ${l.utm?.landingPage ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, filterSource, filterProducto, filterStatus, filterCartera, identity?.id, search]);

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
              <button
                type="button" onClick={() => setEmailModalOpen(true)} disabled={!l.email}
                title={l.email ? undefined : "Este lead no tiene un email guardado."}
                className="mt-3 rounded-pill border border-navy px-3.5 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:border-hair disabled:text-slate2 disabled:hover:bg-transparent"
              >
                Enviar email
              </button>

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
                {l.tipoVehiculo && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Vehículo</dt><dd className="text-right font-medium capitalize text-ink">{l.tipoVehiculo}{l.marcaVehiculo ? ` · ${l.marcaVehiculo} ${l.modeloVehiculo}`.trim() : ""}</dd></div>}
                {l.matricula && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Matrícula</dt><dd className="text-right font-medium tnums text-ink">{l.matricula}</dd></div>}
                {l.usoVehiculo && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Uso</dt><dd className="text-right font-medium text-ink">{USO_LABELS[l.usoVehiculo] ?? l.usoVehiculo}</dd></div>}
                {l.antiguedadCarnet && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Antigüedad carnet</dt><dd className="text-right font-medium text-ink">{CARNET_LABELS[l.antiguedadCarnet] ?? l.antiguedadCarnet}</dd></div>}
                {l.coberturaDeseada && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Cobertura deseada</dt><dd className="text-right font-medium text-ink">{COBERTURA_LABELS[l.coberturaDeseada] ?? l.coberturaDeseada}</dd></div>}
                {l.seguroActualImporte != null && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Paga ahora</dt><dd className="text-right font-medium tnums text-ink">{l.seguroActualImporte} € / {l.seguroActualPeriodo || "mes"}</dd></div>}
                {l.diaLlamada && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Día preferido</dt><dd className="text-right font-medium text-ink">{l.diaLlamada}</dd></div>}
                {l.turnoLlamada && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Turno preferido</dt><dd className="text-right font-medium text-ink">{l.turnoLlamada}</dd></div>}
                {l.presupuestoId && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Último presupuesto</dt><dd className="text-right font-medium tnums text-ink">#{quoteNumber(l.presupuestoId)}</dd></div>}
                {(l.seguroActualServicios?.length ?? 0) > 0 && <div><dt className="text-slate2">Servicios actuales</dt><dd className="mt-0.5 font-medium text-ink">{l.seguroActualServicios.join(", ")}</dd></div>}
              </dl>

              {agents.length > 0 && (
                <div className="mt-5 border-t border-hair pt-4">
                  <label htmlFor="lead-cartera" className="text-[12px] font-semibold text-ink">Cartera (agente asignado)</label>
                  <select
                    id="lead-cartera" value={l.agenteAsignadoId} onChange={(e) => assign(l.id, e.target.value)}
                    className="mt-1.5 w-full rounded-card border border-hair bg-white px-3 py-2 text-[13px]"
                  >
                    <option value="">Sin asignar</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
              )}

              {(l.utm?.source || l.utm?.medium || l.utm?.campaign || l.utm?.content || l.utm?.term || l.utm?.landingPage || l.utm?.referrer) && (
                <div className="mt-5 border-t border-hair pt-4">
                  <p className="text-[12px] font-semibold text-ink">Origen (UTM)</p>
                  <dl className="mt-1.5 flex flex-col gap-1.5 text-[12px]">
                    {l.utm?.landingPage && <div className="flex items-baseline justify-between gap-3"><dt className="shrink-0 text-slate2">Página de aterrizaje</dt><dd className="truncate text-right font-medium text-ink" title={l.utm.landingPage}>{l.utm.landingPage}</dd></div>}
                    {l.utm?.source && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">utm_source</dt><dd className="text-right font-medium text-ink">{l.utm.source}</dd></div>}
                    {l.utm?.medium && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">utm_medium</dt><dd className="text-right font-medium text-ink">{l.utm.medium}</dd></div>}
                    {l.utm?.campaign && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">utm_campaign</dt><dd className="text-right font-medium text-ink">{l.utm.campaign}</dd></div>}
                    {l.utm?.content && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">utm_content</dt><dd className="text-right font-medium text-ink">{l.utm.content}</dd></div>}
                    {l.utm?.term && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">utm_term</dt><dd className="text-right font-medium text-ink">{l.utm.term}</dd></div>}
                    {l.utm?.referrer && <div className="flex items-baseline justify-between gap-3"><dt className="shrink-0 text-slate2">Referrer</dt><dd className="truncate text-right font-medium text-ink" title={l.utm.referrer}>{l.utm.referrer}</dd></div>}
                  </dl>
                </div>
              )}

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

              <div className="mt-5 border-t border-hair pt-4">
                <p className="text-[12px] font-semibold text-ink">RGPD</p>
                {l.anonymizedAt ? (
                  <p className="mt-1.5 text-[12px] text-slate2">Datos anonimizados el {fmt(l.anonymizedAt)}.</p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <a href={`/api/admin/leads/${l.id}/export?token=${encodeURIComponent(token)}`}
                      className="text-[12px] font-semibold text-navy underline">
                      Exportar datos
                    </a>
                    <span className="text-slate2">·</span>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`¿Seguro que quieres anonimizar los datos de ${l.nombre || "este cliente"}? No se puede deshacer.`)) return;
                        const res = await fetch(`/api/admin/leads/${l.id}/anonymize`, {
                          method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": token },
                          body: JSON.stringify({ agente: agent }),
                        });
                        const body = await res.json();
                        if (res.ok && body.ok) { setSelected(body.lead); setLeads((prev) => prev.map((x) => (x.id === body.lead.id ? body.lead : x))); }
                      }}
                      className="text-[12px] font-semibold text-brand-red underline"
                    >
                      Anonimizar (derecho de supresión)
                    </button>
                  </div>
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
            {l.priceMatch && (
              <CollapsiblePanel title="Solicitud de igualación de precio">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                  <dt className="text-slate2">Compañía actual</dt>
                  <dd className="text-right font-semibold text-ink">{l.priceMatch.companiaActual || "—"}</dd>
                  <dt className="text-slate2">Precio actual</dt>
                  <dd className="text-right font-semibold tnums text-ink">
                    {l.priceMatch.precioActual != null ? `${l.priceMatch.precioActual.toFixed(2)} €/${l.priceMatch.periodicidad || "?"}` : "—"}
                  </dd>
                  <dt className="text-slate2">Solicitado</dt>
                  <dd className="text-right text-slate2">{fmt(l.priceMatch.solicitadoAt)}</dd>
                </dl>
                {l.priceMatch.comentario && (
                  <p className="mt-3 rounded-card border border-hair bg-mist/60 p-3 text-[13px] leading-relaxed text-ink">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate2">Comentario del cliente</span>
                    {l.priceMatch.comentario}
                  </p>
                )}
                {l.priceMatch.capturaUrl && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate2">Captura del presupuesto</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <a href={l.priceMatch.capturaUrl} target="_blank" rel="noreferrer">
                      <img src={l.priceMatch.capturaUrl} alt="Captura del presupuesto del cliente" className="max-h-64 w-auto rounded-card border border-hair" />
                    </a>
                  </div>
                )}
              </CollapsiblePanel>
            )}

            <CollapsiblePanel title="Actividad">
              <ActivityPanel activity={l.activity} />
            </CollapsiblePanel>

            <CollapsiblePanel title="Contactos con el cliente">
              <ContactLogPanel activity={l.activity} onLog={(channel) => patch(l.id, { contact: { channel } })} />
            </CollapsiblePanel>

            <CollapsiblePanel title="Notas">
              <NotesPanel activity={l.activity} onSave={(txt) => patch(l.id, { note: txt })} />
            </CollapsiblePanel>

            <CollapsiblePanel title="Emails">
              <EmailsPanel emails={l.emails} />
            </CollapsiblePanel>

            <CollapsiblePanel title="Presupuestos">
              <PresupuestosPanel leadId={l.id} />
            </CollapsiblePanel>

            <CollapsiblePanel title="Llamadas">
              <LlamadasPanel leadId={l.id} />
            </CollapsiblePanel>

            <CollapsiblePanel title="Tareas">
              <TasksPanel leadId={l.id} />
            </CollapsiblePanel>
          </div>
        </div>

        {emailModalOpen && (
          <SendEmailModal
            lead={{ id: l.id, nombre: l.nombre, email: l.email, producto: l.producto }}
            onClose={() => setEmailModalOpen(false)}
          />
        )}
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
        {identity?.kind === "agent" && (
          <div role="tablist" aria-label="Filtrar por cartera" className="flex gap-2">
            <FilterTab label="Todos los leads" active={filterCartera === "all"} onClick={() => setFilterCartera("all")} />
            <FilterTab label={`Mi cartera (${leads.filter((l) => l.agenteAsignadoId === identity.id).length})`} active={filterCartera === "mia"} onClick={() => setFilterCartera("mia")} />
          </div>
        )}
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono, email, código postal o campaña…"
          className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]"
        />
        <div role="group" aria-label="Filtrar por fuente" className="flex flex-wrap items-center gap-2">
          <FilterTab label={`Todas las fuentes (${leads.length})`} active={filterSource === "all"} onClick={() => setFilterSource("all")} />
          <FilterDropdown
            placeholder="Otra fuente…"
            value={filterSource === "all" ? "" : filterSource}
            onChange={(key) => setFilterSource(key || "all")}
            options={Object.entries(sources).map(([key, label]) => ({
              key, label: `${label} (${leads.filter((l) => l.sources.includes(key)).length})`,
            }))}
          />
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
                  <p className="truncate text-[15px] font-semibold text-ink">
                    {l.nombre || "Sin nombre"}
                    {l.priceMatch && (
                      <span
                        title={`Iguala precio: ${l.priceMatch.precioActual ?? "?"} €/${l.priceMatch.periodicidad} en ${l.priceMatch.companiaActual}`}
                        className="ml-1.5 inline-flex items-center rounded-pill bg-amber-100 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-amber-800"
                      >
                        Iguala precio
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[13px] text-slate2 tnums">
                    {[l.telefono || l.email, sources[l.source] ?? l.source, l.producto || null, l.agenteAsignadoNombre || null, fmt(l.updatedAt)].filter(Boolean).join(" · ")}
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
            <p className="text-[12px] text-slate2">{fmt(a.at)}{a.meta?.agente ? ` · ${a.meta.agente}` : ""}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function EmailsPanel({ emails }: { emails: EmailLog[] }) {
  if (!emails || emails.length === 0) return <p className="text-[13px] text-slate2">Sin correos enviados todavía.</p>;
  return (
    <ol className="flex flex-col gap-4">
      {emails.map((e) => (
        <li key={e.id} className="flex gap-3">
          <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-navy" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-semibold text-ink">{e.subject}</p>
              <span className={`rounded-pill px-2 py-0.5 text-[11px] font-bold ${EMAIL_STATUS_COLORS[e.status]}`}>
                {EMAIL_STATUS_LABELS[e.status]}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-slate2">
              Enviado {fmt(e.at)} a {e.to || "—"}
              {e.openedAt && ` · Abierto ${fmt(e.openedAt)}${e.openCount > 1 ? ` (${e.openCount}×)` : ""}`}
              {e.clickedAt && ` · Clic ${fmt(e.clickedAt)}${e.clickCount > 1 ? ` (${e.clickCount}×)` : ""}`}
            </p>
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
                <p className="text-[12px] text-slate2">{fmt(a.at)}{a.meta?.agente ? ` · ${a.meta.agente}` : ""}</p>
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
                <p className="text-[12px] text-slate2">{fmt(a.at)}{a.meta?.agente ? ` · ${a.meta.agente}` : ""}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

type PresupuestoEleccion = { compania: string; precio: number | null } | null;
type PresupuestoFull = {
  id: string; producto: string; status: string; data: Record<string, unknown>;
  precioAprox: number | null; eleccion: PresupuestoEleccion; nombre: string; telefono: string; updatedAt: string;
};

function PresupuestosPanel({ leadId }: { leadId: string }) {
  const { token } = useAdminToken();
  const [items, setItems] = useState<PresupuestoFull[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [waTarget, setWaTarget] = useState<PresupuestoFull | null>(null);

  useEffect(() => {
    fetch(`/api/admin/presupuestos?leadId=${leadId}`, { headers: { "x-admin-token": token } })
      .then((r) => r.json())
      .then((body) => { if (body.ok) { setItems(body.presupuestos); setStatusLabels(body.statusLabels); } })
      .finally(() => setLoaded(true));
  }, [leadId, token]);

  if (!loaded) return <p className="text-[13px] text-slate2">Cargando…</p>;
  if (items.length === 0) return <p className="text-[13px] text-slate2">Sin presupuestos generados.</p>;

  return (
    <ol className="flex flex-col gap-2">
      {items.map((s) => {
        const open = expandedId === s.id;
        const fields = Object.entries(s.data).filter(([k, v]) => SUBMISSION_FIELD_LABELS[k] && v !== "" && v !== null && v !== undefined);
        return (
          <li key={s.id} className="rounded-card border border-hair">
            <div className="flex w-full items-center justify-between gap-3 p-3.5">
              <button type="button" onClick={() => setExpandedId(open ? null : s.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[13px] font-semibold tnums text-ink">
                  #{quoteNumber(s.id)} <span className="font-normal capitalize text-slate2">· {s.producto}</span>
                  {s.eleccion && <span className="font-normal text-slate2"> · {s.eleccion.compania}</span>}
                  {typeof (s.data as { codeoscopicInsuranceId?: unknown })?.codeoscopicInsuranceId === "string" && (
                    <span
                      title={`Cotizado en Codeoscopic: ${(s.data as { codeoscopicInsuranceId: string }).codeoscopicInsuranceId}`}
                      className="ml-1.5 inline-flex items-center gap-0.5 rounded-pill bg-emerald-50 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-emerald-700"
                    >
                      Codeoscopic ✓
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-slate2">{statusLabels[s.status] ?? s.status} · {fmt(s.updatedAt)}</p>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                {(s.eleccion?.precio ?? s.precioAprox) != null && (
                  <span className="text-[13px] font-bold tnums text-navy">≈ {(s.eleccion?.precio ?? s.precioAprox)!.toFixed(2)} €/mes</span>
                )}
                <button type="button" onClick={() => setWaTarget(s)} title="Enviar WhatsApp de seguimiento" className="text-[#25D366] hover:opacity-70">
                  <WhatsApp width={18} height={18} />
                </button>
                <button type="button" onClick={() => setExpandedId(open ? null : s.id)} aria-label="Expandir" className="text-navy">
                  <span aria-hidden="true" className={`inline-block transition-transform ${open ? "rotate-180" : ""}`}>
                    <ChevronDown width={16} height={16} />
                  </span>
                </button>
              </div>
            </div>
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
                <Link href={`/admin/presupuestos/${s.id}`} className="mt-3 inline-block text-[12px] font-semibold text-navy underline">
                  Ver ficha de presupuesto (estado, notas, cierre) →
                </Link>
              </div>
            )}
          </li>
        );
      })}

      {waTarget && (
        <WhatsAppFollowupModal
          telefono={waTarget.telefono}
          presupuestoId={waTarget.id}
          ctx={{
            nombre: waTarget.nombre, producto: waTarget.producto, precioAprox: waTarget.precioAprox,
            quoteNumber: quoteNumber(waTarget.id), compania: waTarget.eleccion?.compania,
            precioElegido: waTarget.eleccion?.precio, status: waTarget.status,
          }}
          onClose={() => setWaTarget(null)}
        />
      )}
    </ol>
  );
}

const LLAMADA_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-brand-red/10 text-brand-red-deep",
  programada: "bg-navy/10 text-navy",
  hecha: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-slate-200 text-slate-600",
};

type LlamadaItem = {
  id: string; status: string; producto: string; motivo: string;
  diaLlamada: string; turnoLlamada: string; fechaProgramada: string; horaProgramada: string;
  agente: string; updatedAt: string;
};

function cuandoLlamada(l: LlamadaItem): string {
  if (l.fechaProgramada) return `${l.fechaProgramada}${l.horaProgramada ? ` · ${l.horaProgramada}` : ""}`;
  const partes = [l.diaLlamada, l.turnoLlamada].filter(Boolean);
  return partes.length ? partes.join(" · ") : "Sin programar";
}

function LlamadasPanel({ leadId }: { leadId: string }) {
  const { token, agent } = useAdminToken();
  const [items, setItems] = useState<LlamadaItem[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [producto, setProducto] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/llamadas?leadId=${leadId}`, { headers: { "x-admin-token": token } });
    const body = await res.json();
    if (body.ok) { setItems(body.llamadas); setStatusLabels(body.statusLabels); }
    setLoaded(true);
  }, [leadId, token]);

  useEffect(() => { load(); }, [load]);

  async function registrarLlamada() {
    setCreating(true);
    await fetch("/api/admin/llamadas", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ leadId, producto: producto || undefined, agente: agent }),
    });
    setProducto("");
    setCreating(false);
    load();
  }

  if (!loaded) return <p className="text-[13px] text-slate2">Cargando…</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Ramo (opcional)…"
          className="min-w-[140px] flex-1 rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
        <button onClick={registrarLlamada} disabled={creating}
          className="rounded-card bg-navy px-3 py-2 text-[13px] font-semibold text-white disabled:bg-slate2/40">
          {creating ? "Registrando…" : "+ Registrar llamada"}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-slate2">Sin llamadas solicitadas.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
          {items.map((l) => (
            <li key={l.id}>
              <Link href={`/admin/llamadas/${l.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-hair bg-mist px-3 py-2.5 text-left transition-colors hover:bg-hair/60">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold capitalize text-ink">{l.producto || "Sin ramo"} <span className="font-normal text-slate2">· {cuandoLlamada(l)}</span></p>
                  <p className="truncate text-[11px] text-slate2">{fmt(l.updatedAt)}{l.agente ? ` · ${l.agente}` : ""}</p>
                </div>
                <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-bold ${LLAMADA_STATUS_COLORS[l.status] ?? "bg-slate-200"}`}>
                  {statusLabels[l.status] ?? l.status}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

type TaskItem = {
  id: string; titulo: string; notas: string; fecha: string; hora: string;
  agente: string; completada: boolean;
};

function TasksPanel({ leadId }: { leadId: string }) {
  const { token, agent } = useAdminToken();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/tasks?leadId=${leadId}`, { headers: { "x-admin-token": token } });
    const body = await res.json();
    if (body.ok) setTasks(body.tasks);
    setLoaded(true);
  }, [leadId, token]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!titulo.trim() || !fecha) return;
    await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ leadId, titulo, fecha, agente: agent }),
    });
    setTitulo("");
    load();
  }

  async function toggle(id: string, completada: boolean) {
    await fetch(`/api/admin/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ completada }),
    });
    load();
  }

  if (!loaded) return <p className="text-[13px] text-slate2">Cargando…</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nueva tarea…"
          className="min-w-[160px] flex-1 rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
          className="rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
        <button onClick={create} disabled={!titulo.trim()}
          className="rounded-card bg-navy px-3 py-2 text-[13px] font-semibold text-white disabled:bg-slate2/40">
          Crear
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className="mt-3 text-[13px] text-slate2">Sin tareas para este lead.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start gap-2.5">
              <input type="checkbox" checked={t.completada} onChange={(e) => toggle(t.id, e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-navy" />
              <div className="min-w-0">
                <p className={`text-[14px] ${t.completada ? "text-slate2 line-through" : "text-ink"}`}>{t.titulo}</p>
                <p className="text-[12px] text-slate2">{t.fecha}{t.hora ? ` · ${t.hora}` : ""}{t.agente ? ` · ${t.agente}` : ""}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

