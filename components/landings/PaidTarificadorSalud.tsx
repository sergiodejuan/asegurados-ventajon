"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND_NAME, DIAS_LLAMADA, TURNOS_LLAMADA } from "@/lib/brand";
import { getAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { normalizePhone } from "@/lib/schema";
import { saveQuote, saveCallResult, saveLeadDraft } from "@/lib/quote";
import { saveClientProfile } from "@/lib/clientArea";
import { Check, ChevronDown, ChevronLeft, Phone, Spinner } from "@/components/icons";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { PaidLlamadaLegalNotice } from "./PaidLlamadaLegalNotice";

// Tarificador de salud EXCLUSIVO de /lp/salud/tarificador.
//
// Unificación de flujo (2026-08): el tarificador SOLO recoge datos técnicos
// de tarificación (asegurados, salud, zona/CP). NO pide nombre, teléfono,
// email ni consentimientos — eso lo hace el modal-gate de /comparativa,
// donde se crea el lead REAL. Antes se pedían dos veces (aquí y allí).
//
// La transición al modal viaja por sessionStorage (saveLeadDraft). En
// /comparativa el modal es obligatorio y no permite ver precios sin datos.

const STEPS = [
  { key: "asegurados", label: "Asegurados" },
  { key: "salud", label: "Datos de salud" },
  { key: "zona", label: "Tu zona" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

// Cada asegurado adicional (los que no son el titular): Codeoscopic tarifica
// por edad y sexo de CADA persona cubierta, así que el precio real solo sale
// si los recogemos. Antes se enviaba siempre [] — el precio salía solo para
// el titular. Ver lib/codeoscopicMap.ts risk.insureds.
type AseguradoAdicional = { fechaNacimiento: string; sexo: "hombre" | "mujer" | "" };

type Form = {
  numAsegurados: number;
  fechaNacimiento: string; // dd/mm/aaaa
  sexo: "hombre" | "mujer" | "";
  fumador: boolean | null;
  aseguradosAdicionales: AseguradoAdicional[];
  coberturaDental: boolean;
  inicio: "cuanto_antes" | "proximo_mes" | "comparando";
  codigoPostal: "Islas Canarias" | "Islas Baleares" | "Península" | "";
  codigoPostalReal: string;
};

const INITIAL_FORM: Form = {
  numAsegurados: 1,
  fechaNacimiento: "",
  sexo: "",
  fumador: null,
  aseguradosAdicionales: [],
  coberturaDental: false,
  inicio: "cuanto_antes",
  codigoPostal: "",
  codigoPostalReal: "",
};

// Ajusta la lista de asegurados adicionales para que tenga exactamente
// numAsegurados-1 entradas (el titular es el asegurado 1), conservando lo ya
// escrito al subir/bajar el número.
function resizeAsegurados(prev: AseguradoAdicional[], numAsegurados: number): AseguradoAdicional[] {
  const wanted = Math.max(0, numAsegurados - 1);
  const next = prev.slice(0, wanted);
  while (next.length < wanted) next.push({ fechaNacimiento: "", sexo: "" });
  return next;
}

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

export function PaidTarificadorSalud({ phone, logoUrl, slug }: { phone: string; logoUrl: string; slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = useMemo(() => prefillFromParams(searchParams), []); // solo al montar: prefill del modal del hero
  const [stepIndex, setStepIndex] = useState(() => (prefill.numAsegurados !== undefined ? 1 : 0));
  const [form, setForm] = useState<Form>(() => {
    const base = { ...INITIAL_FORM, ...prefill };
    return { ...base, aseguradosAdicionales: resizeAsegurados(base.aseguradosAdicionales, base.numAsegurados) };
  });
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

  // Cambiar el nº de asegurados redimensiona la lista de adicionales para que
  // pidamos (o dejemos de pedir) los datos del resto de personas cubiertas.
  function setNumAsegurados(v: number) {
    setForm((f) => ({ ...f, numAsegurados: v, aseguradosAdicionales: resizeAsegurados(f.aseguradosAdicionales, v) }));
    setErrors((e) => ({ ...e, numAsegurados: undefined }));
  }

  function setInsured(index: number, patch: Partial<AseguradoAdicional>) {
    setForm((f) => ({
      ...f,
      aseguradosAdicionales: f.aseguradosAdicionales.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
    setErrors((e) => ({ ...e, aseguradosAdicionales: undefined }));
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
      // Cada asegurado adicional necesita fecha de nacimiento y sexo para
      // que Codeoscopic pueda tarificar su parte.
      const incompleto = form.aseguradosAdicionales.some(
        (a) => !/^\d{2}\/\d{2}\/\d{4}$/.test(a.fechaNacimiento) || !a.sexo
      );
      if (incompleto) errs.aseguradosAdicionales = "Completa la fecha de nacimiento y el sexo de cada asegurado.";
    }
    if (step === "zona") {
      if (!form.codigoPostal) errs.codigoPostal = "Selecciona dónde vives.";
      if (!/^\d{5}$/.test(form.codigoPostalReal)) errs.codigoPostalReal = "5 dígitos.";
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
    if (!validateStep("zona")) return;
    // Validación final combinada de todos los pasos técnicos.
    for (const s of STEPS) {
      if (!validateStep(s.key)) {
        setStepIndex(STEPS.findIndex((st) => st.key === s.key));
        return;
      }
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      // Payload draft — todo lo técnico. El modal-gate de /comparativa
      // añadirá nombre/telefono/email/consents antes de crear el lead real.
      const draftData = {
        inicio: form.inicio,
        codigoPostal: form.codigoPostal,
        numAsegurados: form.numAsegurados,
        fechaNacimiento: form.fechaNacimiento,
        sexo: form.sexo,
        codigoPostalReal: form.codigoPostalReal,
        fumador: !!form.fumador,
        aseguradosAdicionales: form.aseguradosAdicionales
          .filter((a) => /^\d{2}\/\d{2}\/\d{4}$/.test(a.fechaNacimiento) && a.sexo)
          .map((a) => ({ fechaNacimiento: a.fechaNacimiento, sexo: a.sexo })),
        coberturaDental: form.coberturaDental,
        yaTieneSeguro: false,
        apellido2: "",
        company: "",
        utm: getAttribution(),
        origen: "lp" as const,
        landingSlug: slug,
        turnstileToken,
      } satisfies Record<string, unknown>;
      saveLeadDraft({ producto: "salud", endpoint: "/api/lead", data: draftData });
      // Guardamos también un QuoteProfile parcial para que la comparativa
      // pueda mostrar los filtros de arriba sin esperar al backend.
      saveQuote({
        producto: "salud",
        codigoPostal: form.codigoPostal,
        numAsegurados: form.numAsegurados,
        coberturaDental: form.coberturaDental,
        fechaNacimiento: form.fechaNacimiento,
        sexo: form.sexo || undefined,
        id: "",
        createdAt: now,
      });
      pushDataLayerEvent("generate_lead_step", { producto: "salud", form: "lp-tarificador" });
      router.push("/comparativa?producto=salud&draft=1");
    } catch {
      setSubmitError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-mist text-ink">
      {/* Top bar minimal: logo (→ tarificador) + teléfono destacado */}
      <header className="border-b border-hair bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href={`/lp/${slug}/tarificador`} aria-label={`${BRAND_NAME} — calcular seguro`} className="inline-flex items-center">
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

      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:py-12">
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
              <AseguradosStep value={form.numAsegurados} onChange={setNumAsegurados} error={errors.numAsegurados} />
            )}
            {currentStep === "salud" && (
              <SaludStep form={form} set={set} setInsured={setInsured} errors={errors} />
            )}
            {currentStep === "zona" && (
              <ZonaStep form={form} set={set} errors={errors} />
            )}

            {/* Nav (back / next) — el último paso muestra "Ver mi comparativa" */}
            <div className="mt-8 flex items-center justify-between gap-3">
              {canGoBack ? (
                <button type="button" onClick={goBack} className="inline-flex items-center gap-1 rounded-card border border-hair bg-white px-4 py-2.5 text-[14px] font-semibold text-navy hover:bg-mist">
                  <ChevronLeft width={16} height={16} /> Atrás
                </button>
              ) : <span />}
              {currentStep !== "zona" ? (
                <button type="button" onClick={goNext} className="inline-flex items-center justify-center rounded-card bg-brand-red px-6 py-3 text-[15px] font-bold text-white hover:bg-brand-red-deep">
                  Continuar
                </button>
              ) : (
                <button
                  type="button" onClick={onSubmit} disabled={submitting} aria-busy={submitting || undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-card bg-brand-red px-6 py-3 text-[15px] font-bold text-white hover:bg-brand-red-deep disabled:bg-slate2/40"
                >
                  {submitting && <Spinner width={16} height={16} />}
                  {submitting ? "Cargando…" : "Ver mi comparativa"}
                </button>
              )}
            </div>
            {submitError && (
              <p role="alert" className="mt-3 rounded-[10px] bg-brand-red/10 px-4 py-3 text-[14px] font-medium text-brand-red-deep">{submitError}</p>
            )}
            <TurnstileWidget onToken={setTurnstileToken} />

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
              <SidebarLlamadaForm slug={slug} />
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

// Fecha de nacimiento en 3 campos separados (dd / mm / aaaa) con
// teclado numérico y auto-avance al rellenar cada tramo. Antes era un
// input único con placeholder "dd/mm/aaaa", pero en móvil el teclado
// numérico no tiene "/" y el usuario se quedaba atascado. Este patrón
// es el mismo que usa StepForm en la home — coherencia + tocar cero.
function DobInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = /^(\d{0,2})\/?(\d{0,2})\/?(\d{0,4})$/.exec(value ?? "") ?? ["", "", "", ""];
  const [dd, setDd] = useState(parts[1] ?? "");
  const [mm, setMm] = useState(parts[2] ?? "");
  const [aaaa, setAaaa] = useState(parts[3] ?? "");
  const mmRef = useRef<HTMLInputElement>(null);
  const aaaaRef = useRef<HTMLInputElement>(null);

  // Cuando el padre cambia value (ej. reset del form), resincroniza.
  useEffect(() => {
    const p = /^(\d{0,2})\/?(\d{0,2})\/?(\d{0,4})$/.exec(value ?? "") ?? ["", "", "", ""];
    setDd(p[1] ?? ""); setMm(p[2] ?? ""); setAaaa(p[3] ?? "");
  }, [value]);

  function compose(nd: string, nm: string, na: string) {
    if (!nd && !nm && !na) return "";
    return `${nd.padStart(2, "0")}/${nm.padStart(2, "0")}/${na.padStart(4, "0")}`;
  }
  function emitIfComplete(nd: string, nm: string, na: string) {
    if (nd.length === 2 && nm.length === 2 && na.length === 4) onChange(compose(nd, nm, na));
    else onChange(""); // string vacío marca "incompleto" para la validación
  }

  const inputCls = "w-full rounded-[12px] border border-hair bg-white px-3 py-3.5 text-center text-[18px] font-semibold tnums text-ink focus:border-navy focus:outline-none";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1.4fr] items-center gap-2">
      <input
        type="text" inputMode="numeric" pattern="\d*" maxLength={2}
        aria-label="Día" placeholder="dd" autoComplete="bday-day"
        value={dd}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          setDd(v);
          if (v.length === 2) mmRef.current?.focus();
          emitIfComplete(v, mm, aaaa);
        }}
        className={inputCls}
      />
      <span aria-hidden="true" className="text-[16px] font-semibold text-slate2">/</span>
      <input
        ref={mmRef} type="text" inputMode="numeric" pattern="\d*" maxLength={2}
        aria-label="Mes" placeholder="mm" autoComplete="bday-month"
        value={mm}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          setMm(v);
          if (v.length === 2) aaaaRef.current?.focus();
          emitIfComplete(dd, v, aaaa);
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && !mm) {
            (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.previousElementSibling?.dispatchEvent(new Event("focus"));
          }
        }}
        className={inputCls}
      />
      <span aria-hidden="true" className="text-[16px] font-semibold text-slate2">/</span>
      <input
        ref={aaaaRef} type="text" inputMode="numeric" pattern="\d*" maxLength={4}
        aria-label="Año" placeholder="aaaa" autoComplete="bday-year"
        value={aaaa}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
          setAaaa(v);
          emitIfComplete(dd, mm, v);
        }}
        className={inputCls}
      />
    </div>
  );
}

