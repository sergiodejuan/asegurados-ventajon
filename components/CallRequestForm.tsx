"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { callRequestSchema } from "@/lib/schema";
import { BRAND_NAME } from "@/lib/brand";
import { Spinner } from "./icons";

type FieldErrors = Partial<Record<string, string>>;

export function CallRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [codigoPostal, setCp] = useState("");
  const [priv, setPriv] = useState(false);
  const [contacto, setContacto] = useState(false);
  const [comercial, setComercial] = useState(false);
  const [consentTimes, setConsentTimes] = useState<{ privacidadAt?: string; contactoAt?: string; comercialAt?: string }>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [referrer, setReferrer] = useState("");

  useEffect(() => {
    if (typeof document !== "undefined") setReferrer(document.referrer || "");
  }, []);

  const producto = searchParams.get("producto") ?? "salud";
  const utm = useMemo(
    () => ({
      source: searchParams.get("utm_source") ?? undefined,
      medium: searchParams.get("utm_medium") ?? undefined,
      campaign: searchParams.get("utm_campaign") ?? undefined,
      content: searchParams.get("utm_content") ?? undefined,
      term: searchParams.get("utm_term") ?? undefined,
    }),
    [searchParams]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const payload = {
      nombre,
      telefono,
      codigoPostal,
      producto,
      aceptaPrivacidad: priv,
      autorizaContacto: contacto,
      aceptaComercial: comercial,
      company: "",
      consent: consentTimes,
      utm: { ...utm, referrer },
    };
    const parsed = callRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const mapped: FieldErrors = {};
      for (const [k, v] of Object.entries(fe)) if (v && v[0]) mapped[k] = v[0];
      setErrors(mapped);
      const first = ["telefono", "codigoPostal", "aceptaPrivacidad", "autorizaContacto"].find((k) => mapped[k]);
      if (first) document.getElementById(`c-${first}`)?.focus();
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/call-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (res.ok) {
        router.push("/gracias");
        return;
      }
      const body = (await res.json().catch(() => null)) as { errors?: Record<string, string[]> } | null;
      if (body?.errors) {
        const mapped: FieldErrors = {};
        for (const [k, v] of Object.entries(body.errors)) if (v && v[0]) mapped[k] = v[0];
        setErrors(mapped);
      } else {
        setSubmitError("No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
      }
    } catch {
      setSubmitError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
      <h1 className="text-[26px] font-extrabold leading-tight text-navy">Te llamamos gratis</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-slate2">
        Déjanos tu teléfono y un asesor te llama para comparar tu seguro de salud. Sin coste.
      </p>

      {/* Honeypot */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-company">No rellenar</label>
        <input id="c-company" tabIndex={-1} autoComplete="off" onChange={() => {}} />
      </div>

      <div className="mt-5">
        <label htmlFor="c-nombre" className="mb-1.5 block text-[14px] font-semibold text-ink">
          Nombre <span className="font-normal text-slate2">(opcional)</span>
        </label>
        <input
          id="c-nombre"
          name="name"
          autoComplete="name"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="María…"
          className="w-full rounded-card border border-hair bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-slate2/60"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="c-telefono" className="mb-1.5 block text-[14px] font-semibold text-ink">
          Teléfono móvil
        </label>
        <input
          id="c-telefono"
          name="tel"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="600 000 000…"
          aria-invalid={!!errors.telefono}
          aria-describedby={errors.telefono ? "c-telefono-err" : undefined}
          className={`w-full rounded-card border bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-slate2/60 ${errors.telefono ? "border-brand-red" : "border-hair"}`}
        />
        {errors.telefono && <p id="c-telefono-err" role="alert" className="mt-1.5 text-[13px] font-medium text-brand-red">{errors.telefono}</p>}
      </div>

      <div className="mt-4">
        <label htmlFor="c-codigoPostal" className="mb-1.5 block text-[14px] font-semibold text-ink">
          Código postal
        </label>
        <input
          id="c-codigoPostal"
          name="postal-code"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          spellCheck={false}
          value={codigoPostal}
          onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="35001…"
          aria-invalid={!!errors.codigoPostal}
          aria-describedby={errors.codigoPostal ? "c-cp-err" : undefined}
          className={`w-full rounded-card border bg-white px-4 py-3.5 text-[16px] tnums text-ink placeholder:text-slate2/60 ${errors.codigoPostal ? "border-brand-red" : "border-hair"}`}
        />
        {errors.codigoPostal && <p id="c-cp-err" role="alert" className="mt-1.5 text-[13px] font-medium text-brand-red">{errors.codigoPostal}</p>}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <label htmlFor="c-aceptaPrivacidad" className="flex cursor-pointer items-start gap-3">
          <input id="c-aceptaPrivacidad" type="checkbox" checked={priv} onChange={(e) => { setPriv(e.target.checked); setConsentTimes((c) => ({ ...c, privacidadAt: e.target.checked ? new Date().toISOString() : undefined })); }}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy" aria-invalid={!!errors.aceptaPrivacidad} />
          <span className="text-[13px] leading-relaxed text-slate2">
            He leído y acepto la{" "}
            <a href="/legal" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">política de privacidad</a>.
          </span>
        </label>
        {errors.aceptaPrivacidad && <p role="alert" className="ml-8 text-[13px] font-medium text-brand-red">{errors.aceptaPrivacidad}</p>}

        <label htmlFor="c-autorizaContacto" className="flex cursor-pointer items-start gap-3">
          <input id="c-autorizaContacto" type="checkbox" checked={contacto} onChange={(e) => { setContacto(e.target.checked); setConsentTimes((c) => ({ ...c, contactoAt: e.target.checked ? new Date().toISOString() : undefined })); }}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy" aria-invalid={!!errors.autorizaContacto} />
          <span className="text-[13px] leading-relaxed text-slate2">
            Autorizo a {BRAND_NAME} a llamarme por teléfono o WhatsApp para ayudarme a elegir mi seguro.
          </span>
        </label>
        {errors.autorizaContacto && <p role="alert" className="ml-8 text-[13px] font-medium text-brand-red">{errors.autorizaContacto}</p>}

        <label htmlFor="c-aceptaComercial" className="flex cursor-pointer items-start gap-3">
          <input id="c-aceptaComercial" type="checkbox" checked={comercial} onChange={(e) => { setComercial(e.target.checked); setConsentTimes((c) => ({ ...c, comercialAt: e.target.checked ? new Date().toISOString() : undefined })); }}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy" />
          <span className="text-[13px] leading-relaxed text-slate2">
            Quiero recibir consejos y novedades de {BRAND_NAME} (opcional).
          </span>
        </label>
      </div>

      {submitError && (
        <p role="alert" aria-live="polite" className="mt-4 rounded-lg bg-brand-red/10 px-4 py-3 text-[14px] font-medium text-brand-red-deep">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting || undefined}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
      >
        {submitting && <Spinner />}
        {submitting ? "Enviando…" : "Que me llamen gratis"}
      </button>
    </form>
  );
}
