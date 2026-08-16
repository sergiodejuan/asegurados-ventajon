"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND_NAME, DIAS_LLAMADA, TURNOS_LLAMADA } from "@/lib/brand";
import { getAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { leadSchema, normalizePhone } from "@/lib/schema";
import { saveQuote, saveCallResult } from "@/lib/quote";
import { saveClientProfile } from "@/lib/clientArea";
import { Check, ChevronDown, ChevronLeft, Phone, Spinner } from "@/components/icons";
import { TurnstileWidget } from "@/components/TurnstileWidget";

// Tarificador de salud EXCLUSIVO de /lp/salud/tarificador. Réplica del
// diseño del tarificador de Línea Directa: 4 pasos guiados en la columna
// principal + sidebar sticky "Te llamamos gratis" con un formulario
// independiente (mismo pipeline que el resto del CRM). Aparte del
// /tarificador estándar para no mezclar tráfico paid con orgánico y poder
// medir su ROI aparte (source "tarificador-salud-lp").

const STEPS = [
  { key: "asegurados", label: "Asegurados" },
  { key: "salud", label: "Datos de salud" },
  { key: "datos", label: "Datos personales" },
  { key: "envio", label: "Finalizar" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

type Form = {
  numAsegurados: number;
  fechaNacimiento: string; // dd/mm/aaaa
  sexo: "hombre" | "mujer" | "";
  fumador: boolean | null;
  coberturaDental: boolean;
  inicio: "cuanto_antes" | "proximo_mes" | "comparando";
  codigoPostal: "Islas Canarias" | "Islas Baleares" | "Península" | "";
  nombre: string;
  apellido1: string;
  apellido2: string;
  telefono: string;
  email: string;
  documentoTipo: "Dni" | "Nie";
  documento: string;
  codigoPostalReal: string;
  aceptaPrivacidad: boolean;
  autorizaContacto: boolean;
  aceptaComercial: boolean;
};

const INITIAL_FORM: Form = {
  numAsegurados: 1,
  fechaNacimiento: "",
  sexo: "",
  fumador: null,
  coberturaDental: false,
  inicio: "cuanto_antes",
  codigoPostal: "",
  nombre: "",
  apellido1: "",
  apellido2: "",
  telefono: "",
  email: "",
  documentoTipo: "Dni",
  documento: "",
  codigoPostalReal: "",
  aceptaPrivacidad: false,
  autorizaContacto: false,
  aceptaComercial: false,
};

const INICIO_VALUES: Form["inicio"][] = ["cuanto_antes", "proximo_mes", "comparando"];

// El modal del hero de /lp/salud (ver PaidHeroQuoteModal) resuelve el paso
// "asegurados" (aislado, sin PII) y precarga "inicio" antes de llegar aquí.
// "inicio" no salta el paso "salud" porque ahí comparte pantalla con fecha
// de nacimiento/sexo/fumador, que sí hay que rellenar a mano.
function prefillFromParams(params: URLSearchParams): Partial<Form> {
  const prefill: Partial<Form> = {};
  const asegurados = Number(params.get("asegurados"));
  if (asegurados >= 1 && asegurados <= 5) prefill.numAsegurados = asegurados;
  const inicio = params.get("inicio") as Form["inicio"] | null;
  if (inicio && INICIO_VALUES.includes(inicio)) prefill.inicio = inicio;
  return prefill;
}

function StepDot({ index, active, done }: { index: number; active: boolean; done: boolean }) {
  const base = "grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold transition-colors";
  const styles = done
    ? "bg-emerald-500 text-white"
    : active
    ? "bg-brand-red text-white"
    : "bg-white text-slate2 border border-hair";
  return <span className={`${base} ${styles}`}>{done ? <Check width={14} height={14} /> : index + 1}</span>;
}

export function PaidTarificadorSalud({ phone, logoUrl }: { phone: string; logoUrl: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = useMemo(() => prefillFromParams(searchParams), []); // solo al montar: prefill del modal del hero
  const [stepIndex, setStepIndex] = useState(() => (prefill.numAsegurados !== undefined ? 1 : 0));
  const [form, setForm] = useState<Form>(() => ({ ...INITIAL_FORM, ...prefill }));
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [now, setNow] = useState<string>("");
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;

  useEffect(() => { setNow(new Date().toISOString()); }, []);

  const currentStep = STEPS[stepIndex].key;
  const canGoBack = stepIndex > 0;

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validateStep(step: StepKey): boolean {
    const errs: Partial<Record<keyof Form, string>> = {};
    if (step === "asegurados") {
      if (!(form.numAsegurados >= 1 && form.numAsegurados <= 9)) errs.numAsegurados = "Elige un número entre 1 y 9.";
    }
    if (step === "salud") {
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.fechaNacimiento)) errs.fechaNacimiento = "Usa el formato dd/mm/aaaa.";
      if (!form.sexo) errs.sexo = "Selecciona una opción.";
      if (form.fumador === null) errs.fumador = "Indícanos si fumas.";
    }
    if (step === "datos") {
      if (form.nombre.trim().length < 2) errs.nombre = "Dinos tu nombre.";
      if (form.apellido1.trim().length < 2) errs.apellido1 = "Dinos tu primer apellido.";
      if (!/^[6-9]\d{8}$/.test(normalizePhone(form.telefono))) errs.telefono = "Introduce un móvil español válido.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Revisa tu correo.";
      if (!form.codigoPostal) errs.codigoPostal = "Selecciona dónde vives.";
      if (!/^\d{5}$/.test(form.codigoPostalReal)) errs.codigoPostalReal = "5 dígitos.";
      const doc = form.documento.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
      if (!/^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(doc)) errs.documento = "Revisa el DNI/NIE.";
    }
    if (step === "envio") {
      if (!form.aceptaPrivacidad) errs.aceptaPrivacidad = "Es necesario aceptar la política.";
      if (!form.autorizaContacto) errs.autorizaContacto = "Es necesario para poder llamarte.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    if (!validateStep(currentStep)) return;
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
  }
  function goBack() {
    if (canGoBack) setStepIndex((i) => i - 1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep("envio")) return;
    // Validación final combinada
    for (const s of STEPS) {
      if (!validateStep(s.key)) {
        setStepIndex(STEPS.findIndex((st) => st.key === s.key));
        return;
      }
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = {
        inicio: form.inicio,
        codigoPostal: form.codigoPostal,
        numAsegurados: form.numAsegurados,
        fechaNacimiento: form.fechaNacimiento,
        sexo: form.sexo,
        documentoTipo: form.documentoTipo,
        documento: form.documento,
        codigoPostalReal: form.codigoPostalReal,
        fumador: !!form.fumador,
        aseguradosAdicionales: [],
        coberturaDental: form.coberturaDental,
        yaTieneSeguro: false,
        nombre: form.nombre,
        apellido1: form.apellido1,
        apellido2: form.apellido2,
        telefono: form.telefono,
        email: form.email,
        aceptaPrivacidad: form.aceptaPrivacidad,
        autorizaContacto: form.autorizaContacto,
        aceptaComercial: form.aceptaComercial,
        company: "",
        consent: {
          privacidadAt: now, contactoAt: now,
          ...(form.aceptaComercial ? { comercialAt: now } : {}),
        },
        utm: getAttribution(),
        origen: "lp-salud" as const,
        turnstileToken,
      };
      const parsed = leadSchema.safeParse(payload);
      if (!parsed.success) {
        setSubmitError("Revisa los datos, hay algún campo que no cuadra.");
        return;
      }
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; presupuestoId?: string; errors?: Record<string, string[]>; error?: string } | null;
      if (res.ok && body?.ok) {
        saveQuote({
          producto: "salud",
          nombre: form.nombre,
          telefono: form.telefono,
          email: form.email,
          codigoPostal: form.codigoPostal,
          numAsegurados: form.numAsegurados,
          coberturaDental: form.coberturaDental,
          fechaNacimiento: form.fechaNacimiento,
          sexo: form.sexo || undefined,
          consentAt: payload.consent,
          id: body.presupuestoId ?? "",
          createdAt: now,
        });
        saveClientProfile({ nombre: form.nombre, telefono: form.telefono, email: form.email });
        pushDataLayerEvent("generate_lead", { producto: "salud", form: "lp-salud-tarificador" });
        const target = body.presupuestoId ? `/comparativa?pid=${encodeURIComponent(body.presupuestoId)}&producto=salud` : "/comparativa?producto=salud";
        router.push(target);
        return;
      }
      const first = body?.errors ? Object.values(body.errors).find((v) => v && v[0]) : undefined;
      setSubmitError(first?.[0] ?? body?.error ?? "No hemos podido guardar tu solicitud. Inténtalo de nuevo.");
    } catch {
      setSubmitError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-mist text-ink">
      {/* Top bar minimal: logo (→ tarificador) + teléfono destacado */}
      <header className="border-b border-hair bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/lp/salud/tarificador" aria-label={`${BRAND_NAME} — calcular seguro`} className="inline-flex items-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={BRAND_NAME} className="h-10 w-auto max-w-[180px] object-contain" />
            ) : (
              <span translate="no" className="font-display text-[16px] font-extrabold text-navy">{BRAND_NAME}</span>
            )}
          </Link>
          <a href={phoneHref} className="inline-flex items-center gap-2 text-[15px] font-bold text-emerald-600 md:text-[16px]">
            <Phone width={18} height={18} />
            <span className="tnums">{phone}</span>
          </a>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-6xl px-5 py-8 md:py-12">
        {/* Progress steps horizontales (móvil) / verticales sobre la columna principal (desktop) */}
        <ol aria-label="Pasos del tarificador" className="mb-8 flex items-center justify-center gap-3 md:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <StepDot index={i} active={i === stepIndex} done={i < stepIndex} />
              <span className="hidden text-[13px] font-semibold text-navy md:inline">{s.label}</span>
              {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-6 bg-hair md:w-10" />}
            </li>
          ))}
        </ol>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* --- Columna izquierda: pregunta actual --- */}
          <section aria-live="polite" className="rounded-[20px] bg-white p-6 shadow-soft md:p-10">
            {currentStep === "asegurados" && (
              <AseguradosStep value={form.numAsegurados} onChange={(v) => set("numAsegurados", v)} error={errors.numAsegurados} />
            )}
            {currentStep === "salud" && (
              <SaludStep form={form} set={set} errors={errors} />
            )}
            {currentStep === "datos" && (
              <DatosStep form={form} set={set} errors={errors} />
            )}
            {currentStep === "envio" && (
              <EnvioStep
                form={form} set={set} errors={errors}
                submitting={submitting} submitError={submitError}
                turnstileToken={turnstileToken} onTurnstile={setTurnstileToken}
                onSubmit={onSubmit}
              />
            )}

            {/* Nav (back / next) */}
            <div className="mt-8 flex items-center justify-between gap-3">
              {canGoBack ? (
                <button type="button" onClick={goBack} className="inline-flex items-center gap-1 rounded-card border border-hair bg-white px-4 py-2.5 text-[14px] font-semibold text-navy hover:bg-mist">
                  <ChevronLeft width={16} height={16} /> Atrás
                </button>
              ) : <span />}
              {currentStep !== "envio" && (
                <button type="button" onClick={goNext} className="inline-flex items-center justify-center rounded-card bg-brand-red px-6 py-3 text-[15px] font-bold text-white hover:bg-brand-red-deep">
                  Continuar
                </button>
              )}
            </div>

            <p className="mt-6 text-[12px] leading-relaxed text-slate2">
              Los datos que nos proporciones en el presupuesto serán tratados por {BRAND_NAME} para cursar tu solicitud, y contactar contigo para gestionar tus dudas.
              Para más información sobre el tratamiento de tus datos o sobre cómo ejercer tus derechos consulta nuestra{" "}
              <Link href="/legal#privacidad" className="text-navy underline">Política de privacidad</Link>.
            </p>
          </section>

          {/* --- Columna derecha: sidebar "Te llamamos gratis" --- */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[20px] bg-white p-6 shadow-soft">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-9 w-auto max-w-[130px] object-contain" />
                ) : (
                  <span className="font-display text-[14px] font-extrabold text-navy">{BRAND_NAME}</span>
                )}
              </div>
              <h2 className="mt-5 text-[18px] font-extrabold text-navy">Te llamamos gratis</h2>
              <SidebarLlamadaForm />
              <p className="mt-4 text-center text-[13px] text-slate2">O contacta en el</p>
              <a href={phoneHref} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[12px] border border-brand-red/40 px-4 py-3 text-[16px] font-bold text-brand-red">
                <Phone width={18} height={18} />
                <span className="tnums">{phone}</span>
              </a>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-hair bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-[13px] text-slate2 md:flex-row">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <li><Link href="/legal#cookies" className="hover:text-navy">Política de cookies</Link></li>
            <li><Link href="/legal" className="hover:text-navy">Aviso Legal</Link></li>
            <li><Link href="/legal#privacidad" className="hover:text-navy">Política de privacidad</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   Steps
