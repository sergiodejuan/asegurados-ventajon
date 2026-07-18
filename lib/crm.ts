// Catálogos y tipos del CRM.

export const SOURCE_LABELS: Record<string, string> = {
  "tarificador-salud": "Tarificador salud",
  "tarificador-vida": "Tarificador vida",
  "tarificador-auto": "Tarificador auto",
  "quiero-que-me-llamen": "Quiero que me llamen",
  // Mismos tarificadores/formulario, pero completados dentro del widget
  // asistente flotante en vez de la página del tarificador — se distinguen
  // aquí para poder medir cuánto aporta el asistente sin mezclar los datos.
  "tarificador-salud-widget": "Tarificador salud (asistente)",
  "tarificador-vida-widget": "Tarificador vida (asistente)",
  "tarificador-auto-widget": "Tarificador auto (asistente)",
  "quiero-que-me-llamen-widget": "Quiero que me llamen (asistente)",
  // Tarificador embebido directamente en una landing de captación SEO
  // (/seguro-de-salud-las-palmas, /seguro-de-salud-barato…) en vez de la
  // página general /tarificador — la URL exacta queda en el campo "page"
  // del registro de consentimiento de cada lead.
  "tarificador-salud-seo": "Tarificador salud (landing SEO)",
  "calculadora-ahorro": "Calculadora de ahorro (landing SEO)",
  // Se ofrece cuando el usuario está a punto de abandonar un tarificador a
  // medias (ratón hacia la pestaña/cierre en escritorio, gesto de "atrás" en
  // móvil): un callback exprés de un solo campo (teléfono) para no perder el lead.
  "exit-intent": "Exit-intent (abandono)",
  // Landing de recursos descargables (guías/checklists) para Canarias y
  // Baleares: solo pide email, no teléfono — el lead se nutre igual para el
  // CRM y la newsletter, pero sin la fricción de una llamada.
  "guia-seguro-salud-canarias-baleares": "Guía seguro de salud (Canarias/Baleares)",
  "checklist-seguro-auto-canarias-baleares": "Checklist seguro de auto (Canarias/Baleares)",
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
  type: "alta" | "form" | "status" | "nextstep" | "note" | "contact" | "rgpd";
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
  // Cartera: a qué agente pertenece este lead ("" = sin asignar, visible
  // para todo el equipo). Permite que cada agente filtre "mi cartera".
  agenteAsignadoId: string;
  agenteAsignadoNombre: string;
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
  // Auto
  tipoVehiculo: string;
  matricula: string;
  marcaVehiculo: string;
  modeloVehiculo: string;
  anioVehiculo: string;
  usoVehiculo: string;
  antiguedadCarnet: string;
  coberturaDeseada: string;
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
  // Cada correo transaccional enviado a esta ficha (ver EmailLog más abajo).
  emails: EmailLog[];
  // RGPD: fecha de anonimización si el interesado ha ejercido su derecho de
  // supresión ("" = no se ha solicitado). Los datos identificativos se
  // sustituyen por marcadores; se conserva la traza de actividad como
  // prueba de que la solicitud se atendió (no se borra activity/consents).
  anonymizedAt: string;
};

export type LeadDraft = Partial<
  Omit<Lead, "id" | "createdAt" | "updatedAt" | "status" | "activity" | "sources" | "consents" | "submissions" | "emails">
>;

/* ------------------------------ Correos enviados ----------------------------- */
// Traza de cada correo transaccional enviado a un lead (resumen de
// comparativa, verificación de acceso al área de cliente...) — igual que
// cualquier CRM, registra cuándo se mandó y si consta que se abrió o se hizo
// clic en algún enlace. "abierto" depende de que el cliente de correo cargue
// imágenes (un píxel de 1x1 en el propio correo): algunos clientes (p.ej.
// Apple Mail con "Protección de la privacidad de Mail") precargan imágenes
// de forma automática aunque el destinatario no llegue a abrir el correo de
// verdad, así que esta métrica es orientativa, no una prueba exacta de
// lectura — limitación común a cualquier email marketing/transaccional, no
// de este código en concreto.

export const EMAIL_LOG_STATUSES = ["enviado", "abierto", "clic"] as const;
export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];

export const EMAIL_LOG_STATUS_LABELS: Record<EmailLogStatus, string> = {
  enviado: "Enviado", abierto: "Abierto", clic: "Clic",
};

export type EmailLog = {
  id: string;
  at: string; // envío
  to: string;
  subject: string;
  tipo: string; // "comparativa-resumen" | "verificacion-acceso" | ...
  status: EmailLogStatus; // el más avanzado alcanzado: enviado < abierto < clic
  openedAt: string; // "" si no consta
  openCount: number;
  clickedAt: string; // "" si no consta
  clickCount: number;
};

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

