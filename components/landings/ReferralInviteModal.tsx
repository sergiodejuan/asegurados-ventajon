"use client";

import { useEffect, useMemo, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { Phone, Spinner, ChevronLeft } from "@/components/icons";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import type { ReferralLandingConfig } from "@/lib/referralLanding";

// Modal "Invita a un amigo" — fullscreen wizard con 2 estados:
//   1. Sin código todavía: el usuario introduce email + teléfono para que
//      hagamos lookup + verificación de elegibilidad (POST /api/referral/generate).
//   2. Con código: muestra link + código + botones nativos de compartir
//      (WhatsApp, email, copy) con el mensaje pre-rellenado editable.
//
// El código puede venir precargado desde fuera (área cliente sabe el
// referidor y ya ha hecho el fetch server-side); en ese caso, saltamos
// directamente al paso 2.

type PrefilledCode = {
  code: string;
  referidorNombre: string;
  convertidos?: number;
  pagados?: number;
};

export function ReferralInviteModal({
  open, onClose, config, siteUrl, initial,
}: {
  open: boolean;
  onClose: () => void;
  config: ReferralLandingConfig;
  siteUrl: string;
  initial?: PrefilledCode;
}) {
  const [state, setState] = useState<PrefilledCode | null>(initial ?? null);
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [customMsg, setCustomMsg] = useState("");

  // Reset state cada vez que se abre — evita mostrar datos de una sesión
  // anterior si el usuario cierra y vuelve a abrir.
  useEffect(() => {
    if (open) {
      setState(initial ?? null);
      setError(null);
      setSubmitting(false);
      setCopied(false);
    }
  }, [open, initial]);

  const link = useMemo(() => {
    if (!state?.code) return "";
    // El referido llega con ?ref=CODE — el helper lib/attribution.ts lo
    // captura y lo mete en utm.ref, y de ahí llega al POST /api/lead.
    const base = siteUrl.replace(/\/+$/, "");
    return `${base}/r/${encodeURIComponent(state.code)}`;
  }, [state?.code, siteUrl]);

  const mensajeFinal = useMemo(() => {
    if (customMsg) return customMsg;
    const template = config.mensajeCompartir.whatsapp;
    return template
      .replace("{link}", link)
      .replace("{monto}", String(config.incentivo.montoReferido))
      .replace("{nombre}", state?.referidorNombre ?? "");
  }, [customMsg, config.mensajeCompartir.whatsapp, link, config.incentivo.montoReferido, state?.referidorNombre]);

  const emailAsuntoFinal = useMemo(() => {
    return config.mensajeCompartir.email.asunto
      .replace("{monto}", String(config.incentivo.montoReferido));
  }, [config.mensajeCompartir.email.asunto, config.incentivo.montoReferido]);

  const emailCuerpoFinal = useMemo(() => {
    return config.mensajeCompartir.email.cuerpo
      .replace("{link}", link)
      .replace("{monto}", String(config.incentivo.montoReferido))
      .replace("{nombre}", state?.referidorNombre ?? "");
  }, [config.mensajeCompartir.email.cuerpo, link, config.incentivo.montoReferido, state?.referidorNombre]);

  async function submitLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() && !telefono.trim()) {
      setError("Introduce el email o teléfono con el que eres cliente."); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/referral/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          telefono: telefono.trim() || undefined,
          turnstileToken,
        }),
      });
      const body = await res.json().catch(() => null) as { ok?: boolean; code?: string; referidorNombre?: string; convertidos?: number; pagados?: number; error?: string; reason?: string } | null;
      if (!res.ok || !body?.ok || !body.code) {
        setError(body?.error ?? "No hemos podido generar tu código. Inténtalo de nuevo.");
        return;
      }
      setState({
        code: body.code,
        referidorNombre: body.referidorNombre ?? "",
        convertidos: body.convertidos,
        pagados: body.pagados,
      });
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard no disponible */ }
  }

  const waUrl = mensajeFinal ? `https://wa.me/?text=${encodeURIComponent(mensajeFinal)}` : "";
  const mailUrl = state?.code
    ? `mailto:?subject=${encodeURIComponent(emailAsuntoFinal)}&body=${encodeURIComponent(emailCuerpoFinal)}`
    : "";

  if (!open) return null;

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="referral-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/80 p-0 md:p-6"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="flex h-full w-full flex-col overflow-y-auto bg-white shadow-card md:h-auto md:max-h-[92vh] md:max-w-lg md:rounded-[24px]">
        <div className="flex items-start justify-between gap-3 border-b border-hair px-6 pb-4 pt-6 md:pt-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-red">Amigos Ventajon</p>
            <h2 id="referral-modal-title" className="mt-1 text-[20px] font-extrabold leading-snug text-navy md:text-[22px]">
              {state ? "Tu enlace personal está listo" : "Confirma que eres cliente"}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-slate2 transition-colors hover:bg-mist">
            ✕
          </button>
        </div>

        <div className="flex-1 px-6 py-5">
          {!state ? (
            <form onSubmit={submitLookup} noValidate className="flex flex-col gap-3">
              <p className="text-[14px] leading-relaxed text-slate2">
                El programa está reservado a clientes con al menos una póliza contratada. Introduce el email o el teléfono con el que tienes tu póliza y generamos tu enlace personal.
              </p>
              <input
                type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico" autoComplete="email" autoFocus
                className="w-full rounded-[12px] border border-hair bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60 focus:border-navy focus:outline-none"
              />
              <p className="text-center text-[12px] font-semibold text-slate2">o</p>
              <input
                type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                placeholder="Teléfono móvil" autoComplete="tel"
                className="w-full rounded-[12px] border border-hair bg-white px-4 py-3 text-[15px] tnums text-ink placeholder:text-slate2/60 focus:border-navy focus:outline-none"
              />

              <TurnstileWidget onToken={setTurnstileToken} />

              {error && <p role="alert" className="rounded-[10px] bg-brand-red/10 px-4 py-2.5 text-[13px] font-medium text-brand-red-deep">{error}</p>}

              <button
                type="submit" disabled={submitting} aria-busy={submitting || undefined}
                className="mt-2 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-brand-red px-5 text-[16px] font-bold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
              >
                {submitting && <Spinner width={16} height={16} />}
                {submitting ? "Verificando…" : "Generar mi enlace"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-[14px] leading-relaxed text-slate2">
                {state.referidorNombre ? <>Hola <strong>{state.referidorNombre}</strong>. </> : ""}
                Comparte tu enlace con quien quieras: por cada amigo que contrate, os lleváis <strong className="text-brand-red">{config.incentivo.montoReferidor}€ Amazon cada uno</strong>.
              </p>

              <div className="rounded-[12px] border-2 border-dashed border-brand-red bg-brand-red/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-red">Tu enlace personal</p>
                <p className="mt-1 break-all font-mono text-[13px] font-semibold text-navy">{link}</p>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-brand-red">O tu código corto (para voz/WhatsApp)</p>
                <p className="mt-1 font-mono text-[16px] font-extrabold tracking-[.2em] text-navy">{state.code}</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold text-navy" htmlFor="ref-msg">Mensaje (edítalo si quieres):</label>
                <textarea
                  id="ref-msg" value={mensajeFinal}
                  onChange={(e) => setCustomMsg(e.target.value)} rows={3}
                  className="w-full resize-none rounded-[12px] border border-hair bg-white px-3 py-2 text-[13px] text-ink focus:border-navy focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <a
                  href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] bg-emerald-600 px-4 text-[14px] font-bold text-white hover:bg-emerald-700"
                >
                  WhatsApp
                </a>
                <a
                  href={mailUrl}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] bg-navy px-4 text-[14px] font-bold text-white hover:bg-navy-deep"
                >
                  Email
                </a>
                <button
                  type="button" onClick={copyLink}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] border border-navy bg-white px-4 text-[14px] font-bold text-navy hover:bg-mist"
                >
                  {copied ? "¡Copiado!" : "Copiar enlace"}
                </button>
              </div>

              {(state.convertidos != null || state.pagados != null) && (
                <div className="mt-2 grid grid-cols-2 gap-3 rounded-[12px] bg-mist p-4 text-center">
                  <div>
                    <p className="text-[24px] font-extrabold tnums text-navy">{state.convertidos ?? 0}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate2">Amigos que ya cotizaron</p>
                  </div>
                  <div>
                    <p className="text-[24px] font-extrabold tnums text-emerald-600">{state.pagados ?? 0}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate2">Bonos cobrados</p>
                  </div>
                </div>
              )}

              <button
                type="button" onClick={() => { setState(null); setEmail(""); setTelefono(""); }}
                className="mt-1 inline-flex items-center justify-center gap-1 text-center text-[12px] font-semibold text-slate2 underline"
              >
                <ChevronLeft width={12} height={12} /> Usar otra cuenta
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-hair bg-mist/50 px-6 py-4 text-[11px] leading-relaxed text-slate2">
          Al compartir tu enlace confirmas que solo lo envías a personas mayores de edad que quieren recibir la recomendación (art. 21 LSSI). Consulta las <a href="/legal#referidos" className="font-semibold text-navy underline">condiciones del programa</a>.
        </div>
      </div>
    </div>
  );
}
