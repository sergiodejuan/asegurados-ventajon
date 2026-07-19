"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StepForm } from "@/components/StepForm";
import { callRequestSchema } from "@/lib/schema";
import { BRAND_NAME, CALLER_NUMBERS } from "@/lib/brand";
import { getAttribution, withUtmParams } from "@/lib/attribution";
import { loadClientProfile, saveClientProfile } from "@/lib/clientArea";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { Close, IconByName, Spinner, ChevronLeft, ChevronRight, Phone } from "@/components/icons";
import { ConsentNudgeModal } from "@/components/ConsentNudgeModal";
import { getProductPage, quoteHref } from "@/lib/productPages";
import {
  isAssistantAllowed,
  getAssistantContext,
  HOGAR_FLOW,
  summarizeAnswers,
  TICKET_TOPICS,
  productoDisplay,
  summarizeTicket,
  type MiniFlowQuestion,
  type AssistantProducto,
} from "@/lib/assistantConfig";

type Intent = "salud" | "vida" | "auto" | "decesos" | "hogar" | "llamada" | "duda";
// Menú de entrada, calcado del funnel conversacional del bot de WhatsApp
// (ManyChat) que reciben los usuarios que llegan desde la web: primero se
// pregunta la intención general, y solo dentro de "precio" se pregunta el
// ramo. Igual que el bot, las acciones terminales son enlaces a páginas
// internas (con UTM propio) en vez de solo formularios embebidos — así el
// asistente también ayuda a que la gente navegue por la web de verdad.
type TopIntent = "precio" | "presupuesto" | "llamada" | "duda" | "info";
type Stage =
  | "name"
  | "menu"
  | "producto-menu"
  | "precio-link"
  | "presupuesto-link"
  | "duda-intro"
  | "info"
  | "tarificador"
  | "miniflow"
  | "contact"
  | "duda-contact"
  | "duda-select"
  | "duda-topic"
  | "duda-confirm"
  | "done";

type TicketPresupuesto = {
  id: string;
  producto: string;
  createdAt: string;
  nombre?: string;
  telefono?: string;
  email?: string;
  codigoPostal?: string;
};

// A partir de qué scroll (px) se revela la burbuja: evita que aparezca de
// golpe nada más cargar la página, cuando el visitante ni siquiera ha
// empezado a leer — una vez revelada (tras cruzar el umbral una vez), se
// queda visible aunque se vuelva a subir arriba.
const SCROLL_REVEAL_PX = 240;
const TEASER_DELAY_MS = 1200;
const TEASER_AUTOHIDE_MS = 10000;
const TEASER_SEEN_KEY = "ventajon:assistantTeaserSeen";

const TOP_MENU_ITEMS: { intent: TopIntent; label: string; description: string; icon: string }[] = [
  { intent: "precio", label: "Busco mejorar precio", description: "Compara tu seguro actual y ahorra", icon: "compare" },
  { intent: "presupuesto", label: "Pedir presupuesto", description: "Te ayudamos a elegir y contratar", icon: "doc" },
  { intent: "llamada", label: "Quiero que me llamen", description: "Un asesor te llama cuando quieras", icon: "phone" },
  { intent: "duda", label: "Tengo una duda", description: "Resolvemos tus preguntas al momento", icon: "doc" },
  { intent: "info", label: "Necesito información", description: "Descubre todos nuestros seguros", icon: "shield" },
];

function telHref(n: string): string {
  return "tel:" + n.replace(/[^\d+]/g, "");
}

const PRODUCT_MENU_ITEMS: { intent: Intent; label: string; icon: string }[] = [
  { intent: "salud", label: "Seguro de salud", icon: "shield" },
  { intent: "vida", label: "Seguro de vida", icon: "life" },
  { intent: "auto", label: "Seguro de auto", icon: "car" },
  { intent: "decesos", label: "Seguro de decesos", icon: "flower" },
  { intent: "hogar", label: "Seguro de hogar", icon: "home" },
];

// Enlace del tarificador/página propia por ramo, para el botón "Ir al
// Calculador" (salud/vida/auto/decesos) o "Ver seguro de X" (hogar, que no
// tiene tarificador propio) — mismo criterio que el selector de seguros
// del CTA general (ver lib/productPages.ts).
function productoHref(slug: "salud" | "vida" | "auto" | "decesos" | "hogar"): string {
  return quoteHref(getProductPage(slug)!);
}

const LLAMADA_PRODUCTO_OPTIONS = [
  { label: "Salud", value: "salud" },
  { label: "Vida", value: "vida" },
  { label: "Decesos", value: "decesos" },
  { label: "Hogar", value: "hogar" },
  { label: "Auto", value: "auto" },
];

