"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { quoteNumber } from "@/lib/quote";
import { fmt, SUBMISSION_FIELD_LABELS, formatSubmissionValue, PRESUPUESTO_STATUS_COLORS } from "@/lib/adminFormat";
import { CollapsiblePanel, NoteBox } from "@/components/admin/Widgets";
import { WhatsAppFollowupModal } from "@/components/admin/WhatsAppFollowupModal";
import { NpsCard } from "@/components/admin/NpsCard";
import { ProductFormWidget } from "@/components/ProductFormWidget";

type PresupuestoNote = { id: string; at: string; texto: string; agente?: string };
type PresupuestoEleccion = { compania: string; precio: number | null; condiciones?: string; servicios?: string[]; at: string };
type CodeoscopicQuoteSummary = {
  id: string; compania: string; producto: string; modalidad: string;
  premium: number | null; downPayment: number | null; frequency: string; estimate: boolean;
};
type CodeoscopicSnapshot = { updatedAt: string; done: boolean; quotes: CodeoscopicQuoteSummary[] };
type Presupuesto = {
  id: string; leadId: string; createdAt: string; updatedAt: string; closedAt: string;
  source: string; producto: string; status: string; data: Record<string, unknown>;
  precioAprox: number | null; notas: PresupuestoNote[]; eleccion: PresupuestoEleccion | null;
  closedBy: string;
  nombre: string; telefono: string; email: string;
};
type LeadSummary = { id: string; nombre: string; telefono: string; email: string; status: string } | null;

export default function AdminPresupuestoDetailPage() {
  return (
    <AdminShell active="presupuestos">
      <PresupuestoDetail />
    </AdminShell>
  );
}

