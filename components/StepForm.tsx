"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizePhone } from "@/lib/schema";
import { BRAND_NAME } from "@/lib/brand";
import { SALUD_CONFIG, VIDA_CONFIG, AUTO_CONFIG, DECESOS_CONFIG, type FormData, type Step } from "@/lib/forms";
import { ArrowRight, ChevronLeft, Spinner } from "./icons";
import { DatePicker } from "./DatePicker";
import { QuoteLoadingOverlay } from "./QuoteLoadingOverlay";
import { saveQuote } from "@/lib/quote";
import { addClientQuote, saveClientProfile } from "@/lib/clientArea";
import { getAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { ConsentNudgeModal } from "./ConsentNudgeModal";
import { ExitIntentModal } from "./ExitIntentModal";
import { TurnstileWidget } from "./TurnstileWidget";

type FieldErrors = Partial<Record<string, string>>;
type SavedProgress = { stepIndex: number; data: FormData };

function progressKey(variant: string) {
  return `ventajon:progress:${variant}`;
}

// Recibe solo un identificador serializable; la config (con funciones showIf)
// se resuelve dentro del cliente para no cruzar el límite servidor→cliente.
export function StepForm({ variant, onStepChange, origen }: { variant: "salud" | "vida" | "auto" | "decesos"; onStepChange?: (idx: number) => void; origen?: "asistente" | "seo-landing" }) {
  const config = variant === "vida" ? VIDA_CONFIG : variant === "auto" ? AUTO_CONFIG : variant === "decesos" ? DECESOS_CONFIG : SALUD_CONFIG;
  const router = useRouter();

  const [data, setData] = useState<FormData>({ seguroActualPeriodo: "mes", seguroActualServicios: [] });
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consentTimes, setConsentTimes] = useState<{ privacidadAt?: string; contactoAt?: string; comercialAt?: string }>({});
  const [resumeData, setResumeData] = useState<SavedProgress | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showConsentNudge, setShowConsentNudge] = useState(false);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentArmed, setExitIntentArmed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const doneRef = useRef(false);
  const pendingUrlRef = useRef<string | null>(null);

  const topRef = useRef<HTMLDivElement>(null);
  const ddRef = useRef<HTMLInputElement>(null);
  const mmRef = useRef<HTMLInputElement>(null);
  const aaaaRef = useRef<HTMLInputElement>(null);

  // Recuperación de abandono: si hay un cálculo a medias en esta sesión, se
  // ofrece continuar en vez de perderlo. No se toca `data`/`stepIndex` hasta
  // que el usuario decide, para no pisar el progreso guardado antes de tiempo.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(progressKey(variant));
      if (raw) {
        const saved = JSON.parse(raw) as SavedProgress;
        if (saved && typeof saved.stepIndex === "number" && saved.stepIndex > 0) setResumeData(saved);
      }
    } catch { /* sessionStorage no disponible */ }
    setResumeChecked(true);
  }, [variant]);

  useEffect(() => {
    if (!resumeChecked || resumeData) return;
    try {
      if (stepIndex > 0) sessionStorage.setItem(progressKey(variant), JSON.stringify({ stepIndex, data }));
      else sessionStorage.removeItem(progressKey(variant));
    } catch { /* sessionStorage no disponible */ }
  }, [stepIndex, data, resumeChecked, resumeData, variant]);

  function resumeProgress() {
    if (!resumeData) return;
    setData(resumeData.data);
    setStepIndex(resumeData.stepIndex);
    setResumeData(null);
  }
  function discardProgress() {
    try { sessionStorage.removeItem(progressKey(variant)); } catch { /* noop */ }
    setResumeData(null);
  }

  const activeSteps = config.steps.filter((s) => !s.showIf || s.showIf(data));
  const total = activeSteps.length;
  const idx = Math.min(stepIndex, total - 1);
  const current = activeSteps[idx];

  useEffect(() => { topRef.current?.focus(); }, [idx]);
  useEffect(() => { onStepChange?.(idx); }, [idx, onStepChange]);
  useEffect(() => { if (finalizing) doneRef.current = true; }, [finalizing]);

  // Exit-intent: en cuanto hay progreso real (idx > 0) se arma la detección
  // de abandono, una sola vez por sesión de pestaña. En escritorio, el ratón
  // saliendo por arriba de la ventana (hacia la barra de pestañas/cerrar);
  // en móvil, sin ratón, se usa el gesto de "atrás" — se atrapa UNA entrada
  // extra del historial, así que la primera vez que el usuario vuelve atrás
  // ve la oferta en vez de abandonar la página, y si insiste, la segunda vez
  // sale con normalidad.
  useEffect(() => {
    if (idx > 0 && !exitIntentArmed) setExitIntentArmed(true);
  }, [idx, exitIntentArmed]);

  useEffect(() => {
    if (!exitIntentArmed) return;
    try { if (sessionStorage.getItem("ventajon:exitintent:shown")) return; } catch { /* noop */ }

    function trigger() {
      if (doneRef.current) return;
      try { sessionStorage.setItem("ventajon:exitintent:shown", "1"); } catch { /* noop */ }
      setShowExitIntent(true);
    }
    function onMouseOut(e: MouseEvent) {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    }
    document.addEventListener("mouseout", onMouseOut);

    let poppedOnce = false;
    function onPopState() {
      if (poppedOnce) return;
      poppedOnce = true;
      window.history.pushState(null, "", window.location.href);
      trigger();
    }
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("popstate", onPopState);
    };
  }, [exitIntentArmed]);

  const set = (patch: FormData) => setData((d) => ({ ...d, ...patch }));
  const next = () => { setErrors({}); setStepIndex((s) => Math.min(s + 1, total)); };
  const back = () => { setErrors({}); setSubmitError(null); setStepIndex((s) => Math.max(s - 1, 0)); };

  type ExtraInsured = { dd?: string; mm?: string; aaaa?: string; sexo?: "hombre" | "mujer" };
  function updateExtraInsured(i: number, patch: Partial<ExtraInsured>) {
    const arr = [...(((data.aseguradosExtra as ExtraInsured[]) ?? []))];
    arr[i] = { ...(arr[i] ?? {}), ...patch };
    set({ aseguradosExtra: arr });
  }

  function toggleConsent(key: "privacidadAt" | "contactoAt" | "comercialAt", field: string, checked: boolean) {
    set({ [field]: checked });
    setConsentTimes((c) => ({ ...c, [key]: checked ? new Date().toISOString() : undefined }));
  }

  /* ------------------------------ Validaciones ----------------------------- */
  function validateDob(): boolean {
    const e: FieldErrors = {};
    const dd = String(data.dd ?? ""), mm = String(data.mm ?? ""), aaaa = String(data.aaaa ?? "");
    const dob = `${dd}/${mm}/${aaaa}`;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) e.fechaNacimiento = "Completa la fecha (dd/mm/aaaa).";
    else {
      const y = +aaaa, m = +mm, d = +dd, year = new Date().getFullYear();
      if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1920 || y > year - 17) e.fechaNacimiento = "Revisa la fecha de nacimiento.";
    }
    if (!data.sexo) e.sexo = "Selecciona una opción.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateIdentificacion(): boolean {
    const e: FieldErrors = {};
    if (!data.documentoTipo) e.documentoTipo = "Selecciona el tipo de documento.";
    const doc = String(data.documento ?? "").trim().toUpperCase();
    if (!/^\d{8}[A-Z]$/.test(doc) && !/^[XYZ]\d{7}[A-Z]$/.test(doc)) e.documento = "Revisa el DNI o NIE (formato no válido).";
    if (!/^\d{5}$/.test(String(data.codigoPostalReal ?? ""))) e.codigoPostalReal = "El código postal debe tener 5 dígitos.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    setSubmitError(null);
    const e: FieldErrors = {};
    if (!String(data.nombre ?? "").trim() || String(data.nombre).trim().length < 2) e.nombre = "Dinos tu nombre.";
    if (variant === "salud" && (!String(data.apellido1 ?? "").trim() || String(data.apellido1).trim().length < 2)) e.apellido1 = "Dinos tu primer apellido.";
    if (!/^[6-9]\d{8}$/.test(normalizePhone(String(data.telefono ?? "")))) e.telefono = "Introduce un móvil español válido (9 dígitos).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email ?? "").trim())) e.email = "Revisa tu correo electrónico.";
    if (!data.aceptaPrivacidad) e.aceptaPrivacidad = "Necesitamos que aceptes la política de privacidad.";
    if (!data.autorizaContacto) e.autorizaContacto = "Necesitamos tu autorización para poder llamarte.";
    if (Object.keys(e).length) {
      setErrors(e);
      // Si es el único motivo por el que no se puede enviar, en vez de solo
      // el error en rojo explicamos brevemente por qué conviene marcarlo
      // (nunca bloquea el envío: se puede cerrar y mandar sin marcarlo).
      if (Object.keys(e).length === 1 && e.autorizaContacto) { setShowConsentNudge(true); return; }
      const first = ["nombre", "apellido1", "telefono", "email", "aceptaPrivacidad", "autorizaContacto"].find((k) => e[k]);
      if (first) document.getElementById(`f-${first}`)?.focus();
      return;
    }

    const payload = {
      ...data,
      fechaNacimiento: `${data.dd ?? ""}/${data.mm ?? ""}/${data.aaaa ?? ""}`,
      seguroActualServicios: (data.seguroActualServicios as string[]) ?? [],
      aseguradosAdicionales: ((data.aseguradosExtra as ExtraInsured[]) ?? [])
        .filter((a) => a.dd && a.mm && a.aaaa && a.sexo)
        .map((a) => ({ fechaNacimiento: `${a.dd}/${a.mm}/${a.aaaa}`, sexo: a.sexo })),
      company: "",
      consent: consentTimes,
      utm: getAttribution(),
      turnstileToken,
      ...(origen ? { origen } : {}),
    };

    setSubmitting(true);
    try {
      const res = await fetch(config.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as { id?: string } | null;
        const quoteProfile = {
          id: body?.id ?? `local-${Date.now()}`,
          producto: variant,
          createdAt: new Date().toISOString(),
          codigoPostal: String(data.codigoPostal ?? ""),
          numAsegurados: variant === "salud" ? Number(data.numAsegurados) || 1
            : variant === "decesos" ? Number(data.numAsegurados) || 1 : undefined,
          coberturaDental: variant === "salud" ? !!data.coberturaDental : undefined,
          fechaNacimiento: payload.fechaNacimiento,
          sexo: data.sexo as "hombre" | "mujer" | undefined,
          motivo: variant === "vida" ? String(data.motivo ?? "") : undefined,
          fumador: variant === "vida" ? !!data.fumador : undefined,
          paraQuien: variant === "decesos" ? String(data.paraQuien ?? "") : undefined,
          inicio: variant === "salud" ? String(data.inicio ?? "") : undefined,
          tipoVehiculo: variant === "auto" ? String(data.tipoVehiculo ?? "") : undefined,
          matricula: variant === "auto" ? String(data.matricula ?? "") : undefined,
          marcaVehiculo: variant === "auto" ? String(data.marcaVehiculo ?? "") : undefined,
          modeloVehiculo: variant === "auto" ? String(data.modeloVehiculo ?? "") : undefined,
          anioVehiculo: variant === "auto" ? String(data.anioVehiculo ?? "") : undefined,
          usoVehiculo: variant === "auto" ? String(data.usoVehiculo ?? "") : undefined,
          antiguedadCarnet: variant === "auto" ? String(data.antiguedadCarnet ?? "") : undefined,
          coberturaDeseada: variant === "auto" ? String(data.coberturaDeseada ?? "") : undefined,
          nombre: String(data.nombre ?? ""),
          telefono: normalizePhone(String(data.telefono ?? "")),
          email: String(data.email ?? ""),
          consentAt: consentTimes,
        };
        saveQuote(quoteProfile);
        addClientQuote(quoteProfile);
        saveClientProfile({ nombre: quoteProfile.nombre, telefono: quoteProfile.telefono, email: quoteProfile.email });
        try { sessionStorage.removeItem(progressKey(variant)); } catch { /* noop */ }
        pushDataLayerEvent("generate_lead", { producto: variant, form: "tarificador" });
        pendingUrlRef.current = `/comparativa?producto=${variant}`;
        setFinalizing(true);
        return;
      }
      const body = (await res.json().catch(() => null)) as { errors?: Record<string, string[]> } | null;
      if (body?.errors) {
        const mapped: FieldErrors = {};
        for (const [k, v] of Object.entries(body.errors)) if (v && v[0]) mapped[k] = v[0];
        setErrors(mapped);
      } else setSubmitError("No hemos podido enviar tus datos. Inténtalo de nuevo.");
    } catch { setSubmitError("Parece que hay un problema de conexión. Inténtalo de nuevo."); }
    finally { setSubmitting(false); }
  }

  /* ------------------------------- Render ---------------------------------- */
  function renderStep(step: Step) {
    switch (step.type) {
      case "choice": {
        const selectedOption = step.options.find((o) => o.value === data[step.field]);
        const showDate = !!selectedOption?.requiresDate;
        return (
          <Shell title={step.title} helper={step.helper}>
            <div className="flex flex-col gap-3">
              {step.options.map((o) => (
                <OptionCard key={o.value} selected={data[step.field] === o.value}
                  onClick={() => { set({ [step.field]: o.value }); if (!o.requiresDate) next(); }}>
                  {o.label}
                </OptionCard>
              ))}
            </div>
            {showDate && (
              <div className="mt-4 motion-safe:animate-fade-up">
                <DatePicker
                  value={data.fechaInicioPersonalizada as string | undefined}
                  minDate={new Date()}
                  onChange={(iso) => set({ fechaInicioPersonalizada: iso })}
                />
                <button
                  type="button"
                  disabled={!data.fechaInicioPersonalizada}
                  onClick={next}
                  className="mt-4 flex w-full items-center justify-center rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:cursor-not-allowed disabled:bg-slate2/40"
                >
                  Continuar
                </button>
              </div>
            )}
          </Shell>
        );
      }
      case "yesno":
        return (
          <Shell title={step.title} helper={step.helper}>
            <YesNo value={data[step.field] as boolean | undefined} onSelect={(v) => { set({ [step.field]: v }); next(); }} />
          </Shell>
        );
      case "numbergrid":
        return (
          <Shell title={step.title} helper={step.helper}>
            <div role="group" aria-label={step.title} className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" aria-label={`${n} ${n === 1 ? "persona" : "personas"}`} aria-pressed={data[step.field] === n}
                  onClick={() => { set({ [step.field]: n }); next(); }}
                  className={`aspect-square rounded-card border text-[22px] font-display font-bold tnums transition-colors ${data[step.field] === n ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}>
                  {n}
                </button>
              ))}
            </div>
          </Shell>
        );
      case "matricula": {
        const matricula = String(data.matricula ?? "");
        return (
          <Shell title={step.title} helper={step.helper}>
            <form onSubmit={(ev) => { ev.preventDefault(); if (matricula.length >= 4) { set({ matriculaDesconocida: false }); next(); } }}>
              <label htmlFor="f-matricula" className="sr-only">Matrícula</label>
              <div className="flex overflow-hidden rounded-card border border-hair bg-white focus-within:border-navy/40">
                <span aria-hidden="true" className="flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 bg-[#003399] py-2 text-white">
                  <span className="text-[8px]">★★★</span>
                  <span className="text-[11px] font-extrabold">E</span>
                </span>
                <input id="f-matricula" name="matricula" autoComplete="off" spellCheck={false} maxLength={10}
                  placeholder="1234ABC…" value={matricula}
                  onChange={(ev) => set({ matricula: ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) })}
                  className="w-full min-w-0 bg-transparent px-4 py-4 text-[18px] font-bold uppercase tracking-widest text-ink placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-slate2/60" />
              </div>
              <PrimaryButton disabled={matricula.length < 4}>Continuar</PrimaryButton>
              <button
                type="button"
                onClick={() => { set({ matricula: "", matriculaDesconocida: true }); next(); }}
                className="mt-3 w-full text-center text-[13px] font-semibold text-navy underline underline-offset-2"
              >
                No la tengo a mano
              </button>
            </form>
          </Shell>
        );
      }
      case "vehiculo":
        return (
          <Shell title={step.title} helper={step.helper}>
            <form onSubmit={(ev) => { ev.preventDefault(); next(); }}>
              <Field id="f-marcaVehiculo" label="Marca" value={String(data.marcaVehiculo ?? "")} onChange={(v) => set({ marcaVehiculo: v })} placeholder="Volkswagen…" />
              <Field id="f-modeloVehiculo" label="Modelo" value={String(data.modeloVehiculo ?? "")} onChange={(v) => set({ modeloVehiculo: v })} placeholder="Golf…" />
              <Field id="f-anioVehiculo" label="Año de matriculación" type="text" inputMode="numeric" value={String(data.anioVehiculo ?? "")}
                onChange={(v) => set({ anioVehiculo: v.replace(/\D/g, "").slice(0, 4) })} placeholder="2018…" />
              <PrimaryButton disabled={!String(data.marcaVehiculo ?? "").trim() || !String(data.modeloVehiculo ?? "").trim()}>Continuar</PrimaryButton>
            </form>
          </Shell>
        );
      case "choice2":
        return (
          <Shell title={step.title} helper={step.helper}>
            <form onSubmit={(ev) => { ev.preventDefault(); if (data[step.groupA.field] && data[step.groupB.field]) next(); }}>
              <ChoiceGroup label={step.groupA.label} field={step.groupA.field} options={step.groupA.options} value={data[step.groupA.field]} onSelect={(v) => set({ [step.groupA.field]: v })} />
              <div className="mt-5">
                <ChoiceGroup label={step.groupB.label} field={step.groupB.field} options={step.groupB.options} value={data[step.groupB.field]} onSelect={(v) => set({ [step.groupB.field]: v })} />
              </div>
              <PrimaryButton disabled={!data[step.groupA.field] || !data[step.groupB.field]}>Continuar</PrimaryButton>
            </form>
          </Shell>
        );
      case "identificacion":
        return (
          <Shell title={step.title} helper={step.helper}>
            <form onSubmit={(ev) => { ev.preventDefault(); if (validateIdentificacion()) next(); }}>
              <fieldset>
                <legend className="mb-2 text-[14px] font-semibold text-ink">Tipo de documento</legend>
                <div className="flex gap-3">
                  {(["Dni", "Nie"] as const).map((t) => (
                    <button key={t} type="button" aria-pressed={data.documentoTipo === t} onClick={() => set({ documentoTipo: t })}
                      className={`flex-1 rounded-card border px-4 py-3.5 text-[15px] font-semibold uppercase transition-colors ${data.documentoTipo === t ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <FieldError id="err-documentoTipo" msg={errors.documentoTipo} />
              </fieldset>
              <div className="mt-4">
                <Field id="f-documento" label="Número de documento" value={String(data.documento ?? "")}
                  onChange={(v) => set({ documento: v.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 9) })}
                  autoComplete="off" error={errors.documento} placeholder="12345678A…" />
              </div>
              <div className="mt-4">
                <Field id="f-codigoPostalReal" label="Código postal" type="text" inputMode="numeric" value={String(data.codigoPostalReal ?? "")}
                  onChange={(v) => set({ codigoPostalReal: v.replace(/\D/g, "").slice(0, 5) })}
                  autoComplete="postal-code" error={errors.codigoPostalReal} placeholder="35001…" />
              </div>
              <PrimaryButton>Continuar</PrimaryButton>
            </form>
          </Shell>
        );
      case "aseguradosExtra": {
        const count = Math.max(0, (Number(data[step.countField]) || 1) - 1);
        const arr = (data.aseguradosExtra as ExtraInsured[]) ?? [];
        const complete = Array.from({ length: count }, (_, i) => arr[i]).every(
          (a) => !!a?.dd && a.dd.length === 2 && !!a?.mm && a.mm.length === 2 && !!a?.aaaa && a.aaaa.length === 4 && (a?.sexo === "hombre" || a?.sexo === "mujer")
        );
        return (
          <Shell title={step.title} helper={step.helper}>
            <form onSubmit={(ev) => { ev.preventDefault(); if (complete) next(); }}>
              <div className="flex flex-col gap-4">
                {Array.from({ length: count }, (_, i) => i).map((i) => {
                  const a = arr[i] ?? {};
                  return (
                    <div key={i} className="rounded-card border border-hair bg-mist/40 p-4">
                      <p className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-navy">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy text-[12px] font-bold text-white">{i + 2}</span>
                        Asegurado {i + 2}
                      </p>
                      <fieldset>
                        <legend className="sr-only">Fecha de nacimiento del asegurado {i + 2}</legend>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.5fr)] items-center gap-1 rounded-card border border-hair bg-white px-3 py-1">
                          <Dob id={`f-extra-${i}-dd`} label="Día" placeholder="dd" max={2} value={String(a.dd ?? "")} onChange={(v) => updateExtraInsured(i, { dd: v })} />
                          <span aria-hidden="true" className="px-0.5 text-slate2">/</span>
                          <Dob id={`f-extra-${i}-mm`} label="Mes" placeholder="mm" max={2} value={String(a.mm ?? "")} onChange={(v) => updateExtraInsured(i, { mm: v })} />
                          <span aria-hidden="true" className="px-0.5 text-slate2">/</span>
                          <Dob id={`f-extra-${i}-aaaa`} label="Año" placeholder="aaaa" max={4} value={String(a.aaaa ?? "")} onChange={(v) => updateExtraInsured(i, { aaaa: v })} />
                        </div>
                      </fieldset>
                      <div className="mt-2 flex gap-2">
                        {(["hombre", "mujer"] as const).map((s) => (
                          <button key={s} type="button" aria-pressed={a.sexo === s} onClick={() => updateExtraInsured(i, { sexo: s })}
                            className={`flex-1 rounded-card border px-3 py-2.5 text-[14px] font-semibold capitalize transition-colors ${a.sexo === s ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <PrimaryButton disabled={!complete}>Continuar</PrimaryButton>
            </form>
          </Shell>
        );
      }
      case "dobsex":
        return (
          <Shell title={step.title} helper={step.helper}>
            <form onSubmit={(ev) => { ev.preventDefault(); if (validateDob()) next(); }}>
              <fieldset>
                <legend className="mb-2 text-[14px] font-semibold text-ink">Fecha de nacimiento</legend>
                <div className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.5fr)] items-center gap-1 rounded-card border bg-white px-3 py-1 ${errors.fechaNacimiento ? "border-brand-red" : "border-hair"}`}>
                  <Dob ref={ddRef} id="f-dd" label="Día" placeholder="dd" max={2} value={String(data.dd ?? "")} onChange={(v) => { set({ dd: v }); if (v.length === 2) mmRef.current?.focus(); }} />
                  <span aria-hidden="true" className="px-0.5 text-slate2">/</span>
                  <Dob ref={mmRef} id="f-mm" label="Mes" placeholder="mm" max={2} value={String(data.mm ?? "")} onChange={(v) => { set({ mm: v }); if (v.length === 2) aaaaRef.current?.focus(); }} />
                  <span aria-hidden="true" className="px-0.5 text-slate2">/</span>
                  <Dob ref={aaaaRef} id="f-aaaa" label="Año" placeholder="aaaa" max={4} value={String(data.aaaa ?? "")} onChange={(v) => set({ aaaa: v })} />
                </div>
                <p className="mt-1.5 text-[13px] text-slate2">Escríbela tal cual, p.ej. 13/07/1970.</p>
                <FieldError id="err-dob" msg={errors.fechaNacimiento} />
              </fieldset>
              <fieldset className="mt-5">
                <legend className="mb-2 text-[14px] font-semibold text-ink">Sexo</legend>
                <div className="flex gap-3">
                  {(["hombre", "mujer"] as const).map((s) => (
                    <button key={s} type="button" aria-pressed={data.sexo === s} onClick={() => set({ sexo: s })}
                      className={`flex-1 rounded-card border px-4 py-3.5 text-[15px] font-semibold capitalize transition-colors ${data.sexo === s ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <FieldError id="err-sexo" msg={errors.sexo} />
              </fieldset>
              <PrimaryButton disabled={!String(data.dd ?? "") || !String(data.mm ?? "") || String(data.aaaa ?? "").length < 4 || !data.sexo}>Continuar</PrimaryButton>
            </form>
          </Shell>
        );
      case "seguroActual":
        return (
          <Shell title={step.title} helper={step.helper}>
            <form onSubmit={(ev) => { ev.preventDefault(); next(); }}>
              <label htmlFor="f-importe" className="mb-1.5 block text-[14px] font-semibold text-ink">¿Cuánto pagas ahora?</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input id="f-importe" inputMode="decimal" placeholder="45" value={String(data.seguroActualImporte ?? "")}
                    onChange={(ev) => set({ seguroActualImporte: ev.target.value.replace(/[^\d.,]/g, "").replace(",", ".").slice(0, 8) })}
                    className="w-full rounded-card border border-hair bg-white py-3.5 pl-4 pr-9 text-[16px] tnums text-ink placeholder:text-slate2/60" />
                  <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate2">€</span>
                </div>
                <div className="flex overflow-hidden rounded-card border border-hair">
                  {(["mes", "año"] as const).map((p) => (
                    <button key={p} type="button" aria-pressed={(data.seguroActualPeriodo ?? "mes") === p} onClick={() => set({ seguroActualPeriodo: p })}
                      className={`px-4 text-[14px] font-semibold capitalize transition-colors ${(data.seguroActualPeriodo ?? "mes") === p ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-5 mb-2 text-[14px] font-semibold text-ink">¿Qué servicios incluye?</p>
              <div className="flex flex-wrap gap-2">
                {step.servicios.map((s) => {
                  const arr = (data.seguroActualServicios as string[]) ?? [];
                  const on = arr.includes(s);
                  return (
                    <button key={s} type="button" aria-pressed={on}
                      onClick={() => set({ seguroActualServicios: on ? arr.filter((x) => x !== s) : [...arr, s] })}
                      className={`rounded-pill border px-3.5 py-2 text-[14px] font-medium transition-colors ${on ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
              <PrimaryButton>Continuar</PrimaryButton>
            </form>
          </Shell>
        );
      case "contact":
        return (
          <Shell title={step.title} helper="Déjanos tus datos para ver tu comparativa de precios al momento. Un asesor te confirma tu propuesta cuando elijas tu opción.">
            <form noValidate onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="f-company">No rellenar</label>
                <input id="f-company" tabIndex={-1} autoComplete="off" onChange={() => {}} />
              </div>
              {/* El apellido separado solo se pide en salud, de cara a Codescopic (ver
                  lib/schema.ts); el resto de tarificadores sigue pidiendo el nombre
                  completo en un único campo, sin cambiar su formato de datos. */}
              <Field id="f-nombre" label={variant === "salud" ? "Nombre" : "Nombre y apellidos"} value={String(data.nombre ?? "")} onChange={(v) => set({ nombre: v })} autoComplete={variant === "salud" ? "given-name" : "name"} error={errors.nombre} placeholder="María…" />
              {variant === "salud" && (
                <>
                  <Field id="f-apellido1" label="Primer apellido" value={String(data.apellido1 ?? "")} onChange={(v) => set({ apellido1: v })} autoComplete="family-name" error={errors.apellido1} placeholder="Pérez…" />
                  <Field id="f-apellido2" label="Segundo apellido (opcional)" value={String(data.apellido2 ?? "")} onChange={(v) => set({ apellido2: v })} autoComplete="additional-name" placeholder="García…" />
                </>
              )}
              <Field id="f-telefono" label="Teléfono móvil" type="tel" inputMode="tel" value={String(data.telefono ?? "")} onChange={(v) => set({ telefono: v })} autoComplete="tel" error={errors.telefono} placeholder="600 000 000…" />
              <Field id="f-email" label="Correo electrónico" type="email" inputMode="email" value={String(data.email ?? "")} onChange={(v) => set({ email: v })} autoComplete="email" spellCheck={false} autoCapitalize="none" error={errors.email} placeholder="maria@correo.com…" />
              <div className="mt-5 flex flex-col gap-3">
                <Consent id="f-aceptaPrivacidad" checked={!!data.aceptaPrivacidad} onChange={(v) => toggleConsent("privacidadAt", "aceptaPrivacidad", v)} error={errors.aceptaPrivacidad}>
                  He leído y acepto la <a href="/legal" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">política de privacidad</a> y las <a href="/legal" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">condiciones de uso</a>.
                </Consent>
                <Consent id="f-autorizaContacto" checked={!!data.autorizaContacto} onChange={(v) => toggleConsent("contactoAt", "autorizaContacto", v)} error={errors.autorizaContacto}>
                  Autorizo a {BRAND_NAME} a contactarme por teléfono o WhatsApp para ayudarme a elegir mi seguro.
                </Consent>
                <Consent id="f-aceptaComercial" checked={!!data.aceptaComercial} onChange={(v) => toggleConsent("comercialAt", "aceptaComercial", v)}>
                  Quiero recibir consejos y novedades de {BRAND_NAME} (opcional).
                </Consent>
              </div>
              <TurnstileWidget onToken={setTurnstileToken} />
              {submitError && <p role="alert" aria-live="polite" className="mt-4 rounded-lg bg-brand-red/10 px-4 py-3 text-[14px] font-medium text-brand-red-deep">{submitError}</p>}
              <PrimaryButton loading={submitting}>{submitting ? "Enviando…" : "Ver precios"}</PrimaryButton>
              <p className="mt-3 text-center text-[12px] leading-relaxed text-slate2">Verás una comparativa orientativa al momento. Un asesor te confirma el precio final cuando elijas tu opción.</p>
            </form>
          </Shell>
        );
    }
  }

  const currentPhase = current?.phase ?? 0;
  const phaseSteps = activeSteps.filter((s) => s.phase === currentPhase);
  const idxInPhase = activeSteps.slice(0, idx + 1).filter((s) => s.phase === currentPhase).length;
  const progressInPhase = phaseSteps.length > 0 ? idxInPhase / phaseSteps.length : 1;

  if (finalizing) {
    const firstName = String(data.nombre ?? "").trim().split(/\s+/)[0] || undefined;
    return (
      <QuoteLoadingOverlay
        name={firstName}
        onDone={() => { if (pendingUrlRef.current) router.push(pendingUrlRef.current); }}
      />
    );
  }

  if (resumeChecked && resumeData) {
    return (
      <section aria-label="Tarificador" className="rounded-[24px] border border-hair bg-white p-5 shadow-card sm:p-6">
        <div className="motion-safe:animate-fade-up">
          <h2 className="text-[22px] font-bold leading-snug text-navy">¿Sigues ahí?</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-slate2">
            Tienes un cálculo empezado. Puedes continuar donde lo dejaste o empezar de nuevo.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={resumeProgress}
              className="flex-1 rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
            >
              Continuar donde lo dejé
            </button>
            <button
              type="button"
              onClick={discardProgress}
              className="flex-1 rounded-card border border-hair px-5 py-4 text-[16px] font-semibold text-navy transition-colors hover:bg-mist"
            >
              Empezar de nuevo
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Tarificador" className="rounded-[24px] border border-hair bg-white p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        {idx > 0 ? (
          <button type="button" onClick={back} aria-label="Volver al paso anterior" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-navy transition-colors hover:bg-mist">
            <ChevronLeft />
          </button>
        ) : <span aria-hidden="true" className="h-9 w-9 shrink-0" />}
        <div className="min-w-0 flex-1">
          <PhaseStepper labels={config.phaseLabels} currentPhase={currentPhase} progressInPhase={progressInPhase} />
        </div>
      </div>
      {/* Ancla de accesibilidad: mueve el foco al inicio del paso nuevo para
          lectores de pantalla. Sin contenido visible, así que se anula el
          anillo de foco global (si no, se ve como una línea azul suelta). */}
      <div ref={topRef} tabIndex={-1} className="outline-none focus:ring-0 focus-visible:ring-0" style={{ boxShadow: "none" }} />
      {current && <div key={current.key}>{renderStep(current)}</div>}
      <ConsentNudgeModal
        open={showConsentNudge}
        onClose={() => setShowConsentNudge(false)}
        onAccept={() => {
          set({ autorizaContacto: true });
          setConsentTimes((c) => ({ ...c, contactoAt: new Date().toISOString() }));
          setErrors({});
          setShowConsentNudge(false);
        }}
      />
      <ExitIntentModal
        open={showExitIntent}
        onClose={() => setShowExitIntent(false)}
        nombre={String(data.nombre ?? "")}
        telefono={String(data.telefono ?? "")}
        codigoPostal={String(data.codigoPostal ?? "")}
        producto={variant}
      />
    </section>
  );
}

/* --------------------------- Piezas reutilizables -------------------------- */
// Indicador de avance por fases con nombre (p.ej. "Tu vehículo" → "Tu seguro"
// → "Tu precio"), en vez de un "Paso X de Y": orienta sin generar la fricción
// de un contador que se ve largo desde el primer paso (ver nota en forms.ts).
function PhaseStepper({ labels, currentPhase, progressInPhase }: { labels: string[]; currentPhase: number; progressInPhase: number }) {
  const n = labels.length;
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={n}
      aria-valuenow={currentPhase + 1}
      aria-label={`Fase ${currentPhase + 1} de ${n}: ${labels[currentPhase]}`}
    >
      <div className="flex gap-1">
        {labels.map((label, i) => (
          <p
            key={label}
            className={`flex-1 truncate text-[12px] font-semibold tnums ${i === 0 ? "text-left" : i === n - 1 ? "text-right" : "text-center"} ${i === currentPhase ? "text-ink" : "text-slate2"}`}
          >
            {label}
          </p>
        ))}
      </div>
      <div className="mt-1.5 flex items-center">
        {labels.map((_, i) => (
          <div key={i} className={`flex items-center ${i === n - 1 ? "shrink-0" : "flex-1"}`}>
            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-300 ${i <= currentPhase ? "bg-brand-red" : "bg-hair"}`} />
            {i < n - 1 && (
              <span aria-hidden="true" className="mx-1 h-[3px] flex-1 overflow-hidden rounded-full bg-hair">
                <span
                  className="block h-full rounded-full bg-brand-red transition-[width] duration-300 ease-out"
                  style={{ width: `${i < currentPhase ? 100 : i === currentPhase ? progressInPhase * 100 : 0}%` }}
                />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function Shell({ title, helper, children }: { title: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="motion-safe:animate-fade-up">
      <h2 className="text-[22px] font-bold leading-snug text-navy">{title}</h2>
      {helper && <p className="mt-1.5 text-[14px] leading-relaxed text-slate2">{helper}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}
function OptionCard({ onClick, children, selected }: { onClick: () => void; children: React.ReactNode; selected?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={`flex w-full items-center justify-between rounded-card border px-5 py-4 text-left text-[16px] font-medium transition-colors ${selected ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}>
      <span>{children}</span>
      <ArrowRight className={selected ? "text-white" : "text-brand-red"} />
    </button>
  );
}
// Un grupo de opciones de una sola respuesta, compacto para poder mostrar
// dos grupos en la misma pantalla (ver el paso "choice2"). Misma lógica de
// selección que OptionCard, con menos altura por opción.
function ChoiceGroup({ label, field, options, value, onSelect }: {
  label: string; field: string; options: { value: string; label: string }[]; value: unknown; onSelect: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[14px] font-semibold text-ink">{label}</legend>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <button
            key={`${field}-${o.value}`} type="button" aria-pressed={value === o.value}
            onClick={() => onSelect(o.value)}
            className={`rounded-card border px-4 py-3 text-left text-[14px] font-medium transition-colors ${value === o.value ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
function YesNo({ onSelect, value }: { onSelect: (v: boolean) => void; value?: boolean }) {
  const opt = (v: boolean, label: string) => (
    <button type="button" onClick={() => onSelect(v)} aria-pressed={value === v}
      className={`flex-1 rounded-card border px-4 py-4 text-[16px] font-semibold transition-colors ${value === v ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}>
      {label}
    </button>
  );
  return <div className="flex gap-3">{opt(true, "Sí")}{opt(false, "No")}</div>;
}
function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return <p id={id} role="alert" className="mt-1.5 text-[13px] font-medium text-brand-red">{msg}</p>;
}
function PrimaryButton({ children, disabled, loading }: { children: React.ReactNode; disabled?: boolean; loading?: boolean }) {
  return (
    <button type="submit" disabled={disabled || loading} aria-busy={loading || undefined}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:cursor-not-allowed disabled:bg-slate2/40">
      {loading && <Spinner />}{children}
    </button>
  );
}
function Field({ id, label, value, onChange, error, type = "text", inputMode, autoComplete, placeholder, spellCheck, autoCapitalize }: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: string; type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email"; autoComplete?: string; placeholder?: string; spellCheck?: boolean; autoCapitalize?: string;
}) {
  const errId = `${id}-err`;
  return (
    <div className="mt-4 first:mt-0">
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-semibold text-ink">{label}</label>
      <input id={id} name={autoComplete} type={type} inputMode={inputMode} autoComplete={autoComplete} placeholder={placeholder}
        spellCheck={spellCheck} autoCapitalize={autoCapitalize} value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error} aria-describedby={error ? errId : undefined}
        className={`w-full rounded-card border bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-slate2/60 ${error ? "border-brand-red" : "border-hair"}`} />
      <FieldError id={errId} msg={error} />
    </div>
  );
}
function Consent({ id, checked, onChange, error, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; error?: string; children: React.ReactNode }) {
  const errId = `${id}-err`;
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={!!error} aria-describedby={error ? errId : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy" />
        <span className="text-[13px] leading-relaxed text-slate2">{children}</span>
      </label>
      <FieldError id={errId} msg={error} />
    </div>
  );
}
const Dob = forwardRef<HTMLInputElement, { id: string; label: string; placeholder: string; max: number; value: string; onChange: (v: string) => void }>(
  function Dob({ id, label, placeholder, max, value, onChange }, ref) {
    return (
      <>
        <label htmlFor={id} className="sr-only">{label}</label>
        <input ref={ref} id={id} type="text" inputMode="numeric" autoComplete="off" placeholder={placeholder} maxLength={max} size={max} value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, max))}
          className="w-full min-w-0 rounded-lg bg-transparent px-1 py-2.5 text-center text-[18px] tnums text-ink placeholder:text-slate2/50" />
      </>
    );
  }
);
