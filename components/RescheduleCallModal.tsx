"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Spinner } from "./icons";
import { DIAS_LLAMADA, TURNOS_LLAMADA } from "@/lib/brand";
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
  const [dia, setDia] = useState(quote.diaLlamada ?? DIAS_LLAMADA[0]);
  const [turno, setTurno] = useState(quote.turnoLlamada ?? TURNOS_LLAMADA[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function confirm() {
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
          diaLlamada: dia,
          turnoLlamada: turno,
          aceptaPrivacidad: true,
          autorizaContacto: true,
          aceptaComercial: !!quote.consentAt?.comercialAt,
          company: "",
          consent: quote.consentAt,
        }),
      });
      if (!res.ok) { setError("No hemos podido reprogramar tu llamada. Inténtalo de nuevo."); setSubmitting(false); return; }
      const updated: QuoteProfile = { ...quote, diaLlamada: dia, turnoLlamada: turno };
      saveCallResult({ nombre: quote.nombre, diaLlamada: dia, turnoLlamada: turno });
      saveClientProfile({ nombre: quote.nombre, telefono: quote.telefono, diaLlamada: dia, turnoLlamada: turno });
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
            Listo. Te llamamos {dia !== DIAS_LLAMADA[0] ? `el ${dia}` : "cuando antes podamos"}
            {turno !== TURNOS_LLAMADA[0] ? ` en el turno de ${turno.toLowerCase()}` : ""} sobre tu{" "}
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
            <p className="mb-2 text-[13px] font-semibold text-ink">Mejor día</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mejor día para llamar">
              {DIAS_LLAMADA.map((d) => (
                <button key={d} type="button" aria-pressed={dia === d} onClick={() => setDia(d)}
                  className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors ${dia === d ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-[13px] font-semibold text-ink">Turno</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Turno para llamar">
              {TURNOS_LLAMADA.map((t) => (
                <button key={t} type="button" aria-pressed={turno === t} onClick={() => setTurno(t)}
                  className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors ${turno === t ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-brand-red/10 px-4 py-3 text-[13px] font-medium text-brand-red-deep">{error}</p>
          )}

          <button
            type="button" onClick={confirm} disabled={submitting}
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