function PresupuestoDetail() {
  const params = useParams<{ id: string }>();
  const { token, agent } = useAdminToken();
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [lead, setLead] = useState<LeadSummary>(null);
  const [nps, setNps] = useState<{ score: number; comentario: string; createdAt: string } | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [waOpen, setWaOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [detailRes, listRes] = await Promise.all([
        fetch(`/api/admin/presupuestos/${params.id}`, { headers: { "x-admin-token": token } }),
        fetch("/api/admin/presupuestos", { headers: { "x-admin-token": token } }),
      ]);
      const detail = await detailRes.json();
      const list = await listRes.json();
      if (!detailRes.ok || !detail.ok) { setError(detail.error ?? "No se pudo cargar el presupuesto."); setLoading(false); return; }
      setPresupuesto(detail.presupuesto);
      setLead(detail.lead);
      setNps(detail.nps ?? null);
      if (list.ok) { setStatuses(list.statuses); setStatusLabels(list.statusLabels); }
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [params.id, token]);

  useEffect(() => { load(); }, [load]);

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch(`/api/admin/presupuestos/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ ...payload, agente: agent }),
    });
    const body = await res.json();
    if (res.ok && body.ok) setPresupuesto(body.presupuesto);
  }

  async function downloadPdf() {
    if (!presupuesto) return;
    const p = presupuesto;
    const compania = p.eleccion?.compania || "Asegurados Ventajon";
    const precio = p.eleccion?.precio ?? p.precioAprox ?? 0;
    setDownloading(true);
    try {
      const res = await fetch("/api/presupuesto/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto: p.producto,
          compania,
          quote: {
            id: p.leadId, nombre: p.nombre, telefono: p.telefono, email: p.email,
            codigoPostal: p.data.codigoPostal, fechaNacimiento: p.data.fechaNacimiento,
            numAsegurados: p.data.numAsegurados, motivo: p.data.motivo, fumador: p.data.fumador,
            tipoVehiculo: p.data.tipoVehiculo, matricula: p.data.matricula,
          },
          precio: p.producto === "salud" ? { conCopago: precio, sinCopago: p.eleccion?.precio ?? precio } : { precio },
          servicios: p.eleccion?.servicios ?? [],
          condiciones: p.eleccion?.condiciones ?? "",
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presupuesto-${quoteNumber(p.id)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-4xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;
  }
  if (error || !presupuesto) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10 text-center">
        <p className="font-medium text-brand-red">{error ?? "Presupuesto no encontrado."}</p>
        <Link href="/admin/presupuestos" className="mt-3 inline-block text-[14px] font-semibold text-navy">← Volver al listado</Link>
      </main>
    );
  }

  const p = presupuesto;
  const fields = Object.entries(p.data).filter(([k, v]) => SUBMISSION_FIELD_LABELS[k] && v !== "" && v !== null && v !== undefined);

  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <Link href="/admin/presupuestos" className="text-[14px] font-semibold text-navy">← Volver al listado</Link>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        {/* IZQUIERDA (30%): resumen del presupuesto */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-[19px] font-extrabold leading-tight tnums text-navy">#{quoteNumber(p.id)}</h1>
              <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold ${PRESUPUESTO_STATUS_COLORS[p.status] ?? "bg-slate-200"}`}>
                {statusLabels[p.status] ?? p.status}
              </span>
            </div>
            <p className="mt-1 text-[14px] font-semibold text-ink">Seguro de {p.producto}</p>
            {p.precioAprox != null && (
              <p className="mt-1 text-[22px] font-extrabold tnums text-navy">
                ≈ {p.precioAprox.toFixed(2)} €<span className="text-[14px] font-medium text-slate2">/mes</span>
              </p>
            )}

            <dl className="mt-5 flex flex-col gap-2.5 text-[13px]">
              <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Cliente</dt><dd className="text-right font-medium text-ink">{p.nombre || "—"}</dd></div>
              <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Teléfono</dt><dd className="text-right font-medium tnums text-ink">{p.telefono || "—"}</dd></div>
              <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Email</dt><dd className="text-right font-medium text-ink">{p.email || "—"}</dd></div>
              <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Creado</dt><dd className="text-right font-medium text-ink">{fmt(p.createdAt)}</dd></div>
              <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Actualizado</dt><dd className="text-right font-medium text-ink">{fmt(p.updatedAt)}</dd></div>
              {p.closedAt && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Cerrado</dt><dd className="text-right font-medium text-ink">{fmt(p.closedAt)}</dd></div>}
            </dl>

            <div className="mt-5 border-t border-hair pt-4">
              <p className="text-[12px] font-semibold text-ink">Lead vinculado</p>
              {lead ? (
                <Link href={`/admin?lead=${lead.id}`} className="mt-1.5 block text-[13px] font-semibold text-navy underline">
                  Ver ficha completa del lead →
                </Link>
              ) : (
                <p className="mt-1.5 text-[12px] text-slate2">Sin lead vinculado.</p>
              )}
            </div>

            {p.eleccion && (
              <div className="mt-5 border-t border-hair pt-4">
                <p className="text-[12px] font-semibold text-ink">Elección del cliente</p>
                <dl className="mt-1.5 flex flex-col gap-1.5 text-[13px]">
                  <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Aseguradora</dt><dd className="text-right font-semibold text-ink">{p.eleccion.compania}</dd></div>
                  {p.eleccion.precio != null && (
                    <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Precio</dt><dd className="text-right font-semibold tnums text-navy">{p.eleccion.precio.toFixed(2)} €/mes</dd></div>
                  )}
                  <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Elegido</dt><dd className="text-right font-medium text-ink">{fmt(p.eleccion.at)}</dd></div>
                </dl>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 border-t border-hair pt-4">
              <button type="button" onClick={() => setWaOpen(true)}
                className="flex items-center justify-center rounded-card bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
                Enviar WhatsApp de seguimiento
              </button>
              <button type="button" onClick={downloadPdf} disabled={downloading}
                className="flex items-center justify-center rounded-card border border-navy px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
                {downloading ? "Generando…" : "Descargar presupuesto en PDF"}
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <label className="block text-[13px] font-semibold text-ink">Estado</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button key={s} onClick={() => patch({ status: s })}
                  className={`rounded-pill px-3 py-1.5 text-[13px] font-semibold transition-colors ${p.status === s ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
                  {statusLabels[s] ?? s}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-slate2">
              Marcar como <b className="text-ink">Ganado</b> o <b className="text-ink">Perdido</b> cierra el presupuesto y registra la fecha.
            </p>
            {p.closedBy && <p className="mt-2 text-[12px] text-slate2">Cerrado por <b className="text-ink">{p.closedBy}</b>.</p>}
          </div>

          {(p.status === "ganado" || nps) && <NpsCard nps={nps} />}
        </div>

        {/* DERECHA (70%): paneles colapsables */}
        <div className="flex flex-col gap-4">
          <CollapsiblePanel title="Datos del tarificador">
            {fields.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                {fields.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-slate2">{SUBMISSION_FIELD_LABELS[k] ?? k}</dt>
                    <dd className="font-medium text-ink">{formatSubmissionValue(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="text-[13px] text-slate2">Sin detalles adicionales.</p>}
          </CollapsiblePanel>

          <CodeoscopicPanel presupuesto={p} onUpdated={load} />

          <CollapsiblePanel title={`Notas internas (${p.notas.length})`}>
            <NoteBox onSave={(txt) => patch({ note: txt })} placeholder="Escribe una nota de seguimiento sobre este presupuesto…" />
            {p.notas.length === 0 ? (
              <p className="mt-3 text-[13px] text-slate2">Sin notas todavía.</p>
            ) : (
              <ol className="mt-4 flex flex-col gap-3">
                {p.notas.map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-red" />
                    <div>
                      <p className="text-[14px] text-ink">{n.texto}</p>
                      <p className="text-[12px] text-slate2">{fmt(n.at)}{n.agente ? ` · ${n.agente}` : ""}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CollapsiblePanel>
        </div>
      </div>

      {waOpen && (
        <WhatsAppFollowupModal
          telefono={p.telefono}
          presupuestoId={p.id}
          ctx={{
            nombre: p.nombre, producto: p.producto, precioAprox: p.precioAprox,
            quoteNumber: quoteNumber(p.id), compania: p.eleccion?.compania,
            precioElegido: p.eleccion?.precio, status: p.status,
          }}
          onClose={() => setWaOpen(false)}
        />
      )}
    </main>
  );
}

/* --------------------------- Codeoscopic panel ---------------------------- */
// Bloque exclusivo del back office: muestra el proyecto vivo en Codeoscopic
// (motor Avant2) para este presupuesto. Sirve al asesor para (a) localizar
// el proyecto en el portal de Codeoscopic con su id real, (b) ver el detalle
// de cotizaciones sin volver a llamar a Codeoscopic, y (c) refrescar el
// snapshot bajo demanda si sospecha que la API tiene datos más nuevos.
function CodeoscopicPanel({ presupuesto, onUpdated }: { presupuesto: Presupuesto; onUpdated: () => Promise<void> | void }) {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Widget AvantProductForm: se abre en modal por cotización, permite al
  // agente afinar coberturas/franquicias antes de presentar el precio final.
  const [configuring, setConfiguring] = useState<{ quoteId: string; compania: string } | null>(null);

  const insuranceId = typeof presupuesto.data?.codeoscopicInsuranceId === "string" ? presupuesto.data.codeoscopicInsuranceId : "";
  const rawSnapshot = presupuesto.data?.codeoscopicSnapshot as CodeoscopicSnapshot | undefined;
  const snapshot: CodeoscopicSnapshot | null =
    rawSnapshot && Array.isArray(rawSnapshot.quotes)
      ? { updatedAt: String(rawSnapshot.updatedAt ?? ""), done: !!rawSnapshot.done, quotes: rawSnapshot.quotes }
      : null;

  async function refresh() {
    if (!insuranceId) return;
    setRefreshing(true); setError(null);
    try {
      const res = await fetch(`/api/quote/${encodeURIComponent(insuranceId)}?pid=${encodeURIComponent(presupuesto.id)}`);
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) { setError(body?.reason ?? "No se pudo refrescar."); return; }
      await onUpdated();
    } catch { setError("Fallo de red al refrescar."); }
    finally { setRefreshing(false); }
  }

  async function copyId() {
    if (!insuranceId) return;
    try {
      await navigator.clipboard.writeText(insuranceId);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  }

  if (!insuranceId) {
    // Presupuestos anteriores a la integración (o Codeoscopic no configurado
    // al crearlos) — no mostramos el bloque para no ensuciar la ficha.
    return null;
  }

  const totalQuotes = snapshot?.quotes.length ?? 0;
  const withPremium = snapshot?.quotes.filter((q) => q.premium != null).length ?? 0;

  return (
    <CollapsiblePanel title={`Codeoscopic (motor de tarificación)${totalQuotes ? ` · ${totalQuotes} cotizaciones` : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-slate2">Proyecto Nº</span>
        <code className="rounded bg-mist px-2 py-1 text-[13px] font-semibold tnums text-navy">{insuranceId}</code>
        <button type="button" onClick={copyId} className="text-[12px] font-semibold text-navy underline">
          {copied ? "Copiado" : "Copiar"}
        </button>
        <button
          type="button" onClick={refresh} disabled={refreshing}
          className="ml-auto rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist disabled:opacity-60"
        >
          {refreshing ? "Refrescando…" : "Refrescar snapshot"}
        </button>
      </div>

      {snapshot?.updatedAt && (
        <p className="mt-2 text-[12px] text-slate2">
          Último snapshot: {fmt(snapshot.updatedAt)}
          {snapshot.done ? " · todas las aseguradoras respondieron" : " · aún hay compañías procesando"}
        </p>
      )}

      {error && <p role="alert" className="mt-2 text-[12px] font-medium text-brand-red">{error}</p>}

      {snapshot && snapshot.quotes.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {snapshot.quotes.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center gap-3 rounded-card border border-hair bg-mist/40 p-3">
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-ink">{q.compania}</span>
                {(q.producto || q.modalidad) && (
                  <span className="text-[11px] text-slate2">{[q.producto, q.modalidad].filter(Boolean).join(" · ")}</span>
                )}
              </div>
              <div className="ml-auto flex flex-col items-end gap-1">
                {q.premium != null ? (
                  <p className="text-[13px] font-bold tnums text-navy">
                    {q.premium.toFixed(2)} €<span className="text-[11px] font-medium text-slate2">/{q.frequency === "Monthly" ? "mes" : q.frequency === "Annually" ? "año" : "período"}</span>
                  </p>
                ) : (
                  <p className="text-[12px] italic text-slate2">Calculando…</p>
                )}
                {q.downPayment != null && q.downPayment > 0 && q.downPayment !== q.premium && (
                  <p className="text-[11px] text-slate2">Prima inicial {q.downPayment.toFixed(2)} €</p>
                )}
                {q.estimate && <p className="text-[11px] italic text-slate2">Estimativo</p>}
                <button
                  type="button"
                  onClick={() => setConfiguring({ quoteId: q.id, compania: q.compania })}
                  className="mt-1 rounded-card border border-hair bg-white px-2.5 py-1 text-[11px] font-semibold text-navy transition-colors hover:bg-mist"
                >
                  Configurar cobertura
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12px] text-slate2">
          Aún sin cotizaciones registradas. Pulsa &quot;Refrescar snapshot&quot; para pedirlas a Codeoscopic ahora.
        </p>
      )}

      {configuring && (
        <div
          role="dialog" aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
          onClick={(e) => { if (e.currentTarget === e.target) setConfiguring(null); }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-t-[24px] bg-white shadow-card md:rounded-[24px]">
            <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-hair bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate2">Configurar cobertura</p>
                <h3 className="truncate text-[16px] font-extrabold text-navy">{configuring.compania}</h3>
              </div>
              <button type="button" onClick={() => setConfiguring(null)} aria-label="Cerrar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-slate2 hover:bg-mist">
                ✕
              </button>
            </header>
            <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">
              <ProductFormWidget
                insuranceId={insuranceId}
                quoteId={configuring.quoteId}
                onFinished={async () => {
                  // Al terminar la configuración, refrescamos el snapshot
                  // para pintar el precio afinado sin cerrar el modal.
                  await onUpdated();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </CollapsiblePanel>
  );
}
