"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Phone, Spinner } from "./icons";
import { BRAND_NAME } from "@/lib/brand";
import { normalizePhone } from "@/lib/schema";
import { getAttribution } from "@/lib/attribution";

export function ExitIntentModal({
  open, onClose, nombre, telefono: telefonoInicial, codigoPostal, producto,
}: {
  open: boolean;
  onClose: () => void;
  nombre?: string;
  telefono?: string;
  codigoPostal?: string;
  producto?: string;
}) {
  const [telefono, setTelefono] = useState(telefonoInicial ?? "");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[6-9]\d{8}$/.test(normalizePhone(telefono))) { setError("Introduce un móvil español válido (9 dígitos)."); return; }
    if (!acepta) { setError("Necesitamos tu autorización para poder llamarte."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/exit-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre ?? "", telefono, codigoPostal: codigoPostal ?? "", producto: producto ?? "",
          aceptaPrivacidad: true, autorizaContacto: true,
          consent: { privacidadAt: new Date().toISOString(), contactoAt: new Date().toISOString() },
          company: "", utm: getAttribution(),
        }),
      });
      if (res.ok) { setSent(true); return; }
      setError("No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={sent ? "¡Hecho!" : "¿Te vas?"}>
      {sent ? (
        <div>
          <p className="text-[14px] leading-relaxed text-slate2">
            Perfecto, te llamamos en menos de 5 minutos al <span className="font-semibold tnums text-ink">{telefono}</span>. Puedes seguir mirando la web mientras tanto.
          </p>
          <button type="button" onClick={onClose}
            className="mt-5 w-full rounded-card bg-navy px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep">
            Entendido
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red">
              <Phone width={20} height={20} />
            </span>
            <p className="text-[14px] leading-relaxed text-slate2">
              No hace falta que termines el cálculo ahora. Déjanos tu móvil y un asesor de {BRAND_NAME} te llama <span className="font-semibold text-ink">gratis en menos de 5 minutos</span> para ayudarte con el precio.
            </p>
          </div>

          <label htmlFor="ei-telefono" className="mt-5 mb-1.5 block text-[14px] font-semibold text-ink">Teléfono móvil</label>
          <input
            id="ei-telefono" name="tel" type="tel" inputMode="tel" autoComplete="tel" autoFocus
            value={telefono} onChange={(e) => setTelefono(e.target.value)}
            placeholder="600 000 000…"
            className="w-full rounded-card border border-hair bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-slate2/60"
          />

          <label htmlFor="ei-acepta" className="mt-4 flex cursor-pointer items-start gap-3">
            <input id="ei-acepta" type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy" />
            <span className="text-[13px] leading-relaxed text-slate2">
              Autorizo a {BRAND_NAME} a llamarme y acepto la{" "}
              <a href="/legal" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">política de privacidad</a>.
            </span>
          </label>

          {error && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{error}</p>}

          <button
            type="submit" disabled={submitting} aria-busy={submitting || undefined}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-brand-red px-4 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
          >
            {submitting && <Spinner />}
            {submitting ? "Enviando…" : "Sí, llamadme en 5 minutos"}
          </button>
          <button type="button" onClick={onClose} className="mt-3 w-full text-center text-[13px] font-medium text-slate2 underline">
            No, prefiero seguir yo
          </button>
        </form>
      )}
    </Modal>
  );
}
