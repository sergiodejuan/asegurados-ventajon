"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DIAS_LLAMADA, TURNOS_LLAMADA } from "@/lib/brand";
import { getAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { saveCallResult } from "@/lib/quote";
import { saveClientProfile } from "@/lib/clientArea";
import { Spinner, ChevronDown } from "@/components/icons";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { PaidLlamadaLegalNotice } from "./PaidLlamadaLegalNotice";

// Formulario minimalista de "que me llamen" solo para /lp/salud/llamada.
// Sigue la referencia de Línea Directa: teléfono + día + hora + botón, con
// aviso legal debajo. Envío al mismo endpoint que el resto, marcado como
// origen "lp-salud" — el CRM lo trata con la etiqueta propia
// "Quiero que me llamen (landing paid)".
//
// Si se pasa onSuccess, el llamador decide qué hacer con el resultado (p.ej.
// mostrar un "gracias" propio dentro de la misma landing, con la preferencia
// de día/hora incluida). Sin onSuccess, mantiene el comportamiento por
// defecto de siempre: navegar a /gracias.

export type PaidLlamadaSuccess = { telefono: string; dia: string; turno: string };
type Props = { onSuccess?: (result: PaidLlamadaSuccess) => void };

export function PaidLlamadaForm({ onSuccess }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dia, setDia] = useState<string>(DIAS_LLAMADA[0]);
  const [turno, setTurno] = useState<string>(TURNOS_LLAMADA[0]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [aceptaComercial, setAceptaComercial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<string>("");

  useEffect(() => { setNow(new Date().toISOString()); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/call-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          telefono,
          codigoPostal: "",
          producto: "salud",
          diaLlamada: dia,
          turnoLlamada: turno,
          aceptaPrivacidad: true,
          autorizaContacto: true,
          aceptaComercial,
          company: "",
          consent: { privacidadAt: now, contactoAt: now },
          utm: getAttribution(),
          turnstileToken,
          origen: "lp-salud",
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; errors?: Record<string, string[]>; error?: string } | null;
      if (res.ok && body?.ok) {
        saveCallResult({ nombre, diaLlamada: dia, turnoLlamada: turno, producto: "salud" });
        saveClientProfile({ nombre, telefono, diaLlamada: dia, turnoLlamada: turno });
        pushDataLayerEvent("generate_lead", { producto: "salud", form: "lp-salud-llamada" });
        if (onSuccess) onSuccess({ telefono, dia, turno });
        else router.push("/gracias");
        return;
      }
      const first = body?.errors ? Object.values(body.errors).find((v) => v && v[0]) : undefined;
      setError(first?.[0] ?? body?.error ?? "No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-semibold text-ink">Tu nombre</span>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          placeholder="Ej: María"
          autoComplete="given-name"
          className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-slate2/60 focus:border-navy focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-semibold text-ink">Introduce tu número de teléfono</span>
        <input
          type="tel"
          inputMode="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          required
          placeholder="Ej: 642642632"
          autoComplete="tel"
          className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] tnums text-ink placeholder:text-slate2/60 focus:border-navy focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-semibold text-ink">Fecha</span>
        <div className="relative">
          <select
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="w-full appearance-none rounded-[12px] border border-hair bg-white px-4 py-3.5 pr-10 text-[16px] text-ink focus:border-navy focus:outline-none"
          >
            {DIAS_LLAMADA.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate2">
            <ChevronDown width={16} height={16} />
          </span>
        </div>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-semibold text-ink">Hora</span>
        <div className="relative">
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="w-full appearance-none rounded-[12px] border border-hair bg-white px-4 py-3.5 pr-10 text-[16px] text-ink focus:border-navy focus:outline-none"
          >
            {TURNOS_LLAMADA.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate2">
            <ChevronDown width={16} height={16} />
          </span>
        </div>
      </label>

      <PaidLlamadaLegalNotice
        idPrefix="llamada-form"
        aceptaComercial={aceptaComercial}
        onChangeAceptaComercial={setAceptaComercial}
      />

      <TurnstileWidget onToken={setTurnstileToken} />

      {error && (
        <p role="alert" className="rounded-[10px] bg-brand-red/10 px-3 py-2 text-[13px] font-medium text-brand-red-deep">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || !nombre.trim() || !telefono.trim()}
        aria-busy={submitting || undefined}
        className="mt-1 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-brand-red px-6 text-[16px] font-bold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
      >
        {submitting && <Spinner width={18} height={18} />}
        {submitting ? "Enviando…" : "Quiero que me llamen"}
      </button>
    </form>
  );
}
