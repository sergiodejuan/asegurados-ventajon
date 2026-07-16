// Configuración del asistente flotante: en qué páginas aparece, qué saludo
// contextual mostrar en cada una, y las preguntas de los mini-flujos nativos
// para los productos que no tienen tarificador propio (decesos, hogar) o
// para "tengo una duda". Todo lo que responde el usuario son botones con
// opciones fijas, nunca texto libre — igual que el resto de tarificadores
// de la web.

export type AssistantProducto = "salud" | "vida" | "auto";

export type AssistantContext = {
  greeting: string;
  suggestedProducto?: AssistantProducto;
};

// Rutas donde el asistente NO debe aparecer: páginas que ya son en sí mismas
// un funnel de captura (tarificadores, mes gratis, quiero que me llamen), el
// área privada de cliente, páginas legales/de agradecimiento y todo /admin.
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
];

export function isAssistantAllowed(pathname: string): boolean {
  return !EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const DEFAULT_CONTEXT: AssistantContext = {
  greeting: "Hola 👋 Soy el asistente de Ventajon. ¿En qué puedo ayudarte hoy?",
};

const CONTEXTS: { test: (p: string) => boolean; context: AssistantContext }[] = [
  { test: (p) => p === "/", context: {
    greeting: "Hola 👋 ¿Buscas comparar precios de seguros? Cuéntame qué necesitas y te ayudo ahora mismo.",
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
    greeting: "Cuéntame un poco sobre lo que necesitas y te paso con un asesor de seguros de decesos.",
  } },
  { test: (p) => p.startsWith("/seguro-de-hogar"), context: {
    greeting: "Cuéntame un poco sobre tu vivienda y te paso con un asesor de seguro de hogar.",
  } },
  { test: (p) => p.startsWith("/comparativa"), context: {
    greeting: "¿Tienes dudas sobre tu comparativa? Dime qué necesitas y te ayudo o te paso con un asesor.",
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
// Decesos, hogar y "tengo una duda" no tienen tarificador propio: se
// recogen unas pocas respuestas fijas que luego se resumen en un texto
// legible (`detalleConsulta`), visible como nota en la ficha del lead en
// /admin, y se piden los datos de contacto con el mismo formulario/consentimientos
// que el resto de la web.

export type MiniFlowOption = { label: string; value: string };
export type MiniFlowQuestion = { key: string; title: string; options: MiniFlowOption[] };

export const DECESOS_FLOW: MiniFlowQuestion[] = [
  {
    key: "para_quien",
    title: "¿Para quién es el seguro de decesos?",
    options: [
      { label: "Para mí", value: "para mí" },
      { label: "Para un familiar", value: "para un familiar" },
      { label: "Para toda la familia", value: "para toda la familia" },
    ],
  },
  {
    key: "tiene_seguro",
    title: "¿Ya tienes un seguro de decesos contratado?",
    options: [
      { label: "Sí, quiero comparar precio", value: "ya tiene seguro de decesos, quiere comparar" },
      { label: "No, quiero contratar uno", value: "no tiene seguro de decesos, quiere contratar" },
    ],
  },
];

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

export const DUDA_FLOW: MiniFlowQuestion[] = [
  {
    key: "tema",
    title: "¿Sobre qué quieres que te ayudemos?",
    options: [
      { label: "Un seguro que ya tengo contratado", value: "duda sobre un seguro ya contratado" },
      { label: "Un presupuesto que ya me hicisteis", value: "duda sobre un presupuesto ya recibido" },
      { label: "Otra cosa", value: "otra duda" },
    ],
  },
];

export function summarizeAnswers(productoLabel: string, answers: Record<string, string>): string {
  const values = Object.values(answers);
  return `${productoLabel} — ${values.join("; ")}.`;
}
