"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StepForm } from "@/components/StepForm";
import { callRequestSchema } from "@/lib/schema";
import { BRAND_NAME } from "@/lib/brand";
import { getAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { Close, IconByName, Spinner, ChevronLeft } from "@/components/icons";
import {
  isAssistantAllowed,
  getAssistantContext,
  DECESOS_FLOW,
  HOGAR_FLOW,
  DUDA_FLOW,
  summarizeAnswers,
  type MiniFlowQuestion,
  type AssistantProducto,
} from "@/lib/assistantConfig";

type Intent = "salud" | "vida" | "auto" | "decesos" | "hogar" | "llamada" | "duda";
type Stage = "menu" | "tarificador" | "miniflow" | "contact" | "done";

const MENU_ITEMS: { intent: Intent; label: string; icon: string }[] = [
  { intent: "salud", label: "Seguro de salud", icon: "shield" },
  { intent: "vida", label: "Seguro de vida", icon: "life" },
  { intent: "auto", label: "Seguro de auto", icon: "car" },
  { intent: "decesos", label: "Seguro de decesos", icon: "flower" },
  { intent: "hogar", label: "Seguro de hogar", icon: "home" },
  { intent: "llamada", label: "Quiero que me llamen", icon: "compare" },
  { intent: "duda", label: "Tengo una duda", icon: "doc" },
];

const LLAMADA_PRODUCTO_OPTIONS = [
  { label: "Salud", value: "salud" },
  { label: "Vida", value: "vida" },
  { label: "Decesos", value: "decesos" },
  { label: "Hogar", value: "hogar" },
  { label: "Auto", value: "auto" },
];

const MINIFLOWS: Partial<Record<Intent, MiniFlowQuestion[]>> = {
  decesos: DECESOS_FLOW,
  hogar: HOGAR_FLOW,
  duda: DUDA_FLOW,
};

const PRODUCTO_LABELS: Record<Intent, string> = {
  salud: "Seguro de salud",
  vida: "Seguro de vida",
  auto: "Seguro de auto",
  decesos: "Seguro de decesos",
  hogar: "Seguro de hogar",
  llamada: "Quiero que me llamen",
  duda: "Consulta general",
};

function orderedMenu(suggested?: AssistantProducto) {
  if (!suggested) return MENU_ITEMS;
  const suggestedItem = MENU_ITEMS.find((m) => m.intent === suggested);
  if (!suggestedItem) return MENU_ITEMS;
  return [suggestedItem, ...MENU_ITEMS.filter((m) => m.intent !== suggested)];
}

// Widget flotante presente en (casi) toda la web: triaje por botones (nunca
// texto libre), tarificadores completos embebidos para salud/vida/auto con
// el mismo formulario y campos que sus páginas dedicadas, y un mini-flujo +
// captura de contacto propios para decesos/hogar/dudas, que no tienen
// tarificador. Montado una única vez en el layout raíz: al vivir fuera de
// cada página, el estado de la conversación no se pierde al navegar entre
// páginas donde el asistente está disponible.
export function AssistantWidget() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [stage, setStage] = useState<Stage>("menu");
  const [miniflowIdx, setMiniflowIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const allowed = isAssistantAllowed(pathname);
  const context = getAssistantContext(pathname);

  if (!allowed) return null;

  const activeFlow: MiniFlowQuestion[] = intent === "llamada"
    ? [{ key: "producto", title: "¿Con qué seguro necesitas ayuda?", options: LLAMADA_PRODUCTO_OPTIONS }]
    : intent
      ? (MINIFLOWS[intent] ?? [])
      : [];

  function resetToMenu() {
    setIntent(null);
    setStage("menu");
    setMiniflowIdx(0);
    setAnswers({});
  }

  function chooseIntent(i: Intent) {
    setIntent(i);
    setAnswers({});
    setMiniflowIdx(0);
    setStage(i === "salud" || i === "vida" || i === "auto" ? "tarificador" : "miniflow");
  }

  function answerMiniflow(key: string, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
    if (miniflowIdx + 1 >= activeFlow.length) setStage("contact");
    else setMiniflowIdx((n) => n + 1);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir el asistente de Ventajon"
          className="fixed bottom-28 left-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-navy text-white shadow-card transition-transform hover:scale-105 lg:bottom-6 lg:left-6"
        >
          <ChatIcon />
        </button>
      )}

      {open && (
        <div role="presentation" onClick={() => setOpen(false)} aria-hidden="true" className="fixed inset-0 z-40 bg-navy-deep/40 lg:hidden" />
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-heading"
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-card motion-safe:animate-fade-up lg:inset-x-auto lg:bottom-6 lg:left-6 lg:h-[600px] lg:max-h-[calc(100vh-3rem)] lg:w-[380px] lg:rounded-[24px]"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-hair px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              {stage !== "menu" && stage !== "done" && (
                <button type="button" onClick={resetToMenu} aria-label="Volver al menú" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-navy transition-colors hover:bg-mist">
                  <ChevronLeft width={18} height={18} />
                </button>
              )}
              <h2 id="assistant-heading" className="truncate text-[15px] font-bold text-navy">Asistente {BRAND_NAME}</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-navy transition-colors hover:bg-mist">
              <Close width={16} height={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {stage === "menu" && (
              <div>
                <p className="text-[14px] leading-relaxed text-ink">{context.greeting}</p>
                <div className="mt-4 flex flex-col gap-2">
                  {orderedMenu(context.suggestedProducto).map((item) => (
                    <button
                      key={item.intent}
                      type="button"
                      onClick={() => chooseIntent(item.intent)}
                      className="flex items-center gap-3 rounded-card border border-hair bg-white px-4 py-3 text-left text-[14px] font-semibold text-ink transition-colors hover:border-navy/40 hover:bg-mist"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                        <IconByName name={item.icon} width={17} height={17} />
                      </span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stage === "tarificador" && (intent === "salud" || intent === "vida" || intent === "auto") && (
              <StepForm variant={intent} origen="asistente" />
            )}

            {stage === "miniflow" && activeFlow[miniflowIdx] && (
              <MiniFlowStep question={activeFlow[miniflowIdx]} onAnswer={(v) => answerMiniflow(activeFlow[miniflowIdx].key, v)} />
            )}

            {stage === "contact" && intent && (
              <ContactCapture intent={intent} answers={answers} onDone={() => setStage("done")} />
            )}

            {stage === "done" && (
              <div className="motion-safe:animate-fade-up py-6 text-center">
                <p className="text-[16px] font-bold text-navy">¡Gracias!</p>
                <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                  Hemos recibido tus datos. Un asesor se pondrá en contacto contigo en breve.
                </p>
                <button type="button" onClick={resetToMenu} className="mt-5 rounded-card border border-hair px-5 py-2.5 text-[14px] font-semibold text-navy transition-colors hover:bg-mist">
                  Volver al menú
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MiniFlowStep({ question, onAnswer }: { question: MiniFlowQuestion; onAnswer: (v: string) => void }) {
  return (
    <div className="motion-safe:animate-fade-up">
      <h3 className="text-[16px] font-bold leading-snug text-navy">{question.title}</h3>
      <div className="mt-4 flex flex-col gap-2">
        {question.options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onAnswer(o.value)}
            className="rounded-card border border-hair bg-white px-4 py-3 text-left text-[14px] font-medium text-ink transition-colors hover:border-navy/40 hover:bg-mist"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type FieldErrors = Partial<Record<string, string>>;

function ContactCapture({ intent, answers, onDone }: { intent: Intent; answers: Record<string, string>; onDone: () => void }) {
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

  const producto = intent === "llamada" ? (answers.producto ?? "salud") : intent === "duda" ? "general" : intent;
  const detalleConsulta = intent !== "llamada" && Object.keys(answers).length
    ? summarizeAnswers(PRODUCTO_LABELS[intent], answers)
    : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const payload = {
      nombre, telefono, codigoPostal, producto,
      detalleConsulta,
      aceptaPrivacidad: priv, autorizaContacto: contacto, aceptaComercial: comercial,
      company: "", consent: consentTimes, utm: getAttribution(), origen: "asistente" as const,
    };
    const parsed = callRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const mapped: FieldErrors = {};
      for (const [k, v] of Object.entries(fe)) if (v && v[0]) mapped[k] = v[0];
      setErrors(mapped);
      const first = ["telefono", "codigoPostal", "aceptaPrivacidad", "autorizaContacto"].find((k) => mapped[k]);
      if (first) document.getElementById(`a-${first}`)?.focus();
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
        pushDataLayerEvent("generate_lead", { producto, form: "asistente" });
        onDone();
        return;
      }
      const body = (await res.json().catch(() => null)) as { errors?: Record<string, string[]> } | null;
      if (body?.errors) {
        const mapped: FieldErrors = {};
        for (const [k, v] of Object.entries(body.errors)) if (v && v[0]) mapped[k] = v[0];
        setErrors(mapped);
      } else {
        setSubmitError("No hemos podido enviar tus datos. Inténtalo de nuevo.");
      }
    } catch {
      setSubmitError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative motion-safe:animate-fade-up">
      <h3 className="text-[16px] font-bold leading-snug text-navy">Déjanos tus datos</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">Un asesor te llama sin coste ni compromiso.</p>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="a-company">No rellenar</label>
        <input id="a-company" tabIndex={-1} autoComplete="off" onChange={() => {}} />
      </div>

      <div className="mt-4">
        <label htmlFor="a-nombre" className="mb-1.5 block text-[13px] font-semibold text-ink">
          Nombre <span className="font-normal text-slate2">(opcional)</span>
        </label>
        <input id="a-nombre" name="name" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="María…"
          className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60" />
      </div>

      <div className="mt-3">
        <label htmlFor="a-telefono" className="mb-1.5 block text-[13px] font-semibold text-ink">Teléfono móvil</label>
        <input id="a-telefono" name="tel" type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="600 000 000…"
          aria-invalid={!!errors.telefono} aria-describedby={errors.telefono ? "a-telefono-err" : undefined}
          className={`w-full rounded-card border bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60 ${errors.telefono ? "border-brand-red" : "border-hair"}`} />
        {errors.telefono && <p id="a-telefono-err" role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{errors.telefono}</p>}
      </div>

      <div className="mt-3">
        <label htmlFor="a-codigoPostal" className="mb-1.5 block text-[13px] font-semibold text-ink">Código postal</label>
        <input id="a-codigoPostal" name="postal-code" inputMode="numeric" autoComplete="postal-code" maxLength={5} spellCheck={false} value={codigoPostal}
          onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="35001…"
          aria-invalid={!!errors.codigoPostal} aria-describedby={errors.codigoPostal ? "a-cp-err" : undefined}
          className={`w-full rounded-card border bg-white px-4 py-3 text-[15px] tnums text-ink placeholder:text-slate2/60 ${errors.codigoPostal ? "border-brand-red" : "border-hair"}`} />
        {errors.codigoPostal && <p id="a-cp-err" role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{errors.codigoPostal}</p>}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <label htmlFor="a-aceptaPrivacidad" className="flex cursor-pointer items-start gap-2.5">
          <input id="a-aceptaPrivacidad" type="checkbox" checked={priv}
            onChange={(e) => { setPriv(e.target.checked); setConsentTimes((c) => ({ ...c, privacidadAt: e.target.checked ? new Date().toISOString() : undefined })); }}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-navy" aria-invalid={!!errors.aceptaPrivacidad} />
          <span className="text-[12px] leading-relaxed text-slate2">
            He leído y acepto la <a href="/legal" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">política de privacidad</a>.
          </span>
        </label>
        {errors.aceptaPrivacidad && <p role="alert" className="ml-7 text-[12px] font-medium text-brand-red">{errors.aceptaPrivacidad}</p>}

        <label htmlFor="a-autorizaContacto" className="flex cursor-pointer items-start gap-2.5">
          <input id="a-autorizaContacto" type="checkbox" checked={contacto}
            onChange={(e) => { setContacto(e.target.checked); setConsentTimes((c) => ({ ...c, contactoAt: e.target.checked ? new Date().toISOString() : undefined })); }}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-navy" aria-invalid={!!errors.autorizaContacto} />
          <span className="text-[12px] leading-relaxed text-slate2">
            Autorizo a {BRAND_NAME} a llamarme por teléfono o WhatsApp para ayudarme a elegir mi seguro.
          </span>
        </label>
        {errors.autorizaContacto && <p role="alert" className="ml-7 text-[12px] font-medium text-brand-red">{errors.autorizaContacto}</p>}

        <label htmlFor="a-aceptaComercial" className="flex cursor-pointer items-start gap-2.5">
          <input id="a-aceptaComercial" type="checkbox" checked={comercial}
            onChange={(e) => { setComercial(e.target.checked); setConsentTimes((c) => ({ ...c, comercialAt: e.target.checked ? new Date().toISOString() : undefined })); }}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-navy" />
          <span className="text-[12px] leading-relaxed text-slate2">Quiero recibir consejos y novedades de {BRAND_NAME} (opcional).</span>
        </label>
      </div>

      {submitError && (
        <p role="alert" aria-live="polite" className="mt-3 rounded-lg bg-brand-red/10 px-3.5 py-2.5 text-[13px] font-medium text-brand-red-deep">{submitError}</p>
      )}

      <button type="submit" disabled={submitting} aria-busy={submitting || undefined}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40">
        {submitting && <Spinner />}
        {submitting ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}

function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
