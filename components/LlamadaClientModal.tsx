"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Spinner } from "./icons";
import { DIAS_LLAMADA, TURNOS_LLAMADA } from "@/lib/brand";
import { CallSlotPicker, type CallSlot } from "./CallSlotPicker";
import { quoteNumber } from "@/lib/quote";

export type LlamadaView = {
  id: string; producto: string; status: string; presupuestoId: string;
  diaLlamada: string; turnoLlamada: string; fechaProgramada: string; horaProgramada: string;
  createdAt: string; updatedAt: string;
};

function cuando(l: LlamadaView): string {
  if (l.fechaProgramada) {
    const d = new Date(`${l.fechaProgramada}T${l.horaProgramada || "00:00"}:00`);
    const txt = Number.isNaN(d.getTime())
      ? l.fechaProgramada
      : d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
    return l.horaProgramada ? `el ${txt} a las ${l.horaProgramada}` : `el ${txt}`;
  }
  const partes = [l.diaLlamada, l.turnoLlamada].filter((v) => v && v !== DIAS_LLAMADA[0] && v !== TURNOS_LLAMADA[0]);
  return partes.length ? partes.join(" · ") : "";
}

// Ficha de UNA llamada del cliente: ver cuándo es (y su presupuesto
// asociado si lo tiene), reprogramarla o cancelarla — todo se refleja al
// momento en /admin/llamadas y en la ficha del lead.
export function LlamadaClientModal({
  llamada, onClose, onUpdated,
}: {
  llamada: LlamadaView;
  onClose: () => void;
  onUpdated: (l: LlamadaView) => void;
}) {
  const [view, setView] = useState<"detalle" | "reprogramar" | "cancelar">("detalle");
  const [slot, setSlot] = useState<CallSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(action: string, extra?: Record<string, string>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/llamadas/${llamada.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? "No hemos podido completar la acción. Inténtalo de nuevo.");
        setSubmitting(false);
        return;
      }
      onUpdated(body.llamada);
      onClose();
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  const cuandoTxt = cuando(llamada);
  const title = llamada.producto ? `Seguro de ${llamada.producto}` : "Tu llamada";
  const activa = llamada.status === "pendiente" || llamada.status === "programada";

  return (
    <Modal open onClose={onClose} title={title}>
      {view === "detalle" && (
        <div>
          <p className="text-[15px] font-semibold text-navy">
            {llamada.fechaProgramada
              ? `Llamada programada para ${cuandoTxt}`
              : cuandoTxt
                ? `Aún por concretar — prefieres ${cuandoTxt}`
                : "Aún no hemos concretado cuándo"}
          </p>
          {llamada.presupuestoId && (
            <p className="mt-1.5 text-[13px] tnums text-slate2">Presupuesto nº {quoteNumber(llamada.presupuestoId)}</p>
          )}

          {error && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{error}</p>}

          {activa ? (
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button" onClick={() => { setError(null); setView("reprogramar"); }}
                className="rounded-card border border-hair px-4 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-mist"
              >
                Reprogramar llamada
              </button>
              <button
                type="button" onClick={() => { setError(null); setView("cancelar"); }}
                className="rounded-card border border-hair px-4 py-3 text-[14px] font-semibold text-brand-red transition-colors hover:bg-brand-red/5"
              >
                Cancelar llamada
              </button>
            </div>
          ) : (
            <p className="mt-4 text-[13px] leading-relaxed text-slate2">
              Esta llamada ya no está activa{llamada.status === "hecha" ? ": la completamos." : ": la cancelamos."}
            </p>
          )}
        </div>
      )}

      {view === "reprogramar" && (
        <div>
          <p className="text-[14px] leading-relaxed text-slate2">¿Cuándo prefieres que te llamemos?</p>
          <div className="mt-3">
            <CallSlotPicker value={slot} onChange={setSlot} />
          </div>

          {error && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{error}</p>}

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setView("detalle")} disabled={submitting}
              className="flex-1 rounded-card border border-hair px-4 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-mist disabled:opacity-50">
              Volver
            </button>
            <button
              type="button"
              onClick={() => { if (!slot) { setError("Elige un día y un turno."); return; } send("reprogramar", { fechaProgramada: slot.fecha, turnoLlamada: slot.turno }); }}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-card bg-brand-red px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
            >
              {submitting && <Spinner />}
              {submitting ? "Guardando…" : "Confirmar"}
            </button>
          </div>
        </div>
      )}

      {view === "cancelar" && (
        <div>
          <p className="text-[14px] leading-relaxed text-slate2">
            ¿Seguro que quieres cancelar esta llamada? Puedes pedir que te llamemos de nuevo cuando quieras.
          </p>

          {error && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{error}</p>}

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setView("detalle")} disabled={submitting}
              className="flex-1 rounded-card border border-hair px-4 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-mist disabled:opacity-50">
              Volver
            </button>
            <button
              type="button" onClick={() => send("cancelar")} disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-card bg-brand-red px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
            >
              {submitting && <Spinner />}
              {submitting ? "Cancelando…" : "Sí, cancelar"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
