"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { fmt } from "@/lib/adminFormat";
import { CollapsiblePanel, NoteBox } from "@/components/admin/Widgets";

type LlamadaNote = { id: string; at: string; texto: string; agente?: string };
type Llamada = {
  id: string; leadId: string; createdAt: string; updatedAt: string; status: string;
  producto: string; source: string; presupuestoId: string; motivo: string;
  diaLlamada: string; turnoLlamada: string; fechaProgramada: string; horaProgramada: string;
  agente: string; notas: LlamadaNote[];
  nombre: string; telefono: string; codigoPostal: string;
};
type LeadSummary = { id: string; nombre: string; telefono: string; email: string; status: string } | null;

const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-brand-red/10 text-brand-red-deep",
  programada: "bg-navy/10 text-navy",
  hecha: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-slate-200 text-slate-600",
};

export default function AdminLlamadaDetailPage() {
  return (
    <AdminShell active="llamadas">
      <LlamadaDetail />
    </AdminShell>
  );
}

function LlamadaDetail() {
  const params = useParams<{ id: string }>();
  const { token, agent } = useAdminToken();
  const [llamada, setLlamada] = useState<Llamada | null>(null);
  const [lead, setLead] = useState<LeadSummary>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [horaProgramada, setHoraProgramada] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [detailRes, listRes] = await Promise.all([
        fetch(`/api/admin/llamadas/${params.id}`, { headers: { "x-admin-token": token } }),
        fetch("/api/admin/llamadas", { headers: { "x-admin-token": token } }),
      ]);
      const detail = await detailRes.json();
      const list = await listRes.json();
      if (!detailRes.ok || !detail.ok) { setError(detail.error ?? "No se pudo cargar la llamada."); setLoading(false); return; }
      setLlamada(detail.llamada);
      setLead(detail.lead);
      setFechaProgramada(detail.llamada.fechaProgramada || "");
      setHoraProgramada(detail.llamada.horaProgramada || "");
      if (list.ok) { setStatuses(list.statuses); setStatusLabels(list.statusLabels); }
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [params.id, token]);

  useEffect(() => { load(); }, [load]);

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch(`/api/admin/llamadas/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ ...payload, agente: agent }),
    });
    const body = await res.json();
    if (res.ok && body.ok) setLlamada(body.llamada);
  }

  async function saveReschedule() {
    if (!fechaProgramada) return;
    setRescheduling(true);
    await patch({ status: "programada", fechaProgramada, horaProgramada });
    setRescheduling(false);
  }

  if (loading) {
    return <main className="mx-auto max-w-4xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;
  }
  if (error || !llamada) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10 text-center">
        <p className="font-medium text-brand-red">{error ?? "Llamada no encontrada."}</p>
        <Link href="/admin/llamadas" className="mt-3 inline-block text-[14px] font-semibold text-navy">← Volver al listado</Link>
      </main>
    );
  }

  const l = llamada;

  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <Link href="/admin/llamadas" className="text-[14px] font-semibold text-navy">← Volver al listado</Link>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        {/* IZQUIERDA: resumen de la llamada */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-[19px] font-extrabold leading-tight text-navy">{l.nombre || "Sin nombre"}</h1>
              <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[l.status] ?? "bg-slate-200"}`}>
                {statusLabels[l.status] ?? l.status}
              </span>
            </div>
            {l.producto && <p className="mt-1 text-[14px] font-semibold capitalize text-ink">Seguro de {l.producto}</p>}

            <dl className="mt-5 flex flex-col gap-2.5 text-[13px]">
              <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Teléfono</dt><dd className="text-right font-medium tnums text-ink">{l.telefono || "—"}</dd></div>
              <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Código postal</dt><dd className="text-right font-medium tnums text-ink">{l.codigoPostal || "—"}</dd></div>
              <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Preferencia del cliente</dt><dd className="text-right font-medium text-ink">{[l.diaLlamada, l.turnoLlamada].filter(Boolean).join(" · ") || "—"}</dd></div>
              {l.motivo && <div className="flex items-baseline justify-between gap-3"><dt className="shrink-0 text-slate2">Motivo</dt><dd className="text-right font-medium text-ink">{l.motivo}</dd></div>}
              <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Solicitada</dt><dd className="text-right font-medium text-ink">{fmt(l.createdAt)}</dd></div>
              <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Actualizada</dt><dd className="text-right font-medium text-ink">{fmt(l.updatedAt)}</dd></div>
              {l.agente && <div className="flex items-baseline justify-between gap-3"><dt className="text-slate2">Gestiona</dt><dd className="text-right font-medium text-ink">{l.agente}</dd></div>}
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
              {l.presupuestoId && (
                <Link href={`/admin/presupuestos/${l.presupuestoId}`} className="mt-1.5 block text-[13px] font-semibold text-navy underline">
                  Ver presupuesto sobre el que trata →
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <label className="block text-[13px] font-semibold text-ink">Estado</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button key={s} onClick={() => patch({ status: s })}
                  className={`rounded-pill px-3 py-1.5 text-[13px] font-semibold transition-colors ${l.status === s ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
                  {statusLabels[s] ?? s}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-slate2">
              <b className="text-ink">Hecha</b> marca la llamada como completada. <b className="text-ink">Cancelada</b> la cierra sin completar.
              Ambos avisan al cliente en su área y por push (si lo tiene activado).
            </p>
          </div>

          <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <label className="block text-[13px] font-semibold text-ink">Reprogramar llamada</label>
            <p className="mt-1 text-[12px] text-slate2">Fija una fecha (y hora, opcional) concreta. Avisa al cliente automáticamente.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input type="date" value={fechaProgramada} onChange={(e) => setFechaProgramada(e.target.value)}
                className="rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
              <input type="time" value={horaProgramada} onChange={(e) => setHoraProgramada(e.target.value)}
                className="rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            </div>
            <button type="button" onClick={saveReschedule} disabled={!fechaProgramada || rescheduling}
              className="mt-3 flex w-full items-center justify-center rounded-card bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:cursor-not-allowed disabled:bg-slate2/40">
              {rescheduling ? "Guardando…" : "Guardar reprogramación"}
            </button>
          </div>
        </div>

        {/* DERECHA: comentarios */}
        <div className="flex flex-col gap-4">
          <CollapsiblePanel title={`Comentarios (${l.notas.length})`}>
            <NoteBox onSave={(txt) => patch({ note: txt })} placeholder="Escribe un comentario de seguimiento sobre esta llamada…" />
            {l.notas.length === 0 ? (
              <p className="mt-3 text-[13px] text-slate2">Sin comentarios todavía.</p>
            ) : (
              <ol className="mt-4 flex flex-col gap-3">
                {l.notas.map((n) => (
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
    </main>
  );
}