const MINIFLOWS: Partial<Record<Intent, MiniFlowQuestion[]>> = {
  hogar: HOGAR_FLOW,
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

function orderedMenu(items: typeof PRODUCT_MENU_ITEMS, suggested?: AssistantProducto) {
  if (!suggested) return items;
  const suggestedItem = items.find((m) => m.intent === suggested);
  if (!suggestedItem) return items;
  return [suggestedItem, ...items.filter((m) => m.intent !== suggested)];
}

// UTM propio del asistente para los botones que navegan a una página
// interna (mismo criterio que el mega menú y las barras sticky: el
// medio/campaña identifican el placement para poder medirlo aparte).
function assistantUtm(href: string, action: string): string {
  return withUtmParams(href, { source: "web", medium: "asistente", campaign: `asistente-${action}` });
}

// Migas de pan del propio widget: con varios niveles de profundidad (menú
// general → ramo → calculadora/formulario), sin esto es fácil perder de
// vista en qué paso del flujo se está. El botón "volver" ya existe y
// siempre regresa al menú general (no paso a paso), así que esto es solo
// orientación, no navegación.
function getBreadcrumb(topIntent: TopIntent | null, stage: Stage, intent: Intent | null): string[] {
  if (!topIntent) return [];
  const topLabel = TOP_MENU_ITEMS.find((t) => t.intent === topIntent)?.label;
  if (!topLabel) return [];
  const segs = [topLabel];
  if (stage === "precio-link" && intent) segs.push(PRODUCTO_LABELS[intent]);
  else if (stage === "tarificador" && intent) segs.push(PRODUCTO_LABELS[intent], "Calculadora");
  else if (stage === "miniflow" && topIntent === "precio" && intent) segs.push(PRODUCTO_LABELS[intent]);
  else if (stage === "contact") segs.push("Tus datos");
  else if (stage === "duda-contact") segs.push("Buscar presupuesto");
  else if (stage === "duda-select") segs.push("Elige tu presupuesto");
  else if (stage === "duda-topic") segs.push("Cuéntanos tu duda");
  else if (stage === "duda-confirm") segs.push("Tus datos");
  return segs;
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return ""; }
}

