"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizePhone } from "@/lib/schema";
import { getAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { TurnstileWidget } from "./TurnstileWidget";
import { Spinner } from "./icons";
import { EssentialConsentCheckbox, ComercialConsentCheckbox } from "./EssentialConsent";
import { resizeImageFile, MAX_IMAGE_FILE_BYTES } from "./admin/ImageField";

type FieldErrors = Partial<Record<string, string>>;

// Sugerencias comunes de aseguradoras españolas de salud/auto/decesos. Se
// pintan como datalist para autocompletar sin restringir — el usuario
// siempre puede escribir cualquier nombre.
const COMPANIAS_SUGERIDAS = [
  "Adeslas", "Sanitas", "Asisa", "DKV", "Mapfre", "Aegon", "AXA", "Fiatc",
  "Generali", "Helvetia", "Reale", "Santalucía", "Divina Seguros",
  "Línea Directa", "Mutua Madrileña", "Zurich", "Allianz",
];

const PRODUCTO_OPTIONS: { value: "salud" | "vida" | "auto" | "decesos" | "hogar"; label: string }[] = [
  { value: "salud", label: "Seguro de salud" },
  { value: "vida", label: "Seguro de vida" },
  { value: "auto", label: "Seguro de auto" },
  { value: "decesos", label: "Seguro de decesos" },
  { value: "hogar", label: "Seguro de hogar" },
];

const ZONA_OPTIONS = ["Islas Canarias", "Islas Baleares", "Península"] as const;

export type PriceMatchFormProps = {
  // Contexto: 'landing' para /precio-mejor-garantizado, 'comparativa' para
  // el modal de rescate dentro de /comparativa. Cambia el source del lead
  // en el CRM (price-match vs price-match-comparativa) para poder medirlos
  // por separado.
  origen?: "landing" | "comparativa";
  // Producto sugerido de entrada (p.ej. si venimos desde la comparativa de
  // salud, ya lo preseleccionamos). El usuario puede cambiarlo.
  defaultProducto?: "salud" | "vida" | "auto" | "decesos" | "hogar";
  // Callback opcional al enviar con éxito (p.ej. cerrar modal).
  onSuccess?: () => void;
  // Si es true, tras el envío redirige a /gracias con el source. Solo tiene
  // sentido en la landing dedicada; en el modal se prefiere onSuccess.
  redirectOnSuccess?: boolean;
};

export function PriceMatchForm({ origen = "landing", defaultProducto = "salud", onSuccess, redirectOnSuccess = true }: PriceMatchFormProps) {
  const router = useRouter();

  const [producto, setProducto] = useState<PriceMatchFormProps["defaultProducto"]>(defaultProducto);
  const [companiaActual, setCompaniaActual] = useState("");
  const [precioActual, setPrecioActual] = useState("");
  const [periodicidad, setPeriodicidad] = useState<"mes" | "año">("mes");
  const [capturaUrl, setCapturaUrl] = useState("");
  const [capturaError, setCapturaError] = useState<string | null>(null);
  const [capturaProcessing, setCapturaProcessing] = useState(false);
  const [comentario, setComentario] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [codigoPostal, setCodigoPostal] = useState<typeof ZONA_OPTIONS[number] | "">("");
  // Un único check cubre privacidad + autorización de contacto — ver
  // components/EssentialConsent.tsx.
  const [esencial, setEsencial] = useState(false);
  const [comercial, setComercial] = useState(false);
  const [consentTimes, setConsentTimes] = useState<{ privacidadAt?: string; contactoAt?: string; comercialAt?: string }>({});
  const [turnstileToken, setTurnstileToken] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturaError(null);
    if (file.size > MAX_IMAGE_FILE_BYTES) { setCapturaError("El archivo pesa demasiado (máx. 10 MB)."); return; }
    setCapturaProcessing(true);
    try { setCapturaUrl(await resizeImageFile(file, 1400, "image/jpeg", 0.7)); }
    catch { setCapturaError("No se pudo procesar la imagen."); }
    setCapturaProcessing(false);
  }

  function toggleConsent(key: "privacidadAt" | "contactoAt" | "comercialAt", checked: boolean, setter: (v: boolean) => void) {
    setter(checked);
    setConsentTimes((c) => ({ ...c, [key]: checked ? new Date().toISOString() : undefined }));
  }

  function toggleEsencial(checked: boolean) {
    setEsencial(checked);
    const at = checked ? new Date().toISOString() : undefined;
    setConsentTimes((c) => ({ ...c, privacidadAt: at, contactoAt: at }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const errs: FieldErrors = {};
    if (!companiaActual.trim() || companiaActual.trim().length < 2) errs.companiaActual = "Dinos qué compañía te lo ofrece.";
    const precioNum = Number(precioActual);
    if (!precioActual || !Number.isFinite(precioNum) || precioNum <= 0) errs.precioActual = "Introduce el importe.";
    if (!nombre.trim() || nombre.trim().length < 2) errs.nombre = "Dinos tu nombre.";
    if (!/^[6-9]\d{8}$/.test(normalizePhone(telefono))) errs.telefono = "Introduce un móvil español válido.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = "Revisa tu correo electrónico.";
    if (!codigoPostal) errs.codigoPostal = "Selecciona dónde vives.";
    if (!esencial) errs.aceptaPrivacidad = "Necesitamos que aceptes la política de privacidad.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        producto, companiaActual: companiaActual.trim(), precioActual: precioNum, periodicidad, capturaUrl,
        comentario: comentario.trim(),
        nombre: nombre.trim(), telefono: normalizePhone(telefono), email: email.trim(),
        codigoPostal, aceptaPrivacidad: esencial, autorizaContacto: esencial, aceptaComercial: comercial,
        consent: consentTimes, company: "", utm: getAttribution(), turnstileToken, origen,
      };
      const res = await fetch("/api/lead/price-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        pushDataLayerEvent("generate_lead", { producto, form: "price-match", origen });
        onSuccess?.();
        if (redirectOnSuccess) router.push(`/gracias?source=${origen === "comparativa" ? "price-match-comparativa" : "price-match"}`);
        return;
      }
      const body = (await res.json().catch(() => null)) as { errors?: Record<string, string[]> } | null;
      if (body?.errors) {
        const mapped: FieldErrors = {};
        for (const [k, v] of Object.entries(body.errors)) if (v && v[0]) mapped[k] = v[0];
        setErrors(mapped);
      } else setSubmitError("No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
    } catch { setSubmitError("Parece que hay un problema de conexión. Inténtalo de nuevo."); }
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {/* Producto */}
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">¿Qué seguro tienes que quieres estudiar?</span>
        <select value={producto}
          onChange={(e) => setProducto(e.target.value as typeof producto)}
          className="w-full rounded-card border border-hair bg-white px-3 py-3 text-[15px]">
          {PRODUCTO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      {/* Compañía actual + captura */}
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">Compañía actual</span>
        <input list="pm-companias" value={companiaActual} onChange={(e) => setCompaniaActual(e.target.value)}
          placeholder="Ej. Adeslas, Sanitas, Mapfre…"
          className="w-full rounded-card border border-hair bg-white px-3 py-3 text-[15px]" />
        <datalist id="pm-companias">
          {COMPANIAS_SUGERIDAS.map((c) => <option key={c} value={c} />)}
        </datalist>
        {errors.companiaActual && <p role="alert" className="mt-1 text-[12px] font-medium text-brand-red">{errors.companiaActual}</p>}
      </label>

      {/* Precio + periodicidad */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Precio actual (€)</span>
          <input inputMode="decimal" type="number" min="1" step="0.01" value={precioActual}
            onChange={(e) => setPrecioActual(e.target.value)} placeholder="42,80"
            className="w-full rounded-card border border-hair bg-white px-3 py-3 text-[15px]" />
          {errors.precioActual && <p role="alert" className="mt-1 text-[12px] font-medium text-brand-red">{errors.precioActual}</p>}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Periodicidad</span>
          <select value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value as "mes" | "año")}
            className="w-full rounded-card border border-hair bg-white px-3 py-3 text-[15px]">
            <option value="mes">Al mes</option>
            <option value="año">Al año</option>
          </select>
        </label>
      </div>

      {/* Captura opcional */}
      <div>
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">Captura del presupuesto (opcional, muy recomendado)</span>
        {capturaUrl ? (
          <div className="flex items-center gap-3 rounded-card border border-hair bg-mist p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturaUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
            <p className="min-w-0 flex-1 truncate text-[12px] text-slate2">Archivo listo para enviar.</p>
            <button type="button" onClick={() => setCapturaUrl("")} className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-card border-2 border-dashed border-hair px-4 py-6 text-center transition-colors hover:border-navy/40 hover:bg-mist">
            <input type="file" accept="image/*,application/pdf" onChange={onFileChange} className="hidden" />
            <span className="text-[13px] font-semibold text-navy">Subir foto o PDF</span>
            <span className="text-[11px] text-slate2">Se comprime y viaja cifrado — solo la ve tu asesor.</span>
          </label>
        )}
        {capturaProcessing && <p className="mt-1 text-[12px] text-slate2">Procesando…</p>}
        {capturaError && <p role="alert" className="mt-1 text-[12px] font-medium text-brand-red">{capturaError}</p>}
      </div>

      {/* Comentario opcional */}
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">¿Algo que debamos saber? (opcional)</span>
        <textarea value={comentario} onChange={(e) => setComentario(e.target.value.slice(0, 500))} rows={2}
          placeholder="Ej. Mi renovación vence en 10 días, incluyo un familiar con condición previa…"
          className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
      </label>

      <hr className="border-hair" />

      {/* Datos de contacto */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name"
            className="w-full rounded-card border border-hair bg-white px-3 py-3 text-[15px]" />
          {errors.nombre && <p role="alert" className="mt-1 text-[12px] font-medium text-brand-red">{errors.nombre}</p>}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Móvil</span>
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" autoComplete="tel"
            className="w-full rounded-card border border-hair bg-white px-3 py-3 text-[15px]" />
          {errors.telefono && <p role="alert" className="mt-1 text-[12px] font-medium text-brand-red">{errors.telefono}</p>}
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email"
            className="w-full rounded-card border border-hair bg-white px-3 py-3 text-[15px]" />
          {errors.email && <p role="alert" className="mt-1 text-[12px] font-medium text-brand-red">{errors.email}</p>}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">¿Dónde vives?</span>
          <select value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value as typeof codigoPostal)}
            className="w-full rounded-card border border-hair bg-white px-3 py-3 text-[15px]">
            <option value="">Selecciona…</option>
            {ZONA_OPTIONS.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          {errors.codigoPostal && <p role="alert" className="mt-1 text-[12px] font-medium text-brand-red">{errors.codigoPostal}</p>}
        </label>
      </div>

      {/* Consentimientos */}
      <div className="flex flex-col gap-2 rounded-card border border-hair bg-mist/40 p-3">
        <EssentialConsentCheckbox
          idPrefix="pm" size="sm" checked={esencial} onChange={toggleEsencial}
          error={errors.aceptaPrivacidad}
        />
        <ComercialConsentCheckbox
          idPrefix="pm" size="sm" checked={comercial}
          onChange={(v) => toggleConsent("comercialAt", v, setComercial)}
        />
      </div>

      <TurnstileWidget onToken={setTurnstileToken} />

      {submitError && <p role="alert" className="text-[13px] font-medium text-brand-red">{submitError}</p>}

      <button
        type="submit" disabled={submitting} aria-busy={submitting || undefined}
        className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-card bg-brand-red px-6 text-[16px] font-semibold text-white shadow-soft transition-colors hover:bg-brand-red-deep disabled:opacity-60"
      >
        {submitting && <Spinner />}
        {submitting ? "Enviando…" : "Enviar mi presupuesto"}
      </button>
    </form>
  );
}