function SaludStep({ form, set, setInsured, errors }: {
  form: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
  setInsured: (index: number, patch: Partial<AseguradoAdicional>) => void;
  errors: Partial<Record<keyof Form, string>>;
}) {
  return (
    <div>
      <h1 className="text-[24px] font-extrabold text-navy md:text-[28px]">Cuéntanos sobre ti</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate2">
        Necesitamos estos datos para calcular tu precio. Todo es confidencial y solo lo verá tu asesor.
      </p>
      <div className="mt-6 flex flex-col gap-5">
        <Field label="Fecha de nacimiento" error={errors.fechaNacimiento} hint="Escribe día, mes y año.">
          <DobInput
            value={form.fechaNacimiento}
            onChange={(v) => set("fechaNacimiento", v)}
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
        {form.aseguradosAdicionales.length > 0 && (
          <div className="rounded-[16px] border border-hair bg-white p-4">
            <p className="text-[15px] font-bold text-navy">Datos del resto de asegurados</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate2">
              El precio depende de la edad y el sexo de cada persona cubierta. Solo necesitamos eso de cada una.
            </p>
            <div className="mt-4 flex flex-col gap-5">
              {form.aseguradosAdicionales.map((a, i) => (
                <div key={i} className="border-t border-hair pt-4 first:border-t-0 first:pt-0">
                  <p className="mb-2 text-[13px] font-semibold text-ink">Asegurado {i + 2}</p>
                  <Field label="Fecha de nacimiento" hint="Día, mes y año.">
                    <DobInput value={a.fechaNacimiento} onChange={(v) => setInsured(i, { fechaNacimiento: v })} />
                  </Field>
                  <div className="mt-3">
                    <Field label="Sexo">
                      <div className="grid grid-cols-2 gap-3">
                        {(["hombre", "mujer"] as const).map((s) => (
                          <button
                            key={s} type="button" aria-pressed={a.sexo === s}
                            onClick={() => setInsured(i, { sexo: s })}
                            className={`rounded-[12px] border px-4 py-3.5 text-[15px] font-semibold capitalize transition-colors ${a.sexo === s ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            {errors.aseguradosAdicionales && (
              <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{errors.aseguradosAdicionales}</p>
            )}
          </div>
        )}
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

function ZonaStep({ form, set, errors }: {
  form: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
  errors: Partial<Record<keyof Form, string>>;
}) {
  return (
    <div>
      <h1 className="text-[24px] font-extrabold text-navy md:text-[28px]">¿Dónde vives?</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate2">
        Nos ayuda a ajustar tu comparativa a las aseguradoras disponibles en tu zona.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
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
      </div>
      <p className="mt-6 text-[13px] leading-relaxed text-slate2">
        Al continuar verás tu comparativa. Te pediremos nombre, teléfono y consentimientos justo antes de mostrarte los precios finales.
      </p>
    </div>
  );
}

/* ============================================================
   Sidebar — form independiente "Te llamamos gratis"
============================================================ */

function SidebarLlamadaForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dia, setDia] = useState<string>(DIAS_LLAMADA[0]);
  const [turno, setTurno] = useState<string>(TURNOS_LLAMADA[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [aceptaComercial, setAceptaComercial] = useState(false);
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
          aceptaPrivacidad: true, autorizaContacto: true, aceptaComercial,
          company: "",
          consent: { privacidadAt: now, contactoAt: now },
          utm: getAttribution(),
          turnstileToken,
          origen: "lp",
          landingSlug: slug,
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; errors?: Record<string, string[]>; error?: string } | null;
      if (res.ok && body?.ok) {
        saveCallResult({ nombre, diaLlamada: dia, turnoLlamada: turno, producto: "salud" });
        saveClientProfile({ nombre, telefono, diaLlamada: dia, turnoLlamada: turno });
        pushDataLayerEvent("generate_lead", { producto: "salud", form: "lp-tarificador-sidebar" });
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
      <PaidLlamadaLegalNotice
        idPrefix="tarificador-sidebar"
        aceptaComercial={aceptaComercial}
        onChangeAceptaComercial={setAceptaComercial}
      />
      <TurnstileWidget onToken={setTurnstileToken} />
      {error && <p role="alert" className="text-[12px] font-semibold text-brand-red">{error}</p>}
      <button type="submit" disabled={submitting || !canSend} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] bg-brand-red px-4 text-[15px] font-bold text-white hover:bg-brand-red-deep disabled:bg-slate2/40">
        {submitting && <Spinner width={16} height={16} />}
        {submitting ? "Enviando…" : "Quiero que me llamen"}
      </button>
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