// Widget flotante presente en (casi) toda la web: triaje por botones (nunca
// texto libre), tarificadores completos embebidos para salud/vida/auto/decesos
// con el mismo formulario y campos que sus páginas dedicadas, un mini-flujo +
// captura de contacto propios para hogar (que no tiene tarificador), y un
// flujo de "abrir ticket" para dudas sobre un presupuesto ya existente.
// Montado una única vez en el layout raíz: al vivir fuera de cada página, el
// estado de la conversación no se pierde al navegar entre páginas donde el
// asistente está disponible.
export function AssistantWidget() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return loadClientProfile()?.nombre ?? "";
  });
  const [intent, setIntent] = useState<Intent | null>(null);
  const [topIntent, setTopIntent] = useState<TopIntent | null>(null);
  const [stage, setStage] = useState<Stage>(() => {
    if (typeof window === "undefined") return "menu";
    return loadClientProfile()?.nombre ? "menu" : "name";
  });
  const [miniflowIdx, setMiniflowIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Flujo de "tengo una duda": localizar el presupuesto y abrir un ticket.
  const [ticketIdentifier, setTicketIdentifier] = useState("");
  const [ticketSearching, setTicketSearching] = useState(false);
  const [ticketSearchError, setTicketSearchError] = useState<string | null>(null);
  const [ticketPresupuestos, setTicketPresupuestos] = useState<TicketPresupuesto[] | null>(null);
  const [ticketSelected, setTicketSelected] = useState<TicketPresupuesto | null>(null);
  const [ticketTopic, setTicketTopic] = useState<string | null>(null);
  const [ticketComment, setTicketComment] = useState("");

  useEffect(() => {
    function onScroll() { if (window.scrollY > SCROLL_REVEAL_PX) setScrolled(true); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mensaje proactivo (bocadillo junto al icono) antes de abrir el widget,
  // una sola vez por sesión de navegador — igual que hacen los asistentes de
  // las grandes aseguradoras, invita a abrir sin ser intrusivo.
  useEffect(() => {
    if (!scrolled || open) return;
    let alreadySeen = false;
    try { alreadySeen = sessionStorage.getItem(TEASER_SEEN_KEY) === "1"; } catch { /* noop */ }
    if (alreadySeen) return;
    const showTimer = setTimeout(() => {
      setShowTeaser(true);
      try { sessionStorage.setItem(TEASER_SEEN_KEY, "1"); } catch { /* noop */ }
    }, TEASER_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, [scrolled, open]);

  useEffect(() => {
    if (!showTeaser) return;
    const hideTimer = setTimeout(() => setShowTeaser(false), TEASER_AUTOHIDE_MS);
    return () => clearTimeout(hideTimer);
  }, [showTeaser]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const allowed = isAssistantAllowed(pathname);
  const context = getAssistantContext(pathname);
  const firstName = userName.trim().split(/\s+/)[0] || undefined;

  if (!allowed) return null;

  const showBack = stage !== "menu" && stage !== "done" && stage !== "name";
  const breadcrumb = showBack ? getBreadcrumb(topIntent, stage, intent) : [];

  const activeFlow: MiniFlowQuestion[] = intent === "llamada"
    ? [{ key: "producto", title: "¿Con qué seguro necesitas ayuda?", options: LLAMADA_PRODUCTO_OPTIONS }]
    : intent
      ? (MINIFLOWS[intent] ?? [])
      : [];

  function resetToMenu() {
    setIntent(null);
    setTopIntent(null);
    setStage("menu");
    setMiniflowIdx(0);
    setAnswers({});
  }

  // Primer nivel del menú (calcado del funnel de WhatsApp): la intención
  // general antes de preguntar el ramo.
  function chooseTopIntent(t: TopIntent) {
    setTopIntent(t);
    setAnswers({});
    setMiniflowIdx(0);
    if (t === "precio") {
      setIntent(null);
      setStage("producto-menu");
    } else if (t === "presupuesto") {
      setIntent(null);
      setStage("presupuesto-link");
    } else if (t === "llamada") {
      setIntent("llamada");
      setStage("miniflow");
    } else if (t === "duda") {
      setIntent("duda");
      setTicketIdentifier("");
      setTicketSearching(false);
      setTicketSearchError(null);
      setTicketPresupuestos(null);
      setTicketSelected(null);
      setTicketTopic(null);
      setTicketComment("");
      setStage("duda-intro");
    } else {
      setIntent(null);
      setStage("info");
    }
  }

  // Segundo nivel, solo para "Busco mejorar precio": qué ramo, y luego un
  // enlace real a su tarificador/página (con UTM) — igual que el bot manda
  // un enlace en vez de completar la cotización dentro del chat. Quien
  // prefiera seguir sin salir del asistente puede hacerlo igualmente (ver
  // botón secundario en el stage "precio-link").
  function chooseProducto(i: Intent) {
    setIntent(i);
    setAnswers({});
    setMiniflowIdx(0);
    setStage("precio-link");
  }

  function continueInline() {
    if (intent === "salud" || intent === "vida" || intent === "auto" || intent === "decesos") setStage("tarificador");
    else setStage("miniflow");
  }

  function answerMiniflow(key: string, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
    if (miniflowIdx + 1 >= activeFlow.length) setStage("contact");
    else setMiniflowIdx((n) => n + 1);
  }

  function handleNameSubmit(name: string) {
    saveClientProfile({ nombre: name });
    setUserName(name);
    setStage("menu");
  }

  async function searchTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketIdentifier.trim()) return;
    setTicketSearching(true);
    setTicketSearchError(null);
    try {
      const res = await fetch("/api/client/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: ticketIdentifier.trim() }),
      });
      const body = (await res.json().catch(() => null)) as { ok: boolean; presupuestos?: TicketPresupuesto[]; error?: string } | null;
      if (res.ok && body?.ok && body.presupuestos?.length) {
        setTicketPresupuestos(body.presupuestos);
        if (body.presupuestos.length === 1) {
          setTicketSelected(body.presupuestos[0]);
          setStage("duda-topic");
        } else {
          setStage("duda-select");
        }
      } else {
        setTicketSearchError(body?.error || "No hemos encontrado ningún presupuesto con ese dato.");
      }
    } catch {
      setTicketSearchError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setTicketSearching(false);
    }
  }

  function skipTicketSearch() {
    setTicketPresupuestos([]);
    setTicketSelected(null);
    setTicketSearchError(null);
    setStage("duda-topic");
  }

  function openWidget() {
    setOpen(true);
    setShowTeaser(false);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openWidget}
          aria-label="Abrir Coti, el asistente de Ventajon"
          aria-hidden={!scrolled}
          tabIndex={scrolled ? 0 : -1}
          className={`fixed bottom-28 left-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-navy text-white shadow-card transition-all duration-500 ease-out hover:scale-105 lg:bottom-[var(--assistant-bottom,1.5rem)] lg:left-6 ${
            scrolled ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-75 opacity-0"
          }`}
        >
          <ChatIcon />
        </button>
      )}

      {!open && showTeaser && (
        <div
          role="button"
          tabIndex={0}
          onClick={openWidget}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openWidget(); }}
          className="fixed bottom-[184px] left-4 z-40 max-w-[240px] cursor-pointer rounded-2xl rounded-bl-sm border border-hair bg-white px-4 py-3 text-[13px] leading-relaxed text-ink shadow-[0_8px_28px_-8px_rgba(18,32,79,0.35)] transition-[bottom] duration-300 ease-out motion-safe:animate-fade-up lg:bottom-[calc(var(--assistant-bottom,1.5rem)_+_4.5rem)] lg:left-6"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowTeaser(false); }}
            aria-label="Cerrar sugerencia"
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-hair bg-white text-slate2 shadow-soft transition-colors hover:text-navy"
          >
            <Close width={11} height={11} />
          </button>
          <span className="font-semibold text-navy">¡Hola! 👋</span> Soy Coti, el asistente de {BRAND_NAME}. ¿Necesitas ayuda?
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-heading"
          className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white transition-[bottom] duration-300 ease-out motion-safe:animate-fade-up lg:inset-auto lg:bottom-[var(--assistant-bottom,1.5rem)] lg:left-6 lg:h-[600px] lg:max-h-[calc(100vh-3rem)] lg:w-[380px] lg:rounded-[24px] lg:border lg:border-hair lg:shadow-[0_8px_40px_-6px_rgba(18,32,79,0.35)]"
        >
          <div className="safe-top flex shrink-0 items-center justify-between border-b border-hair px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              {showBack && (
                <button type="button" onClick={resetToMenu} aria-label="Volver al menú" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-navy transition-colors hover:bg-mist">
                  <ChevronLeft width={18} height={18} />
                </button>
              )}
              <h2 id="assistant-heading" className="truncate text-[15px] font-bold text-navy">Coti</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-navy transition-colors hover:bg-mist">
              <Close width={16} height={16} />
            </button>
          </div>

          {breadcrumb.length > 0 && (
            <p className="shrink-0 truncate border-b border-hair bg-mist px-5 py-2 text-[12px] font-medium text-slate2">
              {breadcrumb.join(" · ")}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {stage === "name" && (
              <NameStep onSubmit={handleNameSubmit} onSkip={() => setStage("menu")} />
            )}

            {stage === "menu" && (
              <div>
                <BotBubble>
                  <p className="font-semibold text-navy">{firstName ? `¡Hola, ${firstName}! 👋` : "¡Hola! 👋"}</p>
                  <p className="mt-1">Soy Coti. {context.greeting}</p>
                </BotBubble>
                <div className="mt-4 flex flex-col gap-2">
                  {TOP_MENU_ITEMS.map((item) => (
                    <button
                      key={item.intent}
                      type="button"
                      onClick={() => chooseTopIntent(item.intent)}
                      className="flex items-start gap-3 rounded-2xl border border-navy/15 bg-white px-4 py-3 text-left transition-all hover:border-navy hover:bg-navy/5 active:scale-[0.98]"
                    >
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-white">
                        {item.icon === "phone" ? <Phone width={17} height={17} /> : <IconByName name={item.icon} width={17} height={17} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold text-ink">{item.label}</span>
                        <span className="block text-[12px] leading-snug text-slate2">{item.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stage === "producto-menu" && (
              <div className="motion-safe:animate-fade-up">
                <BotBubble>
                  <span className="font-semibold text-navy">¿Con qué tipo de seguro te ayudamos?</span>
                </BotBubble>
                <div className="mt-4 flex flex-col gap-2">
                  {orderedMenu(PRODUCT_MENU_ITEMS, context.suggestedProducto).map((item) => (
                    <button
                      key={item.intent}
                      type="button"
                      onClick={() => chooseProducto(item.intent)}
                      className="flex items-center gap-3 rounded-2xl border border-navy/15 bg-white px-4 py-3 text-left text-[14px] font-semibold text-ink transition-all hover:border-navy hover:bg-navy/5 active:scale-[0.98]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-white">
                        <IconByName name={item.icon} width={17} height={17} />
                      </span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stage === "precio-link" && (intent === "salud" || intent === "vida" || intent === "auto" || intent === "decesos" || intent === "hogar") && (
              <div className="motion-safe:animate-fade-up">
                {intent === "salud" || intent === "vida" || intent === "auto" || intent === "decesos" ? (
                  <>
                    <BotBubble>
                      <p className="font-semibold text-navy">¡Genial!</p>
                      <p className="mt-1">
                        Te vamos a dejar un enlace desde el cual puedes calcular fácilmente tu {PRODUCTO_LABELS[intent]} y conocer las
                        diferentes opciones según tu caso.
                      </p>
                    </BotBubble>
                    <AssistantLinkButton href={assistantUtm(productoHref(intent), `calculador-${intent}`)} action={`calculador-${intent}`}>
                      Ir al Calculador
                    </AssistantLinkButton>
                    <button type="button" onClick={continueInline} className="mt-3 block w-full text-center text-[12px] font-medium text-slate2 underline active:scale-[0.98]">
                      Prefiero calcularlo aquí mismo
                    </button>
                  </>
                ) : (
                  <>
                    <BotBubble>
                      <p className="font-semibold text-navy">¡Genial!</p>
                      <p className="mt-1">Te dejamos un enlace donde puedes ver toda la información de tu {PRODUCTO_LABELS[intent]}.</p>
                    </BotBubble>
                    <AssistantLinkButton href={assistantUtm(productoHref(intent), `ver-${intent}`)} action={`ver-${intent}`}>
                      Ver {PRODUCTO_LABELS[intent].toLowerCase()}
                    </AssistantLinkButton>
                    <button type="button" onClick={continueInline} className="mt-3 block w-full text-center text-[12px] font-medium text-slate2 underline active:scale-[0.98]">
                      Que me llamen sobre esto
                    </button>
                  </>
                )}
              </div>
            )}

            {stage === "presupuesto-link" && (
              <div className="motion-safe:animate-fade-up">
                <BotBubble>
                  <p className="font-semibold text-navy">Claro, estamos aquí para eso.</p>
                  <p className="mt-1">
                    Desde nuestra web puedes agendar fácilmente una llamada con uno de nuestros asesores. Ellos te asesorarán y
                    responderán todas tus consultas.
                  </p>
                </BotBubble>
                <AssistantLinkButton href={assistantUtm("/quiero-que-me-llamen", "presupuesto")} action="presupuesto">
                  Agendar llamada
                </AssistantLinkButton>
              </div>
            )}

            {stage === "duda-intro" && (
              <div className="motion-safe:animate-fade-up">
                <BotBubble>
                  <p className="font-semibold text-navy">Es normal tener dudas</p>
                  <p className="mt-1">
                    Sobre todo cuando elegir un seguro es algo complicado. Te dejamos un enlace donde puedes resolver las preguntas
                    frecuentes de nuestros clientes.
                  </p>
                </BotBubble>
                <AssistantLinkButton href={assistantUtm("/preguntas-frecuentes", "preguntas-frecuentes")} action="preguntas-frecuentes">
                  Ver preguntas frecuentes
                </AssistantLinkButton>
                <button type="button" onClick={() => setStage("duda-contact")} className="mt-3 block w-full text-center text-[12px] font-medium text-slate2 underline active:scale-[0.98]">
                  Prefiero contarte mi duda directamente
                </button>
              </div>
            )}

            {stage === "info" && (
              <div className="motion-safe:animate-fade-up">
                <BotBubble>
                  <p className="font-semibold text-navy">¡Genial!</p>
                  <p className="mt-1">
                    Desde aquí puedes acceder a todas las coberturas y tipos de seguros de {BRAND_NAME}, y ver las promociones activas.
                  </p>
                </BotBubble>
                <AssistantLinkButton href={`${assistantUtm("/", "seguros")}#elige`} action="seguros">
                  Ver seguros
                </AssistantLinkButton>
                <a
                  href={assistantUtm("/promociones", "promociones")}
                  onClick={() => pushDataLayerEvent("assistant_link_click", { action: "promociones" })}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-navy/15 px-5 py-3.5 text-[15px] font-semibold text-navy transition-all hover:border-navy hover:bg-navy/5 active:scale-[0.98]"
                >
                  Ver promociones
                  <ChevronRight width={16} height={16} />
                </a>
              </div>
            )}

            {stage === "tarificador" && (intent === "salud" || intent === "vida" || intent === "auto" || intent === "decesos") && (
              <StepForm variant={intent} origen="asistente" />
            )}

            {stage === "miniflow" && activeFlow[miniflowIdx] && (
              <MiniFlowStep question={activeFlow[miniflowIdx]} onAnswer={(v) => answerMiniflow(activeFlow[miniflowIdx].key, v)} />
            )}

            {stage === "contact" && intent && (
              <ContactCapture intent={intent} answers={answers} onDone={() => setStage("done")} />
            )}

            {stage === "duda-contact" && (
              <TicketSearch
                identifier={ticketIdentifier}
                onChangeIdentifier={setTicketIdentifier}
                onSubmit={searchTicket}
                searching={ticketSearching}
                error={ticketSearchError}
                onSkip={skipTicketSearch}
              />
            )}

            {stage === "duda-select" && ticketPresupuestos && (
              <TicketPresupuestoSelect
                presupuestos={ticketPresupuestos}
                onSelect={(p) => { setTicketSelected(p); setStage("duda-topic"); }}
              />
            )}

            {stage === "duda-topic" && (
              <TicketTopicStep
                topic={ticketTopic}
                onSelectTopic={setTicketTopic}
                comment={ticketComment}
                onChangeComment={setTicketComment}
                presupuesto={ticketSelected}
                onContinue={() => setStage("duda-confirm")}
              />
            )}

            {stage === "duda-confirm" && (
              <TicketConfirm
                presupuesto={ticketSelected}
                topic={ticketTopic}
                comment={ticketComment}
                onDone={() => setStage("done")}
              />
            )}

            {stage === "done" && (
              <div className="motion-safe:animate-fade-up">
                <BotBubble>
                  <p className="font-semibold text-navy">¡Gracias{firstName ? `, ${firstName}` : ""}! 🎉</p>
                  <p className="mt-1">Hemos recibido tus datos. Un asesor se pondrá en contacto contigo en breve.</p>
                </BotBubble>
                <button type="button" onClick={resetToMenu} className="mt-4 rounded-2xl border border-navy/15 px-5 py-2.5 text-[14px] font-semibold text-navy transition-colors hover:border-navy hover:bg-navy/5 active:scale-[0.98]">
                  Volver al menú
                </button>
              </div>
            )}
          </div>

          {/* Acceso fijo a llamada directa: siempre visible, en cualquier
              paso de la conversación, para quien prefiera no completar nada
              y hablar directamente con un asesor. */}
          {CALLER_NUMBERS[0]?.number && (
            <a
              href={telHref(CALLER_NUMBERS[0].number)}
              onClick={() => pushDataLayerEvent("phone_click", { placement: "asistente" })}
              className="safe-bottom flex shrink-0 items-center justify-center gap-2 border-t border-hair bg-mist px-5 py-3 text-[13px] font-semibold text-navy transition-colors hover:bg-hair active:scale-[0.98]"
            >
              <Phone width={15} height={15} />
              Llamar ahora · {CALLER_NUMBERS[0].number}
            </a>
          )}
        </div>
      )}
    </>
  );
}

function NameStep({ onSubmit, onSkip }: { onSubmit: (name: string) => void; onSkip: () => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="motion-safe:animate-fade-up">
      <BotBubble>¡Hola! 👋 Soy Coti. Antes de nada, ¿cómo te llamas?</BotBubble>
      <form
        onSubmit={(e) => { e.preventDefault(); const v = value.trim(); if (v) onSubmit(v); else onSkip(); }}
        className="mt-4"
      >
        <label htmlFor="a-userName" className="sr-only">Tu nombre</label>
        <input
          id="a-userName" autoComplete="given-name" value={value} onChange={(e) => setValue(e.target.value)}
          placeholder="Tu nombre…" autoFocus
          className="w-full rounded-2xl border border-navy/15 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60"
        />
        <button type="submit" className="mt-3 flex w-full items-center justify-center rounded-2xl bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-brand-red-deep active:scale-[0.98]">
          Continuar
        </button>
      </form>
      <button type="button" onClick={onSkip} className="mt-3 block w-full text-center text-[12px] font-medium text-slate2 underline active:scale-[0.98]">
        Prefiero no decirlo
      </button>
    </div>
  );
}

function MiniFlowStep({ question, onAnswer }: { question: MiniFlowQuestion; onAnswer: (v: string) => void }) {
  return (
    <div className="motion-safe:animate-fade-up">
      <BotBubble><span className="font-semibold text-navy">{question.title}</span></BotBubble>
      <div className="mt-4 flex flex-col gap-2">
        {question.options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onAnswer(o.value)}
            className="rounded-2xl border border-navy/15 bg-white px-4 py-3 text-left text-[14px] font-medium text-ink transition-all hover:border-navy hover:bg-navy/5 active:scale-[0.98]"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ "Tengo una duda" ------------------------------ */

function TicketSearch({
  identifier, onChangeIdentifier, onSubmit, searching, error, onSkip,
}: {
  identifier: string; onChangeIdentifier: (v: string) => void; onSubmit: (e: React.FormEvent) => void;
  searching: boolean; error: string | null; onSkip: () => void;
}) {
  return (
    <div className="motion-safe:animate-fade-up">
      <BotBubble>
        <p className="font-semibold text-navy">Vamos a localizar tu presupuesto</p>
        <p className="mt-1">Escribe tu correo, tu teléfono o tu número de presupuesto para abrir un ticket sobre tu caso.</p>
      </BotBubble>
      <form onSubmit={onSubmit} className="mt-4">
        <label htmlFor="a-identifier" className="sr-only">Correo, teléfono o nº de presupuesto</label>
        <input
          id="a-identifier" value={identifier} onChange={(e) => onChangeIdentifier(e.target.value)}
          placeholder="Correo, teléfono o nº de presupuesto"
          className="w-full rounded-2xl border border-navy/15 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60"
        />
        {error && <p role="alert" className="mt-2 text-[12px] font-medium text-brand-red">{error}</p>}
        <button
          type="submit" disabled={searching || !identifier.trim()} aria-busy={searching || undefined}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-brand-red-deep active:scale-[0.98] disabled:bg-slate2/40"
        >
          {searching && <Spinner />}
          {searching ? "Buscando…" : "Buscar mi presupuesto"}
        </button>
      </form>
      <button type="button" onClick={onSkip} className="mt-3 block w-full text-center text-[12px] font-medium text-slate2 underline active:scale-[0.98]">
        No tengo presupuesto, quiero contarlo directamente
      </button>
    </div>
  );
}

function TicketPresupuestoSelect({
  presupuestos, onSelect,
}: { presupuestos: TicketPresupuesto[]; onSelect: (p: TicketPresupuesto) => void }) {
  return (
    <div className="motion-safe:animate-fade-up">
      <BotBubble>
        <p className="font-semibold text-navy">Hemos encontrado varios presupuestos</p>
        <p className="mt-1">¿Sobre cuál es tu duda?</p>
      </BotBubble>
      <div className="mt-4 flex flex-col gap-2">
        {presupuestos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className="rounded-2xl border border-navy/15 bg-white px-4 py-3 text-left text-[14px] transition-all hover:border-navy hover:bg-navy/5 active:scale-[0.98]"
          >
            <span className="block font-semibold text-navy">{PRODUCTO_LABELS[p.producto as Intent] ?? p.producto}</span>
            <span className="block text-[12px] text-slate2">{formatDate(p.createdAt)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TicketTopicStep({
  topic, onSelectTopic, comment, onChangeComment, presupuesto, onContinue,
}: {
  topic: string | null; onSelectTopic: (v: string | null) => void; comment: string; onChangeComment: (v: string) => void;
  presupuesto: TicketPresupuesto | null; onContinue: () => void;
}) {
  const canContinue = !!topic || comment.trim().length > 0;
  return (
    <div className="motion-safe:animate-fade-up">
      <BotBubble>
        <p className="font-semibold text-navy">¿Sobre qué es tu duda?</p>
        {presupuesto && (
          <p className="mt-1">Sobre {productoDisplay(presupuesto.producto)} del {formatDate(presupuesto.createdAt)}.</p>
        )}
      </BotBubble>
      <div className="mt-4 flex flex-col gap-2">
        {TICKET_TOPICS.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={topic === o.value}
            onClick={() => onSelectTopic(topic === o.value ? null : o.value)}
            className={`rounded-2xl border px-4 py-3 text-left text-[14px] font-medium transition-all active:scale-[0.98] ${topic === o.value ? "border-navy bg-navy text-white" : "border-navy/15 bg-white text-ink hover:border-navy hover:bg-navy/5"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <label htmlFor="a-comment" className="mb-1.5 block text-[13px] font-semibold text-ink">
          {topic ? "Añade más detalles (opcional)" : "O cuéntanoslo con tus palabras"}
        </label>
        <textarea
          id="a-comment" value={comment} onChange={(e) => onChangeComment(e.target.value.slice(0, 400))} rows={3}
          placeholder="Escribe aquí tu duda…"
          className="w-full resize-none rounded-2xl border border-navy/15 bg-white px-4 py-3 text-[14px] text-ink placeholder:text-slate2/60"
        />
      </div>
      <button
        type="button" disabled={!canContinue} onClick={onContinue}
        className="mt-4 flex w-full items-center justify-center rounded-2xl bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-brand-red-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate2/40"
      >
        Continuar
      </button>
    </div>
  );
}

type FieldErrors = Partial<Record<string, string>>;

function TicketConfirm({
  presupuesto, topic, comment, onDone,
}: { presupuesto: TicketPresupuesto | null; topic: string | null; comment: string; onDone: () => void }) {
  const hasContact = !!presupuesto?.telefono;
  const [nombre, setNombre] = useState(presupuesto?.nombre ?? "");
  const [telefono, setTelefono] = useState(presupuesto?.telefono ?? "");
  const [codigoPostal, setCp] = useState(presupuesto?.codigoPostal ?? "");
  const [priv, setPriv] = useState(false);
  const [contacto, setContacto] = useState(false);
  const [comercial, setComercial] = useState(false);
  const [consentTimes, setConsentTimes] = useState<{ privacidadAt?: string; contactoAt?: string; comercialAt?: string }>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConsentNudge, setShowConsentNudge] = useState(false);

  const producto = presupuesto?.producto ?? "general";
  const detalleConsulta = summarizeTicket(topic, comment, presupuesto?.producto);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const payload = {
      nombre, telefono, codigoPostal, producto,
      detalleConsulta,
      presupuestoId: presupuesto?.id,
      aceptaPrivacidad: priv, autorizaContacto: contacto, aceptaComercial: comercial,
      company: "", consent: consentTimes, utm: getAttribution(), origen: "asistente" as const,
    };
    const parsed = callRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const mapped: FieldErrors = {};
      for (const [k, v] of Object.entries(fe)) if (v && v[0]) mapped[k] = v[0];
      setErrors(mapped);
      if (Object.keys(mapped).length === 1 && mapped.autorizaContacto) { setShowConsentNudge(true); return; }
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
        pushDataLayerEvent("generate_lead", { producto, form: "asistente-ticket" });
        onDone();
        return;
      }
      const body = (await res.json().catch(() => null)) as { errors?: Record<string, string[]> } | null;
      if (body?.errors) {
        const mapped: FieldErrors = {};
        for (const [k, v] of Object.entries(body.errors)) if (v && v[0]) mapped[k] = v[0];
        setErrors(mapped);
      } else {
        setSubmitError("No hemos podido enviar tu consulta. Inténtalo de nuevo.");
      }
    } catch {
      setSubmitError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative motion-safe:animate-fade-up">
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="a-company">No rellenar</label>
        <input id="a-company" tabIndex={-1} autoComplete="off" onChange={() => {}} />
      </div>

      {hasContact ? (
        <BotBubble>
          <p className="font-semibold text-navy">Ya casi está</p>
          <p className="mt-1">
            Vamos a pasar tu duda sobre {productoDisplay(presupuesto!.producto)} a un agente. Te contactaremos en el{" "}
            <span className="font-semibold text-ink">{presupuesto!.telefono}</span>.
          </p>
        </BotBubble>
      ) : (
        <>
          <BotBubble>
            <p className="font-semibold text-navy">Ya casi está</p>
            <p className="mt-1">Déjanos tus datos para que un agente pueda ayudarte.</p>
          </BotBubble>
          <div className="mt-4">
            <label htmlFor="a-nombre" className="mb-1.5 block text-[13px] font-semibold text-ink">
              Nombre <span className="font-normal text-slate2">(opcional)</span>
            </label>
            <input id="a-nombre" name="name" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="María…"
              className="w-full rounded-2xl border border-navy/15 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60" />
          </div>
          <div className="mt-3">
            <label htmlFor="a-telefono" className="mb-1.5 block text-[13px] font-semibold text-ink">Teléfono móvil</label>
            <input id="a-telefono" name="tel" type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="600 000 000…"
              aria-invalid={!!errors.telefono} aria-describedby={errors.telefono ? "a-telefono-err" : undefined}
              className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60 ${errors.telefono ? "border-brand-red" : "border-navy/15"}`} />
            {errors.telefono && <p id="a-telefono-err" role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{errors.telefono}</p>}
          </div>
          <div className="mt-3">
            <label htmlFor="a-codigoPostal" className="mb-1.5 block text-[13px] font-semibold text-ink">Código postal</label>
            <input id="a-codigoPostal" name="postal-code" inputMode="numeric" autoComplete="postal-code" maxLength={5} spellCheck={false} value={codigoPostal}
              onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="35001…"
              aria-invalid={!!errors.codigoPostal} aria-describedby={errors.codigoPostal ? "a-cp-err" : undefined}
              className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] tnums text-ink placeholder:text-slate2/60 ${errors.codigoPostal ? "border-brand-red" : "border-navy/15"}`} />
            {errors.codigoPostal && <p id="a-cp-err" role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{errors.codigoPostal}</p>}
          </div>
        </>
      )}

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
            Autorizo a {BRAND_NAME} a contactarme por teléfono o WhatsApp sobre esta consulta.
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
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-brand-red-deep active:scale-[0.98] disabled:bg-slate2/40">
        {submitting && <Spinner />}
        {submitting ? "Enviando…" : "Enviar consulta"}
      </button>

      <ConsentNudgeModal
        open={showConsentNudge}
        onClose={() => setShowConsentNudge(false)}
        onAccept={() => {
          setContacto(true);
          setConsentTimes((c) => ({ ...c, contactoAt: new Date().toISOString() }));
          setErrors({});
          setShowConsentNudge(false);
        }}
      />
    </form>
  );
}

/* ------------------------------- Llamada / hogar ------------------------------- */

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
  const [showConsentNudge, setShowConsentNudge] = useState(false);

  const producto = intent === "llamada" ? (answers.producto ?? "salud") : intent;
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
      if (Object.keys(mapped).length === 1 && mapped.autorizaContacto) { setShowConsentNudge(true); return; }
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
      <BotBubble>
        <p className="font-semibold text-navy">Déjanos tus datos</p>
        <p className="mt-1">Un asesor te llama sin coste ni compromiso.</p>
      </BotBubble>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="a-company">No rellenar</label>
        <input id="a-company" tabIndex={-1} autoComplete="off" onChange={() => {}} />
      </div>

      <div className="mt-4">
        <label htmlFor="a-nombre" className="mb-1.5 block text-[13px] font-semibold text-ink">
          Nombre <span className="font-normal text-slate2">(opcional)</span>
        </label>
        <input id="a-nombre" name="name" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="María…"
          className="w-full rounded-2xl border border-navy/15 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60" />
      </div>

      <div className="mt-3">
        <label htmlFor="a-telefono" className="mb-1.5 block text-[13px] font-semibold text-ink">Teléfono móvil</label>
        <input id="a-telefono" name="tel" type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="600 000 000…"
          aria-invalid={!!errors.telefono} aria-describedby={errors.telefono ? "a-telefono-err" : undefined}
          className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60 ${errors.telefono ? "border-brand-red" : "border-navy/15"}`} />
        {errors.telefono && <p id="a-telefono-err" role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{errors.telefono}</p>}
      </div>

      <div className="mt-3">
        <label htmlFor="a-codigoPostal" className="mb-1.5 block text-[13px] font-semibold text-ink">Código postal</label>
        <input id="a-codigoPostal" name="postal-code" inputMode="numeric" autoComplete="postal-code" maxLength={5} spellCheck={false} value={codigoPostal}
          onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="35001…"
          aria-invalid={!!errors.codigoPostal} aria-describedby={errors.codigoPostal ? "a-cp-err" : undefined}
          className={`w-full rounded-2xl border bg-white px-4 py-3 text-[15px] tnums text-ink placeholder:text-slate2/60 ${errors.codigoPostal ? "border-brand-red" : "border-navy/15"}`} />
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
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-brand-red-deep active:scale-[0.98] disabled:bg-slate2/40">
        {submitting && <Spinner />}
        {submitting ? "Enviando…" : "Enviar"}
      </button>

      <ConsentNudgeModal
        open={showConsentNudge}
        onClose={() => setShowConsentNudge(false)}
        onAccept={() => {
          setContacto(true);
          setConsentTimes((c) => ({ ...c, contactoAt: new Date().toISOString() }));
          setErrors({});
          setShowConsentNudge(false);
        }}
      />
    </form>
  );
}

function ChatIcon({ width = 26, height = 26 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

// Botón que navega de verdad a una página interna (con UTM), en vez de
// avanzar de stage dentro del propio widget — igual que el bot de WhatsApp
// manda un enlace en vez de completar la gestión dentro del chat. Además de
// medirse por UTM, se registra como evento propio en el dataLayer.
function AssistantLinkButton({ href, action, children }: { href: string; action: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      onClick={() => pushDataLayerEvent("assistant_link_click", { action })}
      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-brand-red-deep active:scale-[0.98]"
    >
      {children}
      <ChevronRight width={16} height={16} />
    </a>
  );
}

// Tres puntos animados antes de que "aparezca" cada mensaje del asistente:
// aunque el contenido está guionizado, este pequeño retraso hace que se
// lea como una conversación en marcha y no como un texto que salta de golpe.
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5" aria-hidden="true">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate2/50 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate2/50 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate2/50" />
    </span>
  );
}

// Burbuja "tipo chat" para el texto que dice el asistente: mismo avatar en
// todas las pantallas, para que se lea como una conversación y no como un
// formulario suelto. Cada vez que se monta (es decir, cada vez que la
// conversación avanza a un mensaje nuevo) muestra primero unos puntos de
// "escribiendo…" durante un instante antes de revelar el texto real.
function BotBubble({ children }: { children: React.ReactNode }) {
  const [typing, setTyping] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTyping(false), 550);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-white">
        <ChatIcon width={15} height={15} />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-mist px-4 py-3 text-[14px] leading-relaxed text-ink">
        {typing ? <TypingDots /> : children}
      </div>
    </div>
  );
}