============================================================ */

function AseguradosStep({ value, onChange, error }: { value: number; onChange: (n: number) => void; error?: string }) {
  return (
    <div>
      <h1 className="text-[24px] font-extrabold text-navy md:text-[28px]">¿A cuántas personas quieres asegurar?</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate2 md:text-[16px]">
        Cuantos <strong className="text-navy">más asegurados</strong> incluyas en la póliza, tendrás un <strong className="text-navy">mejor precio</strong> por persona.
      </p>
      <ul className="mt-6 flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <li key={n}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(n)}
                className={`flex w-full items-center gap-3 rounded-pill border px-5 py-4 text-left text-[16px] font-semibold transition-colors ${active ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? "border-white bg-white text-navy" : "border-slate2 text-transparent"}`}>
                  <span className="h-2.5 w-2.5 rounded-full bg-navy" />
                </span>
                {n}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-3 text-[13px] font-semibold text-brand-red">{error}</p>}
    </div>
  );
}

function SaludStep({ form, set, errors }: {
  form: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
  errors: Partial<Record<keyof Form, string>>;
}) {
  return (
    <div>
      <h1 className="text-[24px] font-extrabold text-navy md:text-[28px]">Cuéntanos sobre ti</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate2">
        Necesitamos estos datos para calcular tu precio. Todo es confidencial y solo lo verá tu asesor.
      </p>
      <div className="mt-6 flex flex-col gap-5">
        <Field label="Fecha de nacimiento" error={errors.fechaNacimiento}>
          <input
            type="text" inputMode="numeric" placeholder="dd/mm/aaaa"
            value={form.fechaNacimiento}
            onChange={(e) => set("fechaNacimiento", e.target.value)}
            className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] tnums text-ink focus:border-navy focus:outline-none"
          />
        </Field>
        <Field label="Sexo" error={errors.sexo}>
          <div className="grid grid-cols-2 gap-3">
            {(["hombre", "mujer"] as const).map((s) => (
              <button
                key={s} type="button" aria-pressed={form.sexo === s}
                onClick={() => set("sexo", s)}
                className={`rounded-[12px] border px-4 py-3.5 text-[15px] font-semibold capitalize transition-colors ${form.sexo === s ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <Field label="¿Fumas?" error={errors.fumador}>
          <div className="grid grid-cols-2 gap-3">
            {([{ v: true, l: "Sí" }, { v: false, l: "No" }] as const).map((opt) => (
              <button
                key={opt.l} type="button" aria-pressed={form.fumador === opt.v}
                onClick={() => set("fumador", opt.v)}
                className={`rounded-[12px] border px-4 py-3.5 text-[15px] font-semibold transition-colors ${form.fumador === opt.v ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="¿Quieres cobertura dental?" hint="Opcional — añade limpiezas, revisiones y descuentos en tratamientos.">
          <div className="grid grid-cols-2 gap-3">
            {([{ v: true, l: "Sí, con dental" }, { v: false, l: "No, sin dental" }] as const).map((opt) => (
              <button
                key={opt.l} type="button" aria-pressed={form.coberturaDental === opt.v}
                onClick={() => set("coberturaDental", opt.v)}
                className={`rounded-[12px] border px-4 py-3.5 text-[15px] font-semibold transition-colors ${form.coberturaDental === opt.v ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="¿Cuándo quieres empezar?">
          <div className="grid gap-2.5 sm:grid-cols-3">
            {([{ v: "cuanto_antes", l: "Cuanto antes" }, { v: "proximo_mes", l: "Próximo mes" }, { v: "comparando", l: "Solo comparando" }] as const).map((opt) => (
              <button
                key={opt.v} type="button" aria-pressed={form.inicio === opt.v}
                onClick={() => set("inicio", opt.v)}
                className={`rounded-[12px] border px-4 py-3 text-[14px] font-semibold transition-colors ${form.inicio === opt.v ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function DatosStep({ form, set, errors }: {
  form: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
  errors: Partial<Record<keyof Form, string>>;
}) {
  return (
    <div>
      <h1 className="text-[24px] font-extrabold text-navy md:text-[28px]">Tus datos personales</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate2">
        Los usaremos para enviarte tu comparativa y para que un asesor te contacte si lo autorizas.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Nombre" error={errors.nombre}>
          <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre" autoComplete="given-name"
            className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] focus:border-navy focus:outline-none" />
        </Field>
        <Field label="Primer apellido" error={errors.apellido1}>
          <input value={form.apellido1} onChange={(e) => set("apellido1", e.target.value)} placeholder="Primer apellido" autoComplete="family-name"
            className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] focus:border-navy focus:outline-none" />
        </Field>
        <Field label="Segundo apellido (opcional)">
          <input value={form.apellido2} onChange={(e) => set("apellido2", e.target.value)} placeholder="Segundo apellido"
            className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] focus:border-navy focus:outline-none" />
        </Field>
        <Field label="Teléfono" error={errors.telefono}>
          <input type="tel" inputMode="tel" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="Ej: 642642632" autoComplete="tel"
            className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] tnums focus:border-navy focus:outline-none" />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="tu@correo.com" autoComplete="email"
            className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] focus:border-navy focus:outline-none" />
        </Field>
        <Field label="¿Dónde vives?" error={errors.codigoPostal}>
          <div className="relative">
            <select value={form.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value as Form["codigoPostal"])}
              className="w-full appearance-none rounded-[12px] border border-hair bg-white px-4 py-3.5 pr-10 text-[16px] focus:border-navy focus:outline-none">
              <option value="">Selecciona una zona</option>
              <option value="Islas Canarias">Islas Canarias</option>
              <option value="Islas Baleares">Islas Baleares</option>
              <option value="Península">Península</option>
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate2">
              <ChevronDown width={16} height={16} />
            </span>
          </div>
        </Field>
        <Field label="Código postal" hint="5 dígitos" error={errors.codigoPostalReal}>
          <input inputMode="numeric" value={form.codigoPostalReal} onChange={(e) => set("codigoPostalReal", e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="00000" autoComplete="postal-code"
            className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] tnums focus:border-navy focus:outline-none" />
        </Field>
        <Field label="Documento" error={errors.documento}>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <div className="relative">
              <select value={form.documentoTipo} onChange={(e) => set("documentoTipo", e.target.value as Form["documentoTipo"])}
                className="w-full appearance-none rounded-[12px] border border-hair bg-white px-3 py-3.5 pr-8 text-[16px] focus:border-navy focus:outline-none">
                <option value="Dni">DNI</option>
                <option value="Nie">NIE</option>
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate2">
                <ChevronDown width={14} height={14} />
              </span>
            </div>
            <input value={form.documento} onChange={(e) => set("documento", e.target.value.toUpperCase())} placeholder="12345678A"
              className="w-full rounded-[12px] border border-hair bg-white px-4 py-3.5 text-[16px] tnums focus:border-navy focus:outline-none" />
          </div>
        </Field>
      </div>
    </div>
  );
}

function EnvioStep({
  form, set, errors, submitting, submitError, turnstileToken, onTurnstile, onSubmit,
}: {
  form: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
  errors: Partial<Record<keyof Form, string>>;
  submitting: boolean; submitError: string | null;
  turnstileToken: string; onTurnstile: (t: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  // turnstileToken se propaga al submit del padre — el widget lo escribe aquí,
  // el padre lo lee al enviar. Sin uso local aparente, pero necesario para la
  // pista visual en producción cuando Turnstile está activo.
  void turnstileToken;

  return (
    <form onSubmit={onSubmit}>
      <h1 className="text-[24px] font-extrabold text-navy md:text-[28px]">Últimos detalles y ver tu precio</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate2">
        Confirma los consentimientos legales y te mostramos tu comparativa personalizada.
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
            Autorizo que {BRAND_NAME} me contacte por teléfono/WhatsApp/email para gestionar mi presupuesto.
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

      <TurnstileWidget onToken={onTurnstile} />

      {submitError && (
        <p role="alert" className="mt-4 rounded-[10px] bg-brand-red/10 px-4 py-3 text-[14px] font-medium text-brand-red-deep">{submitError}</p>
      )}

      <button
        type="submit" disabled={submitting}
        aria-busy={submitting || undefined}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand-red px-6 py-4 text-[16px] font-bold text-white hover:bg-brand-red-deep disabled:bg-slate2/40"
      >
        {submitting && <Spinner width={18} height={18} />}
        {submitting ? "Calculando…" : "Ver mi comparativa"}
      </button>
    </form>
  );
}

/* ============================================================
   Sidebar — form independiente "Te llamamos gratis"
============================================================ */

function SidebarLlamadaForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dia, setDia] = useState<string>(DIAS_LLAMADA[0]);
  const [turno, setTurno] = useState<string>(TURNOS_LLAMADA[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState("");
  useEffect(() => { setNow(new Date().toISOString()); }, []);

  const canSend = useMemo(() => telefono.trim().length >= 9, [telefono]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/call-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre, telefono, codigoPostal: "", producto: "salud",
          diaLlamada: dia, turnoLlamada: turno,
          aceptaPrivacidad: true, autorizaContacto: true, aceptaComercial: false,
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
        pushDataLayerEvent("generate_lead", { producto: "salud", form: "lp-salud-tarificador-sidebar" });
        router.push("/gracias");
        return;
      }
      const first = body?.errors ? Object.values(body.errors).find((v) => v && v[0]) : undefined;
      setError(first?.[0] ?? body?.error ?? "No se pudo enviar.");
    } catch {
      setError("Problema de conexión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre"
        className="w-full rounded-[10px] border border-hair bg-white px-3 py-3 text-[15px] focus:border-navy focus:outline-none" />
      <input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Tu teléfono" autoComplete="tel"
        className="w-full rounded-[10px] border border-hair bg-white px-3 py-3 text-[15px] tnums focus:border-navy focus:outline-none" />
      <div className="relative">
        <select value={dia} onChange={(e) => setDia(e.target.value)}
          className="w-full appearance-none rounded-[10px] border border-hair bg-white px-3 py-3 pr-8 text-[15px] focus:border-navy focus:outline-none">
          {DIAS_LLAMADA.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate2"><ChevronDown width={14} height={14} /></span>
      </div>
      <div className="relative">
        <select value={turno} onChange={(e) => setTurno(e.target.value)}
          className="w-full appearance-none rounded-[10px] border border-hair bg-white px-3 py-3 pr-8 text-[15px] focus:border-navy focus:outline-none">
          {TURNOS_LLAMADA.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate2"><ChevronDown width={14} height={14} /></span>
      </div>
      <TurnstileWidget onToken={setTurnstileToken} />
      {error && <p role="alert" className="text-[12px] font-semibold text-brand-red">{error}</p>}
      <button type="submit" disabled={submitting || !canSend} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] bg-brand-red px-4 text-[15px] font-bold text-white hover:bg-brand-red-deep disabled:bg-slate2/40">
        {submitting && <Spinner width={16} height={16} />}
        {submitting ? "Enviando…" : "Quiero que me llamen"}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-slate2">
        El envío supone la aceptación de la <Link href="/legal#privacidad" className="text-navy underline">Política de privacidad</Link>.
      </p>
    </form>
  );
}

/* ============================================================
   UI helpers
============================================================ */

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-slate2">{hint}</span>}
      {error && <span className="text-[13px] font-semibold text-brand-red">{error}</span>}
    </label>
  );
}
