import { SERVICIOS_SALUD, SERVICIOS_VIDA, SERVICIOS_AUTO } from "./brand";

export type Option = { value: string; label: string; requiresDate?: boolean };

export type Step =
  | { type: "choice"; key: string; field: string; title: string; helper?: string; options: Option[]; phase: number; showIf?: (d: FormData) => boolean }
  | { type: "yesno"; key: string; field: string; title: string; helper?: string; phase: number; showIf?: (d: FormData) => boolean }
  | { type: "numbergrid"; key: string; field: string; title: string; helper?: string; phase: number; showIf?: (d: FormData) => boolean }
  | { type: "dobsex"; key: string; title: string; helper?: string; phase: number; showIf?: (d: FormData) => boolean }
  | { type: "seguroActual"; key: string; title: string; helper?: string; servicios: string[]; phase: number; showIf?: (d: FormData) => boolean }
  | { type: "matricula"; key: string; title: string; helper?: string; phase: number; showIf?: (d: FormData) => boolean }
  | { type: "vehiculo"; key: string; title: string; helper?: string; phase: number; showIf?: (d: FormData) => boolean }
  | { type: "contact"; key: string; title: string; helper?: string; phase: number; showIf?: (d: FormData) => boolean };

export type FormData = Record<string, unknown>;

// Fases con nombre para el indicador de avance (ver components/StepForm.tsx),
// inspirado en el patrón de Línea Directa: en vez de "Paso X de Y" a secas,
// se agrupan los pasos en 2-3 bloques con sentido para quien rellena el
// formulario ("Tu vehículo" → "Tu seguro" → "Tu precio").
export type FormConfig = {
  producto: string;
  endpoint: string;
  phaseLabels: string[];
  steps: Step[];
};

// Reemplaza al antiguo paso de código postal: basta con saber en qué zona
// vive para ajustar la comparativa (traslados interinsulares, red de
// talleres, etc. — ver los posts de actualidad sobre seguros en Canarias y
// Baleares). El valor sigue viajando en el campo "codigoPostal" a propósito
// (ver lib/schema.ts y lib/manychat.ts): así no hace falta tocar la
// variable que ya lee la automatización de ManyChat, solo cambia lo que
// contiene.
export const ZONA_OPTIONS: Option[] = [
  { value: "Islas Canarias", label: "Islas Canarias" },
  { value: "Islas Baleares", label: "Islas Baleares" },
  { value: "Península", label: "Península" },
];

export const SALUD_CONFIG: FormConfig = {
  producto: "salud",
  endpoint: "/api/lead",
  phaseLabels: ["Tu seguro", "Tus datos", "Tu precio"],
  steps: [
    {
      type: "choice", key: "inicio", field: "inicio", phase: 0,
      title: "¿Cuándo quieres que empiece tu seguro?",
      helper: "Sin compromiso: solo nos ayuda a preparar tu comparativa.",
      options: [
        { value: "cuanto_antes", label: "Cuanto antes" },
        { value: "proximo_mes", label: "El mes que viene" },
        { value: "fecha_personalizada", label: "Elegir fecha", requiresDate: true },
        { value: "comparando", label: "Aún estoy comparando" },
      ],
    },
    { type: "choice", key: "zona", field: "codigoPostal", phase: 0, title: "¿Dónde vives?", helper: "Para ajustar la comparativa a tu zona.", options: ZONA_OPTIONS },
    { type: "numbergrid", key: "asegurados", field: "numAsegurados", phase: 0, title: "¿Cuántas personas queréis aseguraros?", helper: "Cuéntalas incluyéndote a ti." },
    { type: "dobsex", key: "titular", phase: 1, title: "Datos de la persona titular", helper: "Solo la titular; a las demás las añadimos después." },
    { type: "yesno", key: "dental", field: "coberturaDental", phase: 1, title: "¿Quieres que incluya cobertura dental?", helper: "Puedes cambiarlo luego con tu asesor." },
    { type: "yesno", key: "tiene", field: "yaTieneSeguro", phase: 1, title: "¿Ya tienes un seguro de salud?", helper: "Nos ayuda a compararlo con lo que ya pagas." },
    { type: "seguroActual", key: "actual", phase: 1, title: "Tu seguro de salud actual", helper: "Para poder compararlo y ajustar el presupuesto.", servicios: SERVICIOS_SALUD, showIf: (d) => d.yaTieneSeguro === true },
    { type: "contact", key: "contacto", phase: 2, title: "Ya casi está" },
  ],
};

