"use client";

import { useState } from "react";
import { normalizePhone } from "@/lib/schema";
import { getAttribution } from "@/lib/attribution";
import { BRAND_NAME } from "@/lib/brand";
import { Spinner } from "./icons";

// Calculadora de ahorro embebida en las landings SEO: primero da una
// estimación instantánea (sin pedir nada) para que el usuario vea valor de
// inmediato, y solo al pulsar "Quiero mi comparativa real" pide el teléfono
// — captura el dato aunque no llegue a completar el tarificador completo de
// más abajo en la misma página.
export function SavingsCalculator({ slug, pricePerAsegurado }: { slug: string; pricePerAsegurado: number }) {
  const [pagoActual, setPagoActual] = useState("");
  const [numAsegurados, setNumAsegurados] = useState(1);
  const [showCapture, setShowCapture] = useState(false);
  const [telefono, setTelefono] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const pago = Number(pagoActual) || 0;
  const estimado = pricePerAsegurado * numAsegurados;
  const ahorro = pago > estimado ? Math.round(pago - estimado) : null;
  const haCalculado = pago > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[6-9]\d{8}$/.test(normalizePhone(telefono))) { setError("Introduce un móvil español válido (9 dígitos)."); return; }
    if (!acepta) { setError("Necesitamos tu autorización para poder llamarte."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/calculadora-ahorro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono, pagoActual: pago || undefined, numAsegurados, slug,
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
    <div className="rounded-[24px] border border-hair bg-white p-6 shadow-soft md:p-8">
      <h2 className="text-[20px] font-extrabold text-navy md:text-[24px]">Calcula cuánto podrías ahorrar</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-slate2">Dinos lo que pagas ahora y te decimos al momento cuánto podrías ahorrar comparando.</p>

      {sent ? (
        <p className="mt-5 text-[14px] leading-relaxed text-ink">
          Perfecto, te llamamos pronto al <span className="font-semibold tnums">{telefono}</span> con tu comparativa real. Mientras tanto, puedes seguir viendo tu precio exacto más abajo.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-ink">¿Cuánto pagas ahora al mes?</span>
              <div className="relative">
                <input
                  type="number" inputMode="decimal" min={0} max={2000} step={1}
                  value={pagoActual} onChange={(e) => setPagoActual(e.target.value)}
                  placeholder="Ej. 55"
                  className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px] text-ink placeholder:text-slate2/60"
                />
                <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-slate2">€/mes</span>
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-ink">¿Cuántos asegurados?</span>
              <input
                type="number" inputMode="numeric" min={1} max={20} step={1}
                value={numAsegurados} onChange={(e) => setNumAsegurados(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px] text-ink"
              />
            </label>
          </div>

          {haCalculado && (
            <div className="mt-5 rounded-card bg-mist p-4">
              <p className="text-[13px] text-slate2">Podrías pagar desde</p>
              <p className="text-[26px] font-extrabold tnums text-navy">{estimado.toLocaleString("es-ES")} €/mes</p>
              {ahorro != null ? (
                <p className="mt-1 text-[14px] font-semibold text-emerald-700">Ahorro estimado: ~{ahorro.toLocaleString("es-ES")} €/mes</p>
              ) : (
                <p className="mt-1 text-[13px] leading-relaxed text-slate2">Es una estimación orientativa: confírmalo con tu comparativa real, gratis y sin compromiso.</p>
              )}
            </div>
          )}

          {!showCapture ? (
            <button
              type="button" onClick={() => setShowCapture(true)}
              className="mt-5 w-full rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
            >
              Quiero mi comparativa real gratis
            </button>
          ) : (
            <form onSubmit={submit} className="mt-5">
              <label htmlFor={`sc-telefono-${slug}`} className="mb-1.5 block text-[13px] font-semibold text-ink">Tu teléfono móvil</label>
              <input
                id={`sc-telefono-${slug}`} type="tel" inputMode="tel" autoComplete="tel" autoFocus
                value={telefono} onChange={(e) => setTelefono(e.target.value)}
                placeholder="600 000 000…"
                className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px] text-ink placeholder:text-slate2/60"
              />
              <label htmlFor={`sc-acepta-${slug}`} className="mt-3 flex cursor-pointer items-start gap-3">
                <input id={`sc-acepta-${slug}`} type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy" />
                <span className="text-[12px] leading-relaxed text-slate2">
                  Autorizo a {BRAND_NAME} a llamarme y acepto la{" "}
                  <a href="/legal" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">política de privacidad</a>.
                </span>
              </label>
              {error && <p role="alert" className="mt-2 text-[13px] font-medium text-brand-red">{error}</p>}
              <button
                type="submit" disabled={submitting} aria-busy={submitting || undefined}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
              >
                {submitting && <Spinner />}
                {submitting ? "Enviando…" : "Recibir mi comparativa"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