export type PresupuestoNote = { id: string; at: string; texto: string; agente?: string };

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
  // Agente que cerró el presupuesto (ganado/perdido) — para el ranking de
  // agentes en /admin/informes. "" si sigue abierto o no se identificó.
  closedBy: string;
  // Contacto denormalizado del lead en el momento de crear el presupuesto,
  // para poder listar/exportar sin tener que resolver cada lead.
  nombre: string;
  telefono: string;
  email: string;
};

/* ---------------------------------- Tareas ----------------------------------- */
// Recordatorios/agenda del equipo comercial, opcionalmente vinculados a un
// lead y/o presupuesto. Sustituye (y complementa) el campo de texto libre
// "Próximo paso" con algo accionable y con fecha real.

export type Task = {
  id: string;
  leadId: string; // "" si no está vinculada a un lead
  presupuestoId: string; // "" si no está vinculada a un presupuesto
  titulo: string;
  notas: string;
  fecha: string; // yyyy-mm-dd
  hora: string; // HH:MM, opcional ("" si no se fija)
  agente: string; // nombre libre de quien la creó/debe hacerla
  completada: boolean;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskDraft = {
  leadId?: string;
  presupuestoId?: string;
  titulo: string;
  notas?: string;
  fecha: string;
  hora?: string;
  agente?: string;
};

/* --------------------------------- Llamadas ----------------------------------- */
// "Quiero que me llamen" pasa de ser solo un par de campos sueltos en el
// lead (diaLlamada/turnoLlamada) a una entidad propia con su propio
// seguimiento — igual que Presupuesto —, para poder gestionarla desde su
// propia sección en /admin (filtrar por ramo/fecha/agente, dejar
// comentarios, reprogramar, cerrar o marcar como hecha) sin perder la
// trazabilidad en la ficha del lead.

export const LLAMADA_STATUSES = ["pendiente", "programada", "hecha", "cancelada"] as const;
export type LlamadaStatus = (typeof LLAMADA_STATUSES)[number];

export const LLAMADA_STATUS_LABELS: Record<LlamadaStatus, string> = {
  pendiente: "Pendiente",
  programada: "Programada",
  hecha: "Hecha",
  cancelada: "Cancelada",
};

export type LlamadaNote = { id: string; at: string; texto: string; agente?: string };

export type Llamada = {
  id: string;
  leadId: string;
  createdAt: string;
  updatedAt: string;
  status: LlamadaStatus;
  producto: string; // ramo de seguro
  source: string; // de dónde vino la solicitud (misma fuente que el lead)
  presupuestoId: string; // "" si no viene vinculada a un presupuesto concreto
  motivo: string; // detalle de la consulta (p.ej. el ticket del asistente), "" si no aplica
  diaLlamada: string; // preferencia original del cliente ("Cuando sea" por defecto)
  turnoLlamada: string;
  fechaProgramada: string; // yyyy-mm-dd, la concreta que fija el agente al reprogramar
  horaProgramada: string; // HH:MM, opcional
  agente: string; // quien la gestiona actualmente
  notas: LlamadaNote[];
  // Contacto denormalizado (para listar/filtrar sin resolver el lead)
  nombre: string;
  telefono: string;
  codigoPostal: string;
};

export type LlamadaDraft = {
  leadId: string;
  producto?: string;
  source?: string;
  presupuestoId?: string;
  motivo?: string;
  diaLlamada?: string;
  turnoLlamada?: string;
  // Fecha concreta ya elegida por el cliente en el selector de huecos
  // (dentro de los próximos días laborables disponibles), si la hay.
  fechaProgramada?: string;
  nombre?: string;
  telefono?: string;
  codigoPostal?: string;
};

/* ----------------------------- Notificaciones al cliente ----------------------------- */
// Aviso visible en el área de cliente (y, si hay suscripción push activa,
// también como notificación del sistema) cuando gestionamos una de sus
// llamadas — reprogramada, cerrada o cancelada.

export type ClientNotification = {
  id: string;
  leadId: string;
  llamadaId: string;
  at: string;
  texto: string;
  leido: boolean;
  // A dónde debe llevar al cliente si toca el aviso. "" = sin destino
  // específico (el centro de notificaciones usa /area-cliente por defecto).
  url: string;
};

/* --------------------------- Valoración (NPS) --------------------------- */
// Encuesta de satisfacción de una sola pregunta (0-10, estilo Net Promoter
// Score) que se ofrece justo al cerrar una llamada ("hecha") o al ganar un
// presupuesto (contratado) — el momento en el que la experiencia está más
// fresca. Se vincula a UNA llamada o UN presupuesto (nunca ambos), vía el
// mismo id que ya identifica a esa entidad (aleatorio, impredecible), así
// que el enlace de la encuesta no necesita sesión ni login.

export type NpsResponse = {
  id: string;
  refId: string; // id de la Llamada o el Presupuesto sobre el que se pregunta
  refType: "llamada" | "presupuesto";
  leadId: string;
  producto: string;
  score: number; // 0-10
  comentario: string;
  quiereResena: boolean; // true si score >= 9 y llegó a ver el enlace a la reseña
  createdAt: string;
};

export type NpsCategory = "promotor" | "pasivo" | "detractor";
export function npsCategory(score: number): NpsCategory {
  if (score >= 9) return "promotor";
  if (score >= 7) return "pasivo";
  return "detractor";
}

/* ------------------------------- Agentes -------------------------------- */
// Cada persona del equipo comercial tiene su propia cuenta (login, foto,
// disponibilidad) en vez de compartir un único ADMIN_TOKEN. El ADMIN_TOKEN
// sigue funcionando como acceso maestro (nunca se puede quedar el equipo sin
// entrar al panel), pero las acciones del día a día quedan atribuidas a la
// persona real que las hizo — como en cualquier CRM.

export const ADMIN_MODULES = [
  "leads", "presupuestos", "llamadas", "tareas", "blog", "campana",
  "productos", "informes", "rgpd", "configuracion", "agentes", "exitintents",
] as const;
export type AdminModule = (typeof ADMIN_MODULES)[number];

export const ADMIN_MODULE_LABELS: Record<AdminModule, string> = {
  leads: "Leads", presupuestos: "Presupuestos", llamadas: "Llamadas", tareas: "Tareas",
  blog: "Blog", campana: "Campaña", productos: "Productos", informes: "Informes y analítica",
  rgpd: "RGPD", configuracion: "Configuración y diseño", agentes: "Agentes y permisos",
  exitintents: "Exit-intent (web general)",
};

export const AGENT_ROLES = ["admin", "agente"] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const WORK_DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes"] as const;
export type WorkDay = (typeof WORK_DAYS)[number];
export const WORK_DAY_LABELS: Record<WorkDay, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes",
};

