// Configuración del asistente flotante: en qué páginas aparece, qué saludo
// contextual mostrar en cada una, y las preguntas del mini-flujo nativo
// para hogar (el único producto sin tarificador propio) o para "tengo una
// duda". Todo lo que responde el usuario son botones con opciones fijas,
// nunca texto libre — igual que el resto de tarificadores de la web.

export type AssistantProducto = "salud" | "vida" | "auto" | "decesos";

export type AssistantContext = {
  greeting: string;
  suggestedProducto?: AssistantProducto;
};

// Rutas donde el asistente NO debe aparecer: páginas que ya son en sí mismas
// un funnel de captura (tarificadores, mes gratis, quiero que me llamen), el
// área privada de cliente, páginas legales/de agradecimiento y todo /admin.
// La comparativa tampoco lo lleva: ya tiene su propio widget de WhatsApp
// contextual (ver WhatsAppHelpWidget) y mostrar los dos a la vez satura la
// pantalla en el momento en que el usuario está decidiendo.
const EXCLUDED_PREFIXES = [
  "/admin",
  "/tarificador-vida",
  "/tarificador-auto",
  "/tarificador",
  "/area-cliente",
  "/mes-gratis",
  "/legal",
  "/gracias",
  "/quiero-que-me-llamen",
  "/comparativa",
];

// Las páginas de embudo propias de CUALQUIER landing paid (wizard y "que me
// llamen", ver app/lp/[slug]/tarificador y /llamada) son de por sí un funnel
// de captura — no queremos que el asistente compita con el CTA principal,
// sea cual sea el slug. La landing /lp/[slug] en sí NO se excluye aquí: eso
// lo decide admin desde su editor por landing (hideAssistant).
const LP_FUNNEL_SUBPATH = /^\/lp\/[^/]+\/(tarificador|llamada)(\/|$)/;

export function isAssistantAllowed(pathname: string, extraExcludedPaths: string[] = []): boolean {
  if (EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  if (LP_FUNNEL_SUBPATH.test(pathname)) return false;
  if (extraExcludedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  return true;
}

const DEFAULT_CONTEXT: AssistantContext = {
  greeting: "Soy el asistente de Ventajon. ¿En qué puedo ayudarte hoy?",
};

const CONTEXTS: { test: (p: string) => boolean; context: AssistantContext }[] = [
  { test: (p) => p === "/", context: {
    greeting: "¿Buscas comparar precios de seguros? Cuéntame qué necesitas y te ayudo ahora mismo.",
  } },
  { test: (p) => p.startsWith("/seguro-de-salud"), context: {
    greeting: "¿Quieres ver cuánto pagarías por tu seguro de salud? Puedo calculártelo aquí mismo, sin salir de la página.",
    suggestedProducto: "salud",
  } },
  { test: (p) => p.startsWith("/seguro-de-vida"), context: {
    greeting: "¿Te preparo un cálculo orientativo de tu seguro de vida? Solo son un par de minutos.",
    suggestedProducto: "vida",
  } },
  { test: (p) => p.startsWith("/seguro-de-auto"), context: {
    greeting: "¿Comparamos tu seguro de coche o moto? Te doy un precio orientativo al momento.",
    suggestedProducto: "auto",
  } },
  { test: (p) => p.startsWith("/seguro-de-decesos"), context: {
    greeting: "¿Te preparo un cálculo orientativo de tu seguro de decesos? Solo son un par de minutos.",
    suggestedProducto: "decesos",
  } },
  { test: (p) => p.startsWith("/seguro-de-hogar"), context: {
    greeting: "Cuéntame un poco sobre tu vivienda y te paso con un asesor de seguro de hogar.",
  } },
  { test: (p) => p.startsWith("/actualidad"), context: {
    greeting: "¿Buscas comparar precios de seguros? Puedo calculártelo aquí mismo.",
  } },
  { test: (p) => p.startsWith("/quienes-somos"), context: {
    greeting: "¿Quieres que te ayude a comparar tu seguro? Cuéntame qué necesitas.",
  } },
];

export function getAssistantContext(pathname: string): AssistantContext {
  return CONTEXTS.find((c) => c.test(pathname))?.context ?? DEFAULT_CONTEXT;
}

/* ------------------------- Mini-flujos nativos ---------------------------- */
// Hogar y "tengo una duda" no tienen tarificador propio: se recogen unas
// pocas respuestas fijas que luego se resumen en un texto legible
// (`detalleConsulta`), visible como nota en la ficha del lead en /admin, y
// se piden los datos de contacto con el mismo formulario/consentimientos
// que el resto de la web.

export type MiniFlowOption = { label: string; value: string };
export type MiniFlowQuestion = { key: string; title: string; options: MiniFlowOption[] };

export const HOGAR_FLOW: MiniFlowQuestion[] = [
  {
    key: "tipo_vivienda",
    title: "¿Qué tipo de vivienda quieres asegurar?",
    options: [
      { label: "Piso", value: "piso" },
      { label: "Casa o chalet", value: "casa o chalet" },
    ],
  },
  {
    key: "propiedad",
    title: "¿Es tuya o de alquiler?",
    options: [
      { label: "Es mía", value: "vivienda en propiedad" },
      { label: "De alquiler", value: "vivienda de alquiler" },
    ],
  },
  {
    key: "tiene_seguro",
    title: "¿Ya tienes seguro de hogar contratado?",
    options: [
      { label: "Sí, quiero comparar precio", value: "ya tiene seguro de hogar, quiere comparar" },
      { label: "No, quiero contratar uno", value: "no tiene seguro de hogar, quiere contratar" },
    ],
  },
];

export function summarizeAnswers(productoLabel: string, answers: Record<string, string>): string {
  const values = Object.values(answers);
  return `${productoLabel} — ${values.join("; ")}.`;
}

/* --------------------------- "Tengo una duda" ----------------------------- */
// A diferencia de hogar, aquí primero se intenta localizar el
// presupuesto del cliente (mismo dato único que usa el área de cliente:
// correo, teléfono o nº de presupuesto) para poder "abrir un ticket" sobre
// esa tarificación concreta. Los temas son botones fijos, pero siempre se
// puede añadir (o sustituir la selección por) un comentario escrito a mano.

export const TICKET_TOPICS: MiniFlowOption[] = [
  { label: "Dudas sobre las coberturas", value: "Dudas sobre las coberturas" },
  { label: "Quiero cambiar algo de mi presupuesto", value: "Quiere cambiar algo del presupuesto" },
  { label: "Dudas sobre el pago o la contratación", value: "Dudas sobre el pago o la contratación" },
  { label: "Quiero cancelar mi solicitud", value: "Quiere cancelar la solicitud" },
];

const PRODUCTO_DISPLAY: Record<string, string> = {
  salud: "tu seguro de salud",
  vida: "tu seguro de vida",
  auto: "tu seguro de auto",
  decesos: "tu seguro de decesos",
  hogar: "tu seguro de hogar",
};

export function productoDisplay(slug: string): string {
  return PRODUCTO_DISPLAY[slug] ?? "tu presupuesto";
}

export function summarizeTicket(topic: string | null, comment: string, presupuestoProducto?: string): string {
  const parts: string[] = [];
  if (presupuestoProducto) parts.push(`Sobre ${productoDisplay(presupuestoProducto)}`);
  if (topic) parts.push(topic);
  const trimmedComment = comment.trim();
  if (trimmedComment) parts.push(trimmedComment);
  return parts.length ? parts.join(" — ") : "Duda general";
}
