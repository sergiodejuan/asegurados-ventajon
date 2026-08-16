"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { callRequestSchema } from "@/lib/schema";
import { DIAS_LLAMADA, TURNOS_LLAMADA } from "@/lib/brand";
import { PRODUCT_PAGES } from "@/lib/productPages";
import { loadQuote, saveCallResult, type QuoteProfile } from "@/lib/quote";
import { loadClientProfile, saveClientProfile } from "@/lib/clientArea";
import { getAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { Spinner } from "./icons";
import { EssentialConsentCheckbox, ComercialConsentCheckbox } from "./EssentialConsent";
import { CallSlotPicker, type CallSlot } from "./CallSlotPicker";
import { TurnstileWidget } from "./TurnstileWidget";

type FieldErrors = Partial<Record<string, string>>;

function hasContactAndConsent(q: QuoteProfile | null): q is QuoteProfile & { telefono: string } {
  return !!(q?.telefono && q?.consentAt?.privacidadAt && q?.consentAt?.contactoAt);
}

export function CallRequestForm({
  showHeading = true, compania: companiaProp, precioElegido: precioProp,
}: { showHeading?: boolean; compania?: string; precioElegido?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quote, setQuote] = useState<QuoteProfile | null>(null);
  const [quoteChecked, setQuoteChecked] = useState(false);
  const [useOther, setUseOther] = useState(false);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [codigoPostal, setCp] = useState("");
  const [diaLlamada, setDiaLlamada] = useState<string>(DIAS_LLAMADA[0]);
  const [turnoLlamada, setTurnoLlamada] = useState<string>(TURNOS_LLAMADA[0]);
  const [slot, setSlot] = useState<CallSlot | null>(null);
  const [genericProducto, setGenericProducto] = useState<string>("salud");
  const [clientFirstName, setClientFirstName] = useState<string | undefined>(undefined);
  // Un único check cubre privacidad + autorización de contacto — ver
  // components/EssentialConsent.tsx.
  const [esencial, setEsencial] = useState(false);
  const [comercial, setComercial] = useState(false);
  const [consentTimes, setConsentTimes] = useState<{ privacidadAt?: string; contactoAt?: string; comercialAt?: string }>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  const hasProductoParam = searchParams.has("producto");

  useEffect(() => {
    const q = loadQuote();
    setQuote(q);
    setQuoteChecked(true);
    if (!hasProductoParam) {
      const profile = loadClientProfile();
      if (profile?.nombre) setClientFirstName(profile.nombre.trim().split(/\s+/)[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const producto = hasProductoParam ? (searchParams.get("producto") ?? "salud") : (quote?.producto ?? genericProducto);
  const compania = companiaProp ?? searchParams.get("compania") ?? undefined;
  const precioElegidoParam = searchParams.get("precio");
  const precioElegido = precioProp ?? (precioElegidoParam ? Number(precioElegidoParam) : undefined);
  const headingText = clientFirstName ? `${clientFirstName}, te llamamos gratis` : "Te llamamos gratis";

  async function confirmQuick() {
    if (!quote) return;
    setQuickError(null);
    setQuickSubmitting(true);
    try {
      const res = await fetch("/api/call-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: quote.nombre ?? "",
          telefono: quote.telefono,
          codigoPostal: quote.codigoPostal ?? "",
          producto,
          compania,
          precioElegido,
          diaLlamada, turnoLlamada: slot?.turno ?? turnoLlamada, fechaProgramada: slot?.fecha ?? "",
          aceptaPrivacidad: true,
          autorizaContacto: true,
          aceptaComercial: !!quote.consentAt?.comercialAt,
          company: "",
          consent: quote.consentAt,
          utm: getAttribution(), turnstileToken,
        }),
      });
      if (res.ok) {
        saveCallResult({ nombre: quote.nombre, diaLlamada, turnoLlamada, producto });
        saveClientProfile({ nombre: quote.nombre, telefono: quote.telefono, diaLlamada, turnoLlamada });
        pushDataLayerEvent("generate_lead", { producto, form: "quiero_que_me_llamen" });
        router.push("/gracias");
        return;
      }
      setQuickError("No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
    } catch {
      setQuickError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setQuickSubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const payload = {
      nombre,
      telefono,
      codigoPostal,
      producto,
      compania,
      precioElegido,
      diaLlamada, turnoLlamada: slot?.turno ?? turnoLlamada, fechaProgramada: slot?.fecha ?? "",
      aceptaPrivacidad: esencial,
      autorizaContacto: esencial,
      aceptaComercial: comercial,
      company: "",
      consent: consentTimes,
      utm: getAttribution(), turnstileToken,
    };
    const parsed = callRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const mapped: FieldErrors = {};
      for (const [k, v] of Object.entries(fe)) if (v && v[0]) mapped[k] = v[0];
      setErrors(mapped);
      if (mapped.telefono) document.getElementById("c-telefono")?.focus();
      else if (mapped.codigoPostal) document.getElementById("c-codigoPostal")?.focus();
      else if (mapped.aceptaPrivacidad || mapped.autorizaContacto) document.getElementById("c-consiente-esencial")?.focus();
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
        saveCallResult({ nombre, diaLlamada, turnoLlamada, producto });
        saveClientProfile({ nombre, telefono, diaLlamada, turnoLlamada });
        pushDataLayerEvent("generate_lead", { producto, form: "quiero_que_me_llamen" });
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

  // Ya tenemos teléfono + consentimiento del tarificador: no hace falta volver a pedirlos.
  if (quoteChecked && hasContactAndConsent(quote) && !useOther) {
    return (
      <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
        {showHeading && <h1 className="text-[26px] font-extrabold leading-tight text-navy">{headingText}</h1>}
        <p className="mt-2 text-[15px] leading-relaxed text-slate2">
          Vamos a llamarte al <span className="font-semibold tnums text-ink">{quote.telefono}</span>
          {compania ? ` para hablar de tu opción con ${compania}` : ""}. Ya tenemos tu autorización de contacto, no hace falta que la repitas.
        </p>
        <div className="mt-4">
          <div>
            <p className="text-[13px] font-semibold text-ink">¿Cuándo prefieres que te llamemos?</p>
            <div className="mt-2"><CallSlotPicker value={slot} onChange={setSlot} /></div>
          </div>
        </div>

        <TurnstileWidget onToken={setTurnstileToken} />
        {quickError && (
          <p role="alert" aria-live="polite" className="mt-4 rounded-lg bg-brand-red/10 px-4 py-3 text-[14px] font-medium text-brand-red-deep">
            {quickError}
          </p>
        )}
        <button
          type="button"
          onClick={confirmQuick}
          disabled={quickSubmitting}
          aria-busy={quickSubmitting || undefined}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
        >
          {quickSubmitting && <Spinner />}
          {quickSubmitting ? "Enviando…" : "Sí, quiero que me llamen"}
        </button>
        <button
          type="button"
          onClick={() => setUseOther(true)}
          className="mt-3 block w-full text-center text-[13px] font-medium text-slate2 underline"
        >
          Usar otro número de contacto
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
      {showHeading && (
        <>
          <h1 className="text-[26px] font-extrabold leading-tight text-navy">{headingText}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate2">
            {compania
              ? `Déjanos tu teléfono y un asesor te llama para hablar de tu opción con ${compania}. Sin coste.`
              : hasProductoParam
                ? "Déjanos tu teléfono y un asesor te llama para comparar tu seguro. Sin coste."
                : "Déjanos tu teléfono y un asesor te llama para ayudarte a elegir el seguro que necesites. Sin coste."}
          </p>
        </>
      )}

      {!hasProductoParam && (
        <div className="mt-4">
          <p className="mb-2 text-[13px] font-semibold text-ink">¿Con qué seguro necesitas ayuda?</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de seguro">
            {PRODUCT_PAGES.map((p) => (
              <button
                key={p.slug} type="button" aria-pressed={genericProducto === p.slug}
                onClick={() => setGenericProducto(p.slug)}
                className={`rounded-pill border px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors ${genericProducto === p.slug ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}
              >
                {p.badge.replace("Seguro de ", "")}
              </button>
            ))}
          </div>
        </div>
      )}

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

      <div className="mt-5">
        <p className="mb-2 text-[13px] font-semibold text-ink">¿Cuándo prefieres que te llamemos?</p>
        <CallSlotPicker value={slot} onChange={setSlot} />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <EssentialConsentCheckbox
          idPrefix="c" checked={esencial}
          onChange={(v) => {
            setEsencial(v);
            const at = v ? new Date().toISOString() : undefined;
            setConsentTimes((c) => ({ ...c, privacidadAt: at, contactoAt: at }));
          }}
          error={errors.aceptaPrivacidad ?? errors.autorizaContacto}
        />
        <ComercialConsentCheckbox
          idPrefix="c" checked={comercial}
          onChange={(v) => { setComercial(v); setConsentTimes((c) => ({ ...c, comercialAt: v ? new Date().toISOString() : undefined })); }}
        />
      </div>

      <TurnstileWidget onToken={setTurnstileToken} />
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
