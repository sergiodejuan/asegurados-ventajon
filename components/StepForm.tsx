"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizePhone } from "@/lib/schema";
import { BRAND_NAME } from "@/lib/brand";
import { SALUD_CONFIG, VIDA_CONFIG, type FormData, type Step } from "@/lib/forms";
import { ArrowRight, ChevronLeft, Spinner } from "./icons";
import { DatePicker } from "./DatePicker";
import { saveQuote } from "@/lib/quote";

type FieldErrors = Partial<Record<string, string>>;
type SavedProgress = { stepIndex: number; data: FormData };

function progressKey(variant: string) {
  return `ventajon:progress:${variant}`;
}

// Recibe solo un identificador serializable; la config (con funciones showIf)
// se resuelve dentro del cliente para no cruzar el límite servidor→cliente.
export function StepForm({ variant }: { variant: "salud" | "vida" }) {
  const config = variant === "vida" ? VIDA_CONFIG : SALUD_CONFIG;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<FormData>({ seguroActualPeriodo: "mes", seguroActualServicios: [] });
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consentTimes, setConsentTimes] = useState<{ privacidadAt?: string; contactoAt?: string; comercialAt?: string }>({});
  const [referrer, setReferrer] = useState("");
  const [resumeData, setResumeData] = useState<SavedProgress | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);
  const ddRef = useRef<HTMLInputElement>(null);
  const mmRef = useRef<HTMLInputElement>(null);
  const aaaaRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (typeof document !== "undefined") setReferrer(document.referrer || ""); }, []);

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

  const utm = useMemo(() => ({
    source: searchParams.get("utm_source") ?? undefined,
    medium: searchParams.get("utm_medium") ?? undefined,
    campaign: searchParams.get("utm_campaign") ?? undefined,
    content: searchParams.get("utm_content") ?? undefined,
    term: searchParams.get("utm_term") ?? undefined,
  }), [searchParams]);

  const activeSteps = config.steps.filter((s) => !s.showIf || s.showIf(data));
  const total = activeSteps.length;
  const idx = Math.min(stepIndex, total - 1);
  const current = activeSteps[idx];

  useEffect(() => { topRef.current?.focus(); }, [idx]);

  const set = (patch: FormData) => setData((d) => ({ ...d, ...patch }));
  const next = () => { setErrors({}); setStepIndex((s) => Math.min(s + 1, total)); };
  const back = () => { setErrors({}); setSubmitError(null); setStepIndex((s) => Math.max(s - 1, 0)); };

  function toggleConsent(key: "privacidadAt" | "contactoAt" | "comercialAt", field: string, checked: boolean) {
    set({ [field]: checked });
    setConsentTimes((c) => ({ ...c, [key]: checked ? new Date().toISOString() : undefined }));
  }

  /* ------------------------------ Validaciones ----------------------------- */
  function validateCp(): boolean {
    if (!/^\d{5}$/.test(String(data.codigoPostal ?? ""))) { setErrors({ codigoPostal: "El código postal debe tener 5 dígitos." }); return false; }
    return true;
  }
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

  async function submit() {
    setSubmitError(null);
    const e: FieldErrors = {};
    if (!String(data.nombre ?? "").trim() || String(data.nombre).trim().length < 2) e.nombre = "Dinos tu nombre.";
    if (!/^[6-9]\d{8}$/.test(normalizePhone(String(data.telefono ?? "")))) e.telefono = "Introduce un móvil español válido (9 dígitos).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email ?? "").trim())) e.email = "Revisa tu correo electrónico.";
    if (!data.aceptaPrivacidad) e.aceptaPrivacidad = "Necesitamos que aceptes la política de privacidad.";
    if (!data.autorizaContacto) e.autorizaContacto = "Necesitamos tu autorización para poder llamarte.";
    if (Object.keys(e).length) {
      setErrors(e);
      const first = ["nombre", "telefono", "email", "aceptaPrivacidad", "autorizaContacto"].find((k) => e[k]);
      if (first) document.getElementById(`f-${first}`)?.focus();
      return;
    }

    const payload = {
      ...data,
      fechaNacimiento: `${data.dd ?? ""}/${data.mm ?? ""}/${data.aaaa ?? ""}`,
      seguroActualServicios: (data.seguroActualServicios as string[]) ?? [],
      company: "",
      consent: consentTimes,
      utm: { ...utm, referrer },
    };

    setSubmitting(true);
    try {
      const res = await fetch(config.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as { id?: string } | null;
        saveQuote({
          id: body?.id ?? `local-${Date.now()}`,
          producto: variant,
          createdAt: new Date().toISOString(),
          codigoPostal: String(data.codigoPostal ?? ""),
          numAsegurados: variant === "salud" ? Number(data.numAsegurados) || 1 : undefined,
          coberturaDental: variant === "salud" ? !!data.coberturaDental : undefined,
          fechaNacimiento: payload.fechaNacimiento,
          sexo: data.sexo as "hombre" | "mujer" | undefined,
          motivo: variant === "vida" ? String(data.motivo ?? "") : undefined,
          fumador: variant === "vida" ? !!data.fumador : undefined,
          inicio: variant === "salud" ? String(data.inicio ?? "") : undefined,
          nombre: String(data.nombre ?? ""),
          telefono: normalizePhone(String(data.telefono ?? "")),
          email: String(data.email ?? ""),
          consentAt: consentTimes,
        });
        try { sessionStorage.removeItem(progressKey(variant)); } catch { /* noop */ }
        router.push(`/comparativa?producto=${variant}`);
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
      case "cp":
        return (
          <Shell title={step.title} helper={step.helper}>
            <form onSubmit={(ev) => { ev.preventDefault(); if (validateCp()) next(); }}>
              <label htmlFor="f-codigoPostal" className="sr-only">Código postal</label>
              <input id="f-codigoPostal" name="postal-code" inputMode="numeric" autoComplete="postal-code" maxLength={5} spellCheck={false}
                placeholder="35001…" value={String(data.codigoPostal ?? "")}
                onChange={(ev) => set({ codigoPostal: ev.target.value.replace(/\D/g, "").slice(0, 5) })}
                aria-invalid={!!errors.codigoPostal} aria-describedby={errors.codigoPostal ? "err-cp" : undefined}
                className={`w-full rounded-card border bg-white px-5 py-4 text-[18px] tracking-wide tnums text-ink placeholder:text-slate2/60 ${errors.codigoPostal ? "border-brand-red" : "border-hair"}`} />
              <FieldError id="err-cp" msg={errors.codigoPostal} />
              <PrimaryButton disabled={String(data.codigoPostal ?? "").length !== 5}>Continuar</PrimaryButton>
            </form>
          </Shell>
        );
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
              <Field id="f-nombre" label="Nombre y apellidos" value={String(data.nombre ?? "")} onChange={(v) => set({ nombre: v })} autoComplete="name" error={errors.nombre} placeholder="María Pérez…" />
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
              {submitError && <p role="alert" aria-live="polite" className="mt-4 rounded-lg bg-brand-red/10 px-4 py-3 text-[14px] font-medium text-brand-red-deep">{submitError}</p>}
              <PrimaryButton loading={submitting}>{submitting ? "Enviando…" : "Ver precios"}</PrimaryButton>
              <p className="mt-3 text-center text-[12px] leading-relaxed text-slate2">Verás una comparativa orientativa al momento. Un asesor te confirma el precio final cuando elijas tu opción.</p>
            </form>
          </Shell>
        );
    }
  }

  const progress = (Math.min(idx + 1, total) / total) * 100;

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
          <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={idx + 1} aria-label={`Paso ${idx + 1} de ${total}`} className="h-1.5 w-full overflow-hidden rounded-full bg-hair">
            <div className="h-full rounded-full bg-brand-red transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] font-medium tnums text-slate2">Paso {idx + 1} de {total}</p>
        </div>
      </div>
      <div ref={topRef} tabIndex={-1} className="outline-none" />
      {current && <div key={current.key}>{renderStep(current)}</div>}
    </section>
  );
}

/* --------------------------- Piezas reutilizables -------------------------- */
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
