"use client";

import { useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { getAttribution } from "@/lib/attribution";
import { Check, Spinner } from "./icons";

type Guia = "salud" | "auto";

const GUIAS: { value: Guia; titulo: string; desc: string }[] = [
  { value: "salud", titulo: "Guía para elegir seguro de salud 2026", desc: "Con copago o sin copago, qué mirar antes de firmar y particularidades en Canarias y Baleares." },
  { value: "auto", titulo: "Checklist antes de renovar tu seguro de auto", desc: "10 puntos que revisar antes de firmar la renovación por otro año." },
];

export function LeadMagnetForm() {
  const [guia, setGuia] = useState<Guia>("salud");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [aceptaComercial, setAceptaComercial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Revisa tu correo electrónico."); return; }
    if (!aceptaPrivacidad) { setError("Necesitamos que aceptes la política de privacidad."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/lead-magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre, email, guia, aceptaPrivacidad, aceptaComercial,
          consent: { privacidadAt: new Date().toISOString(), comercialAt: aceptaComercial ? new Date().toISOString() : undefined },
          company: "", utm: getAttribution(),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError("No hemos podido procesar tu solicitud. Inténtalo de nuevo."); setSubmitting(false); return; }
      setDownloadUrl(body.downloadUrl);
      const a = document.createElement("a");
      a.href = body.downloadUrl;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (downloadUrl) {
    return (
      <div className="rounded-[24px] border border-hair bg-white p-6 text-center shadow-card sm:p-8">
        <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-navy/10 text-navy">
          <Check width={26} height={26} />
        </span>
        <h2 className="mt-4 text-[19px] font-extrabold text-navy">¡Ya la tienes!</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-slate2">
          La descarga debería haber empezado sola. Si no, usa el botón de aquí abajo.
        </p>
        <a
          href={downloadUrl} download
          className="mt-5 flex w-full items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
        >
          Descargar de nuevo
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[24px] border border-hair bg-white p-6 shadow-card sm:p-8">
      <h2 className="text-[19px] font-extrabold leading-tight text-navy">Descarga tu guía gratis</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-slate2">Elige la que necesites, déjanos tu email y la tienes al momento.</p>

      <div role="radiogroup" aria-label="Elige tu guía" className="mt-5 flex flex-col gap-2.5">
        {GUIAS.map((g) => (
          <button
            key={g.value} type="button" role="radio" aria-checked={guia === g.value} onClick={() => setGuia(g.value)}
            className={`rounded-card border px-4 py-3.5 text-left transition-colors ${guia === g.value ? "border-navy bg-navy/[0.04]" : "border-hair bg-white hover:border-navy/40 hover:bg-mist"}`}
          >
            <p className={`text-[14px] font-bold ${guia === g.value ? "text-navy" : "text-ink"}`}>{g.titulo}</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate2">{g.desc}</p>
          </button>
        ))}
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lm-company">No rellenar</label>
        <input id="lm-company" tabIndex={-1} autoComplete="off" onChange={() => {}} />
      </div>

      <div className="mt-5">
        <label htmlFor="lm-nombre" className="mb-1.5 block text-[14px] font-semibold text-ink">
          Nombre <span className="font-normal text-slate2">(opcional)</span>
        </label>
        <input
          id="lm-nombre" name="name" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)}
          placeholder="María…" className="w-full rounded-card border border-hair bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-slate2/60"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="lm-email" className="mb-1.5 block text-[14px] font-semibold text-ink">Correo electrónico</label>
        <input
          id="lm-email" name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} autoCapitalize="none"
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@correo.com…"
          className="w-full rounded-card border border-hair bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-slate2/60"
        />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <label htmlFor="lm-privacidad" className="flex cursor-pointer items-start gap-3">
          <input id="lm-privacidad" type="checkbox" checked={aceptaPrivacidad} onChange={(e) => setAceptaPrivacidad(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy" />
          <span className="text-[13px] leading-relaxed text-slate2">
            He leído y acepto la <a href="/legal" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">política de privacidad</a>.
          </span>
        </label>
        <label htmlFor="lm-comercial" className="flex cursor-pointer items-start gap-3">
          <input id="lm-comercial" type="checkbox" checked={aceptaComercial} onChange={(e) => setAceptaComercial(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy" />
          <span className="text-[13px] leading-relaxed text-slate2">
            Quiero recibir consejos y novedades de {BRAND_NAME} por email (opcional).
          </span>
        </label>
      </div>

      {error && <p role="alert" aria-live="polite" className="mt-4 rounded-lg bg-brand-red/10 px-4 py-3 text-[14px] font-medium text-brand-red-deep">{error}</p>}

      <button
        type="submit" disabled={submitting} aria-busy={submitting || undefined}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
      >
        {submitting && <Spinner />}
        {submitting ? "Enviando…" : "Descargar gratis"}
      </button>
      <p className="mt-3 text-center text-[12px] leading-relaxed text-slate2">Sin spam. Puedes darte de baja de la newsletter cuando quieras.</p>
    </form>
  );
}