export type DayShift = { manana: boolean; tarde: boolean };
export type AgentAvailability = Record<WorkDay, DayShift>;

export function emptyAvailability(): AgentAvailability {
  return { lunes: { manana: false, tarde: false }, martes: { manana: false, tarde: false }, miercoles: { manana: false, tarde: false }, jueves: { manana: false, tarde: false }, viernes: { manana: false, tarde: false } };
}
export function fullTimeAvailability(): AgentAvailability {
  return { lunes: { manana: true, tarde: true }, martes: { manana: true, tarde: true }, miercoles: { manana: true, tarde: true }, jueves: { manana: true, tarde: true }, viernes: { manana: true, tarde: true } };
}

export type Agent = {
  id: string;
  nombre: string;
  email: string;
  passwordHash: string;
  fotoUrl: string;
  rol: AgentRole;
  // Se ignora si rol === "admin" (acceso total siempre). Para rol "agente",
  // solo puede ver/usar los módulos listados aquí.
  permisos: AdminModule[];
  disponibilidad: AgentAvailability;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
};

export type AgentDraft = {
  nombre: string; email: string; fotoUrl?: string; rol?: AgentRole;
  permisos?: AdminModule[]; disponibilidad?: AgentAvailability; activo?: boolean;
  password?: string;
};

export function hasPermission(agent: Pick<Agent, "rol" | "permisos">, modulo: AdminModule): boolean {
  return agent.rol === "admin" || agent.permisos.includes(modulo);
}

// Nunca se manda el hash de la contraseña al cliente.
export type PublicAgent = Omit<Agent, "passwordHash">;
export function toPublicAgent(a: Agent): PublicAgent {
  const { passwordHash: _passwordHash, ...rest } = a;
  return rest;
}

/* ---------------------------- Registro de auditoría ----------------------------- */
// Historial general de acciones en el panel admin — igual que en cualquier
// CRM: quién hizo qué, cuándo y sobre qué ficha. Complementa (no sustituye)
// las notas propias de cada lead/presupuesto/llamada.

export type AuditAction = "crear" | "actualizar" | "eliminar" | "login" | "asignar" | "comentar";

export type AuditLog = {
  id: string;
  at: string;
  agenteId: string;
  agenteNombre: string;
  action: AuditAction;
  modulo: AdminModule | "auth";
  entidad: string; // "lead" | "presupuesto" | "llamada" | "tarea" | "agente" | "post" | "producto" | ...
  entidadId: string;
  resumen: string;
};
