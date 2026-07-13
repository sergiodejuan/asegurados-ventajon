// Catálogos y tipos del CRM.

export const SOURCE_LABELS: Record<string, string> = {
  "tarificador-salud": "Tarificador salud",
  "tarificador-vida": "Tarificador vida",
  "quiero-que-me-llamen": "Quiero que me llamen",
};

export const STATUSES = ["nuevo", "contactado", "presupuestado", "ganado", "perdido"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  presupuestado: "Presupuestado",
  ganado: "Ganado",
  perdido: "Perdido",
};

export type Activity = {
  at: string;
  type: "alta" | "form" | "status" | "nextstep" | "note" | "contact";
  note: string;
  meta?: Record<string, unknown>;
};

// Registro de auditoría de consentimiento (prueba legal).
export type ConsentRecord = {
  at: string; // timestamp de servidor al recibir el envío
  ip: string;
  userAgent: string;
  source: string;
  page: string; // URL/origen del formulario
  privacidad: { granted: boolean; at?: string }; // at = timestamp de cliente al marcar
  contacto: { granted: boolean; at?: string };
  comercial: { granted: boolean; at?: string };
};

// Una entrada por cada envío de formulario (tarificador o "quiero que me
// llamen"), aunque el lead ya existiera — para ver el histórico completo de
// tarificaciones/presupuestos de un lead, no solo su ficha fusionada.
export type LeadSubmission = {
  id: string;
  at: string;
  source: string;
  producto: string;
  data: Record<string, unknown>;
};

export type Lead = {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  sources: string[];
  producto: string;
  status: Status;
  nextStep: string;
  nombre: string;
  telefono: string;
  email: string;
  codigoPostal: string;
  // Salud
  inicio: string;
  numAsegurados: number | null;
  coberturaDental: boolean | null;
  // Vida
  motivo: string;
  fumador: boolean | null;
  // Común
  fechaNacimiento: string;
  sexo: string;
  yaTieneSeguro: boolean | null;
  // Seguro actual (para comparar / presupuestar)
  seguroActualImporte: number | null;
  seguroActualPeriodo: string; // 'mes' | 'año'
  seguroActualServicios: string[];
  // Preferencia de horario para la llamada (formulario "quiero que me llamen")
  diaLlamada: string;
  turnoLlamada: string;
  // Presupuesto (tarificador) al que se vincula la solicitud, si procede
  // (p.ej. una reprogramación de llamada lanzada desde el área de cliente).
  presupuestoId: string;
  // Consentimientos (estado actual + auditoría completa)
  aceptaPrivacidad: boolean;
  autorizaContacto: boolean;
  aceptaComercial: boolean;
  consents: ConsentRecord[];
  // Atribución
  utm: Record<string, string | undefined>;
  activity: Activity[];
  // Histórico de tarificaciones / presupuestos (uno por envío de formulario).
  submissions: LeadSubmission[];
};

export type LeadDraft = Partial<
  Omit<Lead, "id" | "createdAt" | "updatedAt" | "status" | "activity" | "sources" | "consents" | "submissions">
>;

/* ------------------------------ Presupuestos -------------------------------- */
// Cada tarificación completada (salud o vida) se guarda además como entidad
// propia (no solo embebida en el lead), para poder clasificarla, hacerle
// seguimiento y cerrarla de forma independiente desde /admin/presupuestos.

export const PRESUPUESTO_STATUSES = [
  "nuevo",
  "en_seguimiento",
  "enviado",
  "negociando",
  "ganado",
  "perdido",
] as const;
export type PresupuestoStatus = (typeof PRESUPUESTO_STATUSES)[number];

export const PRESUPUESTO_STATUS_LABELS: Record<PresupuestoStatus, string> = {
  nuevo: "Nuevo",
  en_seguimiento: "En seguimiento",
  enviado: "Enviado",
  negociando: "Negociando",
  ganado: "Ganado",
  perdido: "Perdido",
};

export type PresupuestoNote = { id: string; at: string; texto: string };

// Elección real del cliente: aseguradora, precio y (si aplica) coberturas
// concretas que se le van a proponer/confirmar — se rellena cuando pide que
// le llamen sobre una compañía concreta desde la comparativa, o cuando un
// agente prepara un presupuesto a medida desde /admin/presupuestos.
export type PresupuestoEleccion = {
  compania: string;
  precio: number | null;
  condiciones?: string;
  servicios?: string[];
  at: string;
};

export type Presupuesto = {
  id: string;
  leadId: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string;
  source: string; // tarificador-salud | tarificador-vida | admin-manual
  producto: string; // salud | vida
  status: PresupuestoStatus;
  data: Record<string, unknown>; // datos del tarificador (mismo shape que LeadSubmission.data)
  precioAprox: number | null;
  notas: PresupuestoNote[];
  eleccion: PresupuestoEleccion | null;
  // Contacto denormalizado del lead en el momento de crear el presupuesto,
  // para poder listar/exportar sin tener que resolver cada lead.
  nombre: string;
  telefono: string;
  email: string;
};
