"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { normalizePhone } from "@/lib/schema";
import { getAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { Check, ChevronDown, ChevronLeft, Close, Spinner } from "@/components/icons";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { resizeImageFile, MAX_IMAGE_FILE_BYTES } from "@/components/admin/ImageField";

// Modal a pantalla completa con wizard de 4 pasos para el flujo "igualación
// de precio" (/precio-mejor-garantizado). Mismo patrón de pasos que el
// tarificador de /lp/salud/tarificador: progress dots arriba, una pregunta
// por pantalla, botones Atrás/Continuar/Enviar, cierre con X. Envía al
// mismo endpoint que el resto del flujo price-match (/api/lead/price-match)
// con origen "landing" — el CRM lo etiqueta como source "price-match".

type ProductoValor = "salud" | "vida" | "auto" | "decesos" | "hogar";

type StepKey = "producto" | "precio" | "datos" | "envio";
const STEPS: { key: StepKey; label: string }[] = [
  { key: "producto", label: "Seguro" },
  { key: "precio", label: "Tu precio actual" },
  { key: "datos", label: "Datos" },
  { key: "envio", label: "Enviar" },
];

const PRODUCTO_OPTIONS: { value: ProductoValor; label: string; icon: string }[] = [
  { value: "salud", label: "Seguro de salud", icon: "❤️" },
  { value: "vida", label: "Seguro de vida", icon: "🛡️" },
  { value: "auto", label: "Seguro de auto", icon: "🚗" },
  { value: "decesos", label: "Seguro de decesos", icon: "🌿" },
  { value: "hogar", label: "Seguro de hogar", icon: "🏠" },
];

const COMPANIAS_SUGERIDAS = [
  "Adeslas", "Sanitas", "Asisa", "DKV", "Mapfre", "Aegon", "AXA", "Fiatc",
  "Generali", "Helvetia", "Reale", "Santalucía", "Divina Seguros",
  "Línea Directa", "Mutua Madrileña", "Zurich", "Allianz",
];

const ZONA_OPTIONS = ["Islas Canarias", "Islas Baleares", "Península"] as const;

type Form = {
  producto: ProductoValor;
  companiaActual: string;
  precioActual: string;
  periodicidad: "mes" | "año";
  capturaUrl: string;
  comentario: string;
  nombre: string;
  telefono: string;
  email: string;
  codigoPostal: typeof ZONA_OPTIONS[number] | "";
  aceptaPrivacidad: boolean;
  autorizaContacto: boolean;
  aceptaComercial: boolean;
};

const INITIAL_FORM: Form = {
  producto: "salud",
  companiaActual: "",
  precioActual: "",
  periodicidad: "mes",
  capturaUrl: "",
  comentario: "",
  nombre: "",
  telefono: "",
  email: "",
  codigoPostal: "",
  aceptaPrivacidad: false,
  autorizaContacto: false,
  aceptaComercial: false,
};

function StepDot({ index, active, done }: { index: number; active: boolean; done: boolean }) {
  const base = "grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold transition-colors";
  const styles = done
    ? "bg-emerald-500 text-white"
    : active
    ? "bg-brand-red text-white"
    : "bg-white text-slate2 border border-hair";
  return <span className={`${base} ${styles}`}>{done ? <Check width={14} height={14} /> : index + 1}</span>;
}

type Props = {
  open: boolean;
  onClose: () => void;
  defaultProducto?: ProductoValor;
  logoUrl?: string;
  phone: string;
  onSuccess?: () => void;
};

export function PriceMatchStepsModal({ open, onClose, defaultProducto = "salud", logoUrl, phone, onSuccess }: Props) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<Form>({ ...INITIAL_FORM, producto: defaultProducto });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [capturaProcessing, setCapturaProcessing] = useState(false);
  const [capturaError, setCapturaError] = useState<string | null>(null);
  const [now, setNow] = useState<string>("");

  useEffect(() => { if (open) { setNow(new Date().toISOString()); } }, [open]);

  // Reset al reabrir el modal (mejor UX si el usuario canceló a medias)
  useEffect(() => {
    if (open) {
      setStepIndex(0);
      setErrors({});
      setSubmitError(null);
    }
  }, [open]);

  // Bloquea scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validateStep(step: StepKey): boolean {
    const errs: Partial<Record<keyof Form, string>> = {};
    if (step === "producto") {
      if (!form.producto) errs.producto = "Elige el tipo de seguro.";
    }
    if (step === "precio") {
      if (!form.companiaActual.trim() || form.companiaActual.trim().length < 2) errs.companiaActual = "Dinos qué compañía te lo ofrece.";
      const n = Number(form.precioActual);
      if (!form.precioActual || !Number.isFinite(n) || n <= 0) errs.precioActual = "Introduce el importe.";
    }
    if (step === "datos") {
      if (form.nombre.trim().length < 2) errs.nombre = "Dinos tu nombre.";
      if (!/^[6-9]\d{8}$/.test(normalizePhone(form.telefono))) errs.telefono = "Introduce un móvil español válido.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Revisa tu correo.";
      if (!form.codigoPostal) errs.codigoPostal = "Selecciona dónde vives.";
    }
    if (step === "envio") {
      if (!form.aceptaPrivacidad) errs.aceptaPrivacidad = "Es necesario aceptar la política.";
      if (!form.autorizaContacto) errs.autorizaContacto = "Es necesario para poder llamarte.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    if (!validateStep(STEPS[stepIndex].key)) return;
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
  }
  function goBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturaError(null);
    if (file.size > MAX_IMAGE_FILE_BYTES) { setCapturaError("El archivo pesa demasiado (máx. 10 MB)."); return; }
    setCapturaProcessing(true);
    try { set("capturaUrl", await resizeImageFile(file, 1400, "image/jpeg", 0.7)); }
    catch { setCapturaError("No se pudo procesar la imagen."); }
    setCapturaProcessing(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Validar todos los pasos por si el usuario saltó atrás y adelante
    for (const s of STEPS) {
      if (!validateStep(s.key)) {
        setStepIndex(STEPS.findIndex((st) => st.key === s.key));
        return;
      }
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const consent = {
        privacidadAt: now, contactoAt: now,
        ...(form.aceptaComercial ? { comercialAt: now } : {}),
      };
      const payload = {
        producto: form.producto,
        companiaActual: form.companiaActual.trim(),
        precioActual: Number(form.precioActual),
        periodicidad: form.periodicidad,
        capturaUrl: form.capturaUrl,
        comentario: form.comentario.trim(),
        nombre: form.nombre.trim(),
        telefono: normalizePhone(form.telefono),
        email: form.email.trim(),
        codigoPostal: form.codigoPostal,
        aceptaPrivacidad: form.aceptaPrivacidad,
        autorizaContacto: form.autorizaContacto,
        aceptaComercial: form.aceptaComercial,
        consent,
        company: "",
        utm: getAttribution(),
        turnstileToken,
        origen: "landing",
      };
      const res = await fetch("/api/lead/price-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; errors?: Record<string, string[]>; error?: string } | null;
      if (res.ok && body?.ok) {
        pushDataLayerEvent("generate_lead", { producto: form.producto, form: "price-match", origen: "landing" });
        onSuccess?.();
        router.push(`/gracias?source=price-match`);
        return;
      }
      if (body?.errors) {
        const mapped: Partial<Record<keyof Form, string>> = {};
        for (const [k, v] of Object.entries(body.errors)) if (v && v[0]) mapped[k as keyof Form] = v[0];
        setErrors(mapped);
        setSubmitError("Revisa los campos marcados.");
      } else {
        setSubmitError(body?.error ?? "No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
      }
    } catch {
      setSubmitError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;
  const currentStep = STEPS[stepIndex].key;
  const isLast = currentStep === "envio";

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pm-modal-title" className="fixed inset-0 z-[60] flex flex-col bg-mist text-ink">
      {/* Top bar */}
      <header className="border-b border-hair bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={BRAND_NAME} className="h-9 w-auto max-w-[160px] object-contain" />
            ) : (
              <span translate="no" className="font-display text-[15px] font-extrabold text-navy">{BRAND_NAME}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a href={phoneHref} className="hidden items-center gap-1.5 text-[14px] font-bold text-emerald-700 md:inline-flex">
              <span aria-hidden="true">📞</span> <span className="tnums">{phone}</span>
            </a>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full border border-hair bg-white text-slate2 hover:bg-mist">
              <Close width={16} height={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto max-w-3xl px-5 py-8 md:py-12">
          {/* Progress dots */}
          <ol aria-label="Pasos" className="mb-8 flex items-center justify-center gap-3 md:gap-6">
            {STEPS.map((s, i) => (
              <li key={s.key} className="flex items-center gap-2">
                <StepDot index={i} active={i === stepIndex} done={i < stepIndex} />
                <span className="hidden text-[13px] font-semibold text-navy md:inline">{s.label}</span>
                {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-6 bg-hair md:w-10" />}
              </li>
            ))}
          </ol>

          <form onSubmit={onSubmit}>
            <section className="rounded-[20px] bg-white p-6 shadow-soft md:p-10">
              {currentStep === "producto" && (
                <div>
                  <h2 id="pm-modal-title" className="text-[24px] font-extrabold text-navy md:text-[28px]">
                    ¿Qué seguro quieres que estudiemos?
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
                    Elige el ramo del presupuesto que ya tienes de otra compañía.
                  </p>
                  <ul className="mt-6 grid gap-3">
                    {PRODUCTO_OPTIONS.map((opt) => {
                      const active = form.producto === opt.value;
                      return (
                        <li key={opt.value}>
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => set("producto", opt.value)}
                            className={`flex w-full items-center gap-4 rounded-pill border px-5 py-4 text-left text-[16px] font-semibold transition-colors ${active ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}
                          >
                            <span aria-hidden="true" className="text-[20px]">{opt.icon}</span>
                            <span>{opt.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {currentStep === "precio" && (
                <div>
                  <h2 id="pm-modal-title" className="text-[24px] font-extrabold text-navy md:text-[28px]">
                    Cuéntanos tu precio actual
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
                    Con estos datos, nuestro equipo puede buscar la mejor alternativa entre nuestras aseguradoras aliadas.
                  </p>
                  <div className="mt-6 flex flex-col gap-5">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[14px] font-semibold text-ink">Compañía actual</span>
                      <input list="pm-companias-modal" value={form.companiaActual}
                        onChange={(e) => set("companiaActual", e.target.value)}
                        placeholder="Ej. Adeslas, Sanitas, Mapfre…"
                        className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] focus:border-navy focus:outline-none" />
                      <datalist id="pm-companias-modal">
                        {COMPANIAS_SUGERIDAS.map((c) => <option key={c} value={c} />)}
                      </datalist>
                      {errors.companiaActual && <span className="text-[13px] font-semibold text-brand-red">{errors.companiaActual}</span>}
                    </label>
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[14px] font-semibold text-ink">Precio actual (€)</span>
                        <input type="number" inputMode="decimal" min="1" step="0.01" value={form.precioActual}
                          onChange={(e) => set("precioActual", e.target.value)} placeholder="42,80"
                          className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] tnums focus:border-navy focus:outline-none" />
                        {errors.precioActual && <span className="text-[13px] font-semibold text-brand-red">{errors.precioActual}</span>}
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[14px] font-semibold text-ink">Periodo</span>
                        <div className="relative">
                          <select value={form.periodicidad} onChange={(e) => set("periodicidad", e.target.value as Form["periodicidad"])}
                            className="w-full appearance-none rounded-[12px] border border-hair bg-white px-4 py-3.5 pr-9 text-[16px] focus:border-navy focus:outline-none">
                            <option value="mes">Al mes</option>
                            <option value="año">Al año</option>
                          </select>
                          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate2">
                            <ChevronDown width={16} height={16} />
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Captura opcional */}
                    <div>
                      <span className="mb-1.5 block text-[14px] font-semibold text-ink">Captura del presupuesto (opcional, muy recomendado)</span>
                      {form.capturaUrl ? (
                        <div className="flex items-center gap-3 rounded-[12px] border border-hair bg-mist p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={form.capturaUrl} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
                          <p className="min-w-0 flex-1 truncate text-[13px] text-slate2">Archivo listo para enviar.</p>
                          <button type="button" onClick={() => set("capturaUrl", "")} className="shrink-0 text-[13px] font-semibold text-brand-red underline">Quitar</button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-[12px] border-2 border-dashed border-hair px-4 py-6 text-center transition-colors hover:border-navy/40 hover:bg-mist">
                          <input type="file" accept="image/*,application/pdf" onChange={onFileChange} className="hidden" />
                          <span className="text-[14px] font-semibold text-navy">Subir foto o PDF</span>
                          <span className="text-[12px] text-slate2">Se comprime y viaja cifrado — solo la ve tu asesor.</span>
                        </label>
                      )}
                      {capturaProcessing && <p className="mt-1 text-[12px] text-slate2">Procesando…</p>}
                      {capturaError && <p role="alert" className="mt-1 text-[12px] font-medium text-brand-red">{capturaError}</p>}
                    </div>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[14px] font-semibold text-ink">¿Algo que debamos saber? (opcional)</span>
                      <textarea value={form.comentario} rows={3}
                        onChange={(e) => set("comentario", e.target.value.slice(0, 500))}
                        placeholder="Ej. Mi renovación vence en 10 días, incluyo un familiar con condición previa…"
                        className="w-full rounded-[12px] border border-hair bg-white px-4 py-3 text-[15px] focus:border-navy focus:outline-none" />
                    </label>
                  </div>
                </div>
              )}

              {currentStep === "datos" && (
                <div>
                  <h2 id="pm-modal-title" className="text-[24px] font-extrabold text-navy md:text-[28px]">
                    Tus datos de contacto
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
                    Los usaremos para hacerte llegar la propuesta en menos de 24 horas laborables.
                  </p>
                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[14px] font-semibold text-ink">Nombre</span>
                      <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre" autoComplete="given-name"
                        className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] focus:border-navy focus:outline-none" />
                      {errors.nombre && <span className="text-[13px] font-semibold text-brand-red">{errors.nombre}</span>}
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[14px] font-semibold text-ink">Teléfono</span>
                      <input type="tel" inputMode="tel" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="Ej: 642642632" autoComplete="tel"
                        className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] tnums focus:border-navy focus:outline-none" />
                      {errors.telefono && <span className="text-[13px] font-semibold text-brand-red">{errors.telefono}</span>}
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[14px] font-semibold text-ink">Email</span>
                      <input type="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="tu@correo.com" autoComplete="email"
                        className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] focus:border-navy focus:outline-none" />
                      {errors.email && <span className="text-[13px] font-semibold text-brand-red">{errors.email}</span>}
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[14px] font-semibold text-ink">¿Dónde vives?</span>
                      <div className="relative">
                        <select value={form.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value as Form["codigoPostal"])}
                          className="w-full appearance-none rounded-[12px] border border-hair bg-white px-4 py-3.5 pr-10 text-[16px] focus:border-navy focus:outline-none">
                          <option value="">Selecciona una zona</option>
                          {ZONA_OPTIONS.map((z) => <option key={z} value={z}>{z}</option>)}
                        </select>
                        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate2">
                          <ChevronDown width={16} height={16} />
                        </span>
                      </div>
                      {errors.codigoPostal && <span className="text-[13px] font-semibold text-brand-red">{errors.codigoPostal}</span>}
                    </label>
                  </div>
                </div>
              )}

              {currentStep === "envio" && (
                <div>
                  <h2 id="pm-modal-title" className="text-[24px] font-extrabold text-navy md:text-[28px]">
                    Último paso: consentimientos
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
                    Confirma que aceptas nuestros términos y enviamos tu solicitud. Un asesor te contacta en menos de 24 horas laborables.
                  </p>
                  <div className="mt-6 flex flex-col gap-4">
                    <label className="flex items-start gap-3 rounded-[12px] border border-hair bg-white p-4">
                      <input type="checkbox" checked={form.aceptaPrivacidad} onChange={(e) => set("aceptaPrivacidad", e.target.checked)}
                        className="mt-1 h-5 w-5 shrink-0 rounded border-hair text-navy" />
                      <span className="text-[14px] leading-relaxed">
                        He leído y acepto la <Link href="/legal#privacidad" className="text-navy underline">Política de privacidad</Link>.
                      </span>
                    </label>
                    {errors.aceptaPrivacidad && <p className="text-[13px] font-semibold text-brand-red">{errors.aceptaPrivacidad}</p>}

                    <label className="flex items-start gap-3 rounded-[12px] border border-hair bg-white p-4">
                      <input type="checkbox" checked={form.autorizaContacto} onChange={(e) => set("autorizaContacto", e.target.checked)}
                        className="mt-1 h-5 w-5 shrink-0 rounded border-hair text-navy" />
                      <span className="text-[14px] leading-relaxed">
                        Autorizo a {BRAND_NAME} a contactarme (teléfono/WhatsApp/email) para gestionar esta solicitud.
                      </span>
                    </label>
                    {errors.autorizaContacto && <p className="text-[13px] font-semibold text-brand-red">{errors.autorizaContacto}</p>}

                    <label className="flex items-start gap-3 rounded-[12px] border border-hair bg-white p-4">
                      <input type="checkbox" checked={form.aceptaComercial} onChange={(e) => set("aceptaComercial", e.target.checked)}
                        className="mt-1 h-5 w-5 shrink-0 rounded border-hair text-navy" />
                      <span className="text-[14px] leading-relaxed">
                        Acepto recibir ofertas comerciales relacionadas con seguros (opcional).
                      </span>
                    </label>
                  </div>

                  <TurnstileWidget onToken={setTurnstileToken} />

                  {submitError && (
                    <p role="alert" className="mt-4 rounded-[10px] bg-brand-red/10 px-4 py-3 text-[14px] font-medium text-brand-red-deep">{submitError}</p>
                  )}
                </div>
              )}
            </section>

            {/* Nav */}
            <div className="mt-6 flex items-center justify-between gap-3">
              {stepIndex > 0 ? (
                <button type="button" onClick={goBack}
                  className="inline-flex items-center gap-1 rounded-card border border-hair bg-white px-5 py-3 text-[14px] font-semibold text-navy hover:bg-mist">
                  <ChevronLeft width={16} height={16} /> Atrás
                </button>
              ) : <span />}
              {!isLast ? (
                <button type="button" onClick={goNext}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-pill bg-brand-red px-8 text-[15px] font-bold text-white hover:bg-brand-red-deep">
                  Continuar
                </button>
              ) : (
                <button type="submit" disabled={submitting} aria-busy={submitting || undefined}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-pill bg-brand-red px-8 text-[15px] font-bold text-white hover:bg-brand-red-deep disabled:bg-slate2/40">
                  {submitting && <Spinner width={16} height={16} />}
                  {submitting ? "Enviando…" : "Enviar mi solicitud"}
                </button>
              )}
            </div>

            <p className="mt-6 text-center text-[12px] leading-relaxed text-slate2">
              Los datos son tratados por {BRAND_NAME} para gestionar tu petición. Consulta cómo ejercer tus derechos en la{" "}
              <Link href="/legal#privacidad" className="text-navy underline">Política de privacidad</Link>.
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}
