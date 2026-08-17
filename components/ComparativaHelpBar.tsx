"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Spinner } from "./icons";
import { CallSlotPicker, type CallSlot } from "./CallSlotPicker";
import { TurnstileWidget } from "./TurnstileWidget";
import { EssentialConsentCheckbox } from "./EssentialConsent";
import { getAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { saveCallResult, type QuoteProfile } from "@/lib/quote";
import { saveClientProfile } from "@/lib/clientArea";

// Umbral de scroll a partir del cual aparece la barra sticky de ayuda.
const SHOW_AT = 0.4;

// Turnstile se activa por env; si está configurado NO enviamos en línea desde
// la barra (no queremos meter el widget en la barra roja): mandamos al modal,
// que sí lo monta.
const turnstileConfiguredClient = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function hasContactAndConsent(q: QuoteProfile | null): q is QuoteProfile & { telefono: string } {
  return !!(q?.telefono && q?.consentAt?.privacidadAt && q?.consentAt?.contactoAt);
}

function phoneLooksValid(v: string) {
  return v.replace(/\D/g, "").length >= 9;
}

// Barra sticky de ayuda de la comparativa: aparece al 40% de scroll (desktop y
// móvil). Ofrece dos vías de conversión de baja fricción sin volver a pedir
// los datos que el usuario ya dio en el tarificador:
//   1) Campo rápido "Llamadme gratis" (teléfono en blanco sobre el rojo).
//   2) Botón "Solicitar llamada" → modal para elegir día/turno, con modal de
//      gracias al confirmar.
export function ComparativaHelpBar({ quote, producto }: { quote: QuoteProfile | null; producto: string }) {
  const [visible, setVisible] = useState(false);

  // Campo rápido de teléfono (barra).
  const [quickPhone, setQuickPhone] = useState(quote?.telefono ?? "");
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  // Modal "solicitar llamada".
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState<"form" | "gracias">("form");
  const [modalPhone, setModalPhone] = useState(quote?.telefono ?? "");
  const [slot, setSlot] = useState<CallSlot | null>(null);
  const [esencial, setEsencial] = useState(false);
  const [consentTimes, setConsentTimes] = useState<{ privacidadAt?: string; contactoAt?: string }>({});
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasConsent = hasContactAndConsent(quote);

  // El quote se carga de forma asíncrona en la comparativa: cuando llega el
  // teléfono, precargamos los campos si el usuario aún no los ha tocado.
  useEffect(() => {
    if (quote?.telefono) {
      setQuickPhone((p) => p || quote.telefono!);
      setModalPhone((p) => p || quote.telefono!);
    }
  }, [quote?.telefono]);

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const scrolled = doc.scrollTop || document.body.scrollTop || 0;
      const height = doc.scrollHeight - doc.clientHeight;
      const pct = height > 0 ? scrolled / height : 0;
      setVisible(pct >= SHOW_AT);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  async function submitCall(telefono: string, chosen: CallSlot | null, opts?: { fromModal?: boolean }) {
    const cp = /^\d{5}$/.test(quote?.codigoPostal ?? "") ? quote!.codigoPostal! : "";
    const consent = hasConsent ? quote?.consentAt : { ...consentTimes, comercialAt: quote?.consentAt?.comercialAt };
    const payload = {
      nombre: quote?.nombre ?? "",
      telefono,
      codigoPostal: cp,
      producto: quote?.producto ?? producto,
      turnoLlamada: chosen?.turno,
      fechaProgramada: chosen?.fecha ?? "",
      aceptaPrivacidad: true,
      autorizaContacto: true,
      aceptaComercial: !!quote?.consentAt?.comercialAt,
      company: "",
      consent,
      origen: "web" as const,
      utm: getAttribution(),
      turnstileToken: opts?.fromModal ? turnstileToken : "",
    };
    const res = await fetch("/api/call-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
    }
    saveClientProfile({ nombre: quote?.nombre, telefono, turnoLlamada: chosen?.turno });
    saveCallResult({ nombre: quote?.nombre, turnoLlamada: chosen?.turno, producto: quote?.producto ?? producto });
    pushDataLayerEvent("generate_lead", { producto: quote?.producto ?? producto, form: "comparativa_help_bar" });
  }

  function openModal(prefill?: string) {
    setModalPhone((p) => prefill || p || quote?.telefono || "");
    setModalView("form");
    setError(null);
    setModalOpen(true);
  }

  async function onQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuickError(null);
    if (!phoneLooksValid(quickPhone)) {
      setQuickError("Escribe un teléfono válido.");
      return;
    }
    // Sin consentimiento previo (caso raro tras el gate) o con Turnstile
    // activo: completamos en el modal, que recoge lo que falte.
    if (!hasConsent || turnstileConfiguredClient) {
      openModal(quickPhone);
      return;
    }
    setQuickSubmitting(true);
    try {
      await submitCall(quickPhone, null);
      setModalView("gracias");
      setModalOpen(true);
    } catch (err) {
      setQuickError((err as Error).message);
    } finally {
      setQuickSubmitting(false);
    }
  }

  async function onModalConfirm() {
    setError(null);
    if (!phoneLooksValid(modalPhone)) {
      setError("Escribe un teléfono válido.");
      return;
    }
    if (!hasConsent && !esencial) {
      setError("Necesitamos tu autorización para poder llamarte.");
      return;
    }
    setSubmitting(true);
    try {
      await submitCall(modalPhone, slot, { fromModal: true });
      setModalView("gracias");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const cuandoTxt = slot ? `${slot.turno.toLowerCase()}` : "cuando mejor te venga";

  return (
    <>
      {/* Espaciador en flujo normal: al ser la barra fixed, evita que tape el
          contenido final de la página cuando está visible. */}
      {visible && <div aria-hidden className="h-32 sm:h-20" />}

      <div
        className={`fixed inset-x-0 bottom-0 z-40 bg-brand-red text-white shadow-[0_-6px_24px_rgba(0,0,0,0.18)] transition-transform duration-300 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        aria-hidden={!visible}
      >
        <div className="mx-auto max-w-app px-4 py-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 shrink-0">
              <p className="text-[16px] font-extrabold leading-tight">¿Necesitas ayuda?</p>
              <p className="hidden text-[13px] text-white/85 sm:block">Un asesor te llama gratis, cuando mejor te venga.</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Campo rápido "Llamadme gratis" — blanco para contrastar con el rojo. */}
              <form onSubmit={onQuickSubmit} className="flex flex-col gap-1">
                <div className="flex items-stretch gap-1.5 rounded-pill bg-white p-1 shadow-sm">
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    name="tel"
                    tabIndex={visible ? 0 : -1}
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="Tu teléfono"
                    aria-label="Tu teléfono"
                    className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-ink placeholder:text-slate2/60 focus:outline-none sm:w-40"
                  />
                  <button
                    type="submit"
                    disabled={quickSubmitting}
                    tabIndex={visible ? 0 : -1}
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-pill bg-emerald-600 px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:bg-emerald-600/60"
                  >
                    {quickSubmitting && <Spinner />}
                    {quickSubmitting ? "Enviando…" : "Llamadme gratis"}
                  </button>
                </div>
                {quickError && (
                  <p role="alert" className="px-3 text-[12px] font-medium text-white">{quickError}</p>
                )}
              </form>

              {/* Solicitar llamada programada (día/turno) → modal. */}
              <button
                type="button"
                onClick={() => openModal()}
                tabIndex={visible ? 0 : -1}
                className="rounded-pill border-2 border-white bg-transparent px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                Solicitar llamada
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={modalView === "gracias" ? "¡Gracias!" : "Solicitar llamada"}
        >
          {modalView === "form" ? (
            <div>
              <p className="text-[14px] leading-relaxed text-slate2">
                {hasConsent
                  ? <>Te llamamos gratis al <span className="font-semibold tnums text-ink">{quote?.telefono}</span>. Elige cuándo prefieres — nos ajustamos a ti.</>
                  : "Déjanos tu teléfono y elige cuándo prefieres que te llamemos. Sin coste."}
              </p>

              {!hasContactAndConsent(quote) && (
                <div className="mt-4">
                  <label htmlFor="hb-tel" className="mb-1.5 block text-[13px] font-semibold text-ink">Teléfono móvil</label>
                  <input
                    id="hb-tel"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    placeholder="600 000 000…"
                    className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px] text-ink placeholder:text-slate2/60"
                  />
                </div>
              )}

              <div className="mt-4">
                <p className="mb-2 text-[13px] font-semibold text-ink">¿Cuándo prefieres que te llamemos?</p>
                <CallSlotPicker value={slot} onChange={setSlot} />
              </div>

              {!hasConsent && (
                <div className="mt-4">
                  <EssentialConsentCheckbox
                    idPrefix="hb"
                    checked={esencial}
                    onChange={(v) => {
                      setEsencial(v);
                      const at = v ? new Date().toISOString() : undefined;
                      setConsentTimes({ privacidadAt: at, contactoAt: at });
                    }}
                    error={undefined}
                  />
                </div>
              )}

              <TurnstileWidget onToken={setTurnstileToken} />

              {error && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{error}</p>}

              <button
                type="button"
                onClick={onModalConfirm}
                disabled={submitting}
                aria-busy={submitting || undefined}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
              >
                {submitting && <Spinner />}
                {submitting ? "Enviando…" : "Confirmar llamada"}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-[28px]">✓</div>
              <h3 className="mt-3 text-[18px] font-extrabold text-navy">Llamada solicitada</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                Un asesor te llamará {cuandoTxt} para ayudarte a elegir, sin compromiso. Gracias por confiar en nosotros.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="mt-5 w-full rounded-card bg-navy px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep"
              >
                Entendido
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
