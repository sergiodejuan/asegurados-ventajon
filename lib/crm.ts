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
  type: "alta" | "form" | "status" | "nextstep" | "note";
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
  // Consentimientos (estado actual + auditoría completa)
  aceptaPrivacidad: boolean;
  autorizaContacto: boolean;
  aceptaComercial: boolean;
  consents: ConsentRecord[];
  // Atribución
  utm: Record<string, string | undefined>;
  activity: Activity[];
};

export type LeadDraft = Partial<
  Omit<Lead, "id" | "createdAt" | "updatedAt" | "status" | "activity" | "sources" | "consents">
>;
