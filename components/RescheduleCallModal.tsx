"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Spinner } from "./icons";
import { CallSlotPicker, type CallSlot } from "./CallSlotPicker";
import { quoteNumber, saveCallResult, type QuoteProfile } from "@/lib/quote";
import { saveClientProfile, addClientQuote } from "@/lib/clientArea";

// Modal dedicado para reprogramar la llamada de UN presupuesto concreto desde
// el área de cliente. Va vinculado al id del presupuesto (presupuestoId) para
// no confundirse con el formulario genérico "quiero que me llamen".
export function RescheduleCallModal({
  quote, onClose, onUpdated,
}: {
  quote: QuoteProfile;
  onClose: () => void;
  onUpdated: (q: QuoteProfile) => void;
}) {
  const [slot, setSlot] = useState<CallSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function confirm() {
    if (!slot) { setError("Elige un día y un turno."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/call-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: quote.nombre ?? "",
          telefono: quote.telefono,
          codigoPostal: quote.codigoPostal ?? "",
          producto: quote.producto,
          presupuestoId: quote.id,
          turnoLlamada: slot.turno, fechaProgramada: slot.fecha,
          aceptaPrivacidad: true,
          autorizaContacto: true,
          aceptaComercial: !!quote.consentAt?.comercialAt,
          company: "",
          consent: quote.consentAt,
        }),
      });
      if (!res.ok) { setError("No hemos podido reprogramar tu llamada. Inténtalo de nuevo."); setSubmitting(false); return; }
      const updated: QuoteProfile = { ...quote, diaLlamada: slot.fecha, turnoLlamada: slot.turno };
      saveCallResult({ nombre: quote.nombre, diaLlamada: slot.fecha, turnoLlamada: slot.turno });
      saveClientProfile({ nombre: quote.nombre, telefono: quote.telefono, diaLlamada: slot.fecha, turnoLlamada: slot.turno });
      addClientQuote(updated);
      onUpdated(updated);
      setDone(true);
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Reprogramar llamada · Presupuesto nº ${quoteNumber(quote.id)}`}>
      {done ? (
        <div>
          <p className="text-[14px] leading-relaxed text-ink">
            Listo. Te llamamos el {slot ? new Date(`${slot.fecha}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : ""}
            {slot ? ` en el turno de ${slot.turno.toLowerCase()}` : ""} sobre tu{" "}
            {quote.producto === "vida" ? "seguro de vida" : "seguro de salud"}.
          </p>
          <button
            type="button" onClick={onClose}
            className="mt-5 flex w-full items-center justify-center rounded-card bg-navy px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <div>
          <p className="text-[14px] leading-relaxed text-slate2">
            Elige cuándo prefieres que te llamemos sobre este presupuesto. Ya tenemos tu autorización de contacto, no
            hace falta que la repitas.
          </p>

          <div className="mt-4">
            <CallSlotPicker value={slot} onChange={setSlot} />
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-brand-red/10 px-4 py-3 text-[13px] font-medium text-brand-red-deep">{error}</p>
          )}

          <button
            type="button" onClick={confirm} disabled={submitting || !slot}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
          >
            {submitting && <Spinner />}
            {submitting ? "Enviando…" : "Confirmar reprogramación"}
          </button>
        </div>
      )}
    </Modal>
  );
}