export const VIDA_CONFIG: FormConfig = {
  producto: "vida",
  endpoint: "/api/vida",
  phaseLabels: ["Tu seguro", "Tus datos", "Tu precio"],
  steps: [
    {
      type: "choice", key: "motivo", field: "motivo", phase: 0,
      title: "¿Para qué quieres el seguro de vida?",
      helper: "Nos ayuda a orientar tu comparativa.",
      options: [
        { value: "familia", label: "Proteger a mi familia" },
        { value: "hipoteca", label: "Cubrir mi hipoteca" },
        { value: "ahorro", label: "Ahorro e inversión" },
        { value: "otro", label: "Otro motivo" },
      ],
    },
    { type: "choice", key: "zona", field: "codigoPostal", phase: 0, title: "¿Dónde vives?", helper: "Para ajustar la comparativa a tu zona.", options: ZONA_OPTIONS },
    { type: "dobsex", key: "titular", phase: 1, title: "Tus datos", helper: "La edad influye en el precio del seguro de vida." },
    { type: "yesno", key: "fumador", field: "fumador", phase: 1, title: "¿Fumas?", helper: "Es un dato clave para calcular tu seguro de vida." },
    { type: "yesno", key: "tiene", field: "yaTieneSeguro", phase: 1, title: "¿Ya tienes un seguro de vida?", helper: "Nos ayuda a compararlo con lo que ya pagas." },
    { type: "seguroActual", key: "actual", phase: 1, title: "Tu seguro de vida actual", helper: "Para poder compararlo y ajustar el presupuesto.", servicios: SERVICIOS_VIDA, showIf: (d) => d.yaTieneSeguro === true },
    { type: "contact", key: "contacto", phase: 2, title: "Ya casi está" },
  ],
};

export const AUTO_CONFIG: FormConfig = {
  producto: "auto",
  endpoint: "/api/auto",
  phaseLabels: ["Tu vehículo", "Tu seguro", "Tu precio"],
  steps: [
    {
      type: "choice", key: "tipoVehiculo", field: "tipoVehiculo", phase: 0,
      title: "¿Qué quieres asegurar?",
      helper: "Adaptamos las preguntas siguientes a tu vehículo.",
      options: [
        { value: "coche", label: "Coche" },
        { value: "moto", label: "Moto" },
      ],
    },
    { type: "matricula", key: "matricula", phase: 0, title: "¿Cuál es tu matrícula?", helper: "Nos ayuda a identificar tu vehículo. Si no la tienes a mano, puedes indicarlo a continuación." },
    { type: "vehiculo", key: "vehiculo", phase: 0, title: "Cuéntanos sobre tu vehículo", helper: "Marca, modelo y año de matriculación.", showIf: (d) => d.matriculaDesconocida === true },
    {
      type: "choice", key: "uso", field: "usoVehiculo", phase: 0,
      title: "¿Cómo usas el vehículo?",
      helper: "El uso influye en el precio del seguro.",
      options: [
        { value: "particular", label: "Uso particular" },
        { value: "trabajo", label: "Trabajo (autónomo o empresa)" },
        { value: "vtc_taxi", label: "VTC o taxi" },
      ],
    },
    { type: "choice", key: "zona", field: "codigoPostal", phase: 1, title: "¿Dónde se guarda habitualmente?", helper: "Para ajustar la comparativa a tu zona.", options: ZONA_OPTIONS },
    { type: "dobsex", key: "titular", phase: 1, title: "Datos del conductor principal", helper: "La edad influye en el precio del seguro de auto." },
    {
      type: "choice", key: "carnet", field: "antiguedadCarnet", phase: 1,
      title: "¿Cuánto tiempo llevas con el carnet?",
      helper: "Es uno de los factores que más influyen en el precio.",
      options: [
        { value: "menos_2", label: "Menos de 2 años" },
        { value: "2_5", label: "Entre 2 y 5 años" },
        { value: "mas_5", label: "Más de 5 años" },
      ],
    },
    {
      type: "choice", key: "cobertura", field: "coberturaDeseada", phase: 1,
      title: "¿Qué cobertura te interesa?",
      helper: "Si no lo tienes claro, tu asesor te ayuda a elegir.",
      options: [
        { value: "terceros", label: "Terceros" },
        { value: "terceros_ampliado", label: "Terceros ampliado" },
        { value: "todo_riesgo", label: "Todo riesgo" },
        { value: "no_lo_tengo_claro", label: "No lo tengo claro" },
      ],
    },
    { type: "yesno", key: "tiene", field: "yaTieneSeguro", phase: 1, title: "¿Ya tienes seguro de auto?", helper: "Nos ayuda a compararlo con lo que ya pagas." },
    { type: "seguroActual", key: "actual", phase: 1, title: "Tu seguro de auto actual", helper: "Para poder compararlo y ajustar el presupuesto.", servicios: SERVICIOS_AUTO, showIf: (d) => d.yaTieneSeguro === true },
    { type: "contact", key: "contacto", phase: 2, title: "Ya casi está" },
  ],
};
