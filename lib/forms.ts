import { SERVICIOS_SALUD, SERVICIOS_VIDA } from "./brand";

export type Option = { value: string; label: string; requiresDate?: boolean };

export type Step =
  | { type: "choice"; key: string; field: string; title: string; helper?: string; options: Option[]; showIf?: (d: FormData) => boolean }
  | { type: "yesno"; key: string; field: string; title: string; helper?: string; showIf?: (d: FormData) => boolean }
  | { type: "numbergrid"; key: string; field: string; title: string; helper?: string; showIf?: (d: FormData) => boolean }
  | { type: "dobsex"; key: string; title: string; helper?: string; showIf?: (d: FormData) => boolean }
  | { type: "cp"; key: string; title: string; helper?: string; showIf?: (d: FormData) => boolean }
  | { type: "seguroActual"; key: string; title: string; helper?: string; servicios: string[]; showIf?: (d: FormData) => boolean }
  | { type: "contact"; key: string; title: string; helper?: string; showIf?: (d: FormData) => boolean };

export type FormData = Record<string, unknown>;

export type FormConfig = {
  producto: string;
  endpoint: string;
  steps: Step[];
};

export const SALUD_CONFIG: FormConfig = {
  producto: "salud",
  endpoint: "/api/lead",
  steps: [
    {
      type: "choice", key: "inicio", field: "inicio",
      title: "¿Cuándo quieres que empiece tu seguro?",
      helper: "Sin compromiso: solo nos ayuda a preparar tu comparativa.",
      options: [
        { value: "cuanto_antes", label: "Cuanto antes" },
        { value: "proximo_mes", label: "El mes que viene" },
        { value: "fecha_personalizada", label: "Elegir fecha", requiresDate: true },
        { value: "comparando", label: "Aún estoy comparando" },
      ],
    },
    { type: "cp", key: "cp", title: "¿Cuál es tu código postal?", helper: "Para ajustar la comparativa a tu zona." },
    { type: "numbergrid", key: "asegurados", field: "numAsegurados", title: "¿Cuántas personas queréis aseguraros?", helper: "Cuéntalas incluyéndote a ti." },
    { type: "dobsex", key: "titular", title: "Datos de la persona titular", helper: "Solo la titular; a las demás las añadimos después." },
    { type: "yesno", key: "dental", field: "coberturaDental", title: "¿Quieres que incluya cobertura dental?", helper: "Puedes cambiarlo luego con tu asesor." },
    { type: "yesno", key: "tiene", field: "yaTieneSeguro", title: "¿Ya tienes un seguro de salud?", helper: "Nos ayuda a compararlo con lo que ya pagas." },
    { type: "seguroActual", key: "actual", title: "Tu seguro de salud actual", helper: "Para poder compararlo y ajustar el presupuesto.", servicios: SERVICIOS_SALUD, showIf: (d) => d.yaTieneSeguro === true },
    { type: "contact", key: "contacto", title: "Ya casi está" },
  ],
};

export const VIDA_CONFIG: FormConfig = {
  producto: "vida",
  endpoint: "/api/vida",
  steps: [
    {
      type: "choice", key: "motivo", field: "motivo",
      title: "¿Para qué quieres el seguro de vida?",
      helper: "Nos ayuda a orientar tu comparativa.",
      options: [
        { value: "familia", label: "Proteger a mi familia" },
        { value: "hipoteca", label: "Cubrir mi hipoteca" },
        { value: "ahorro", label: "Ahorro e inversión" },
        { value: "otro", label: "Otro motivo" },
      ],
    },
    { type: "cp", key: "cp", title: "¿Cuál es tu código postal?", helper: "Para ajustar la comparativa a tu zona." },
    { type: "dobsex", key: "titular", title: "Tus datos", helper: "La edad influye en el precio del seguro de vida." },
    { type: "yesno", key: "fumador", field: "fumador", title: "¿Fumas?", helper: "Es un dato clave para calcular tu seguro de vida." },
    { type: "yesno", key: "tiene", field: "yaTieneSeguro", title: "¿Ya tienes un seguro de vida?", helper: "Nos ayuda a compararlo con lo que ya pagas." },
    { type: "seguroActual", key: "actual", title: "Tu seguro de vida actual", helper: "Para poder compararlo y ajustar el presupuesto.", servicios: SERVICIOS_VIDA, showIf: (d) => d.yaTieneSeguro === true },
    { type: "contact", key: "contacto", title: "Ya casi está" },
  ],
};
