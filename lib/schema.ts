import { z } from "zod";

export function normalizePhone(raw: string): string {
  return raw.replace(/[\s.-]/g, "").replace(/^(\+?34)/, "");
}

const phoneField = z
  .string()
  .transform(normalizePhone)
  .refine((v) => /^[6-9]\d{8}$/.test(v), {
    message: "Introduce un móvil español válido (9 dígitos).",
  });

// Sigue llamándose "codigoPostal" a propósito (ver lib/forms.ts): mismo
// campo/variable que antes llevaba un código postal de 5 dígitos, ahora con
// la zona de residencia — así no hace falta tocar la automatización de
// ManyChat, que ya lee esta variable.
const zonaField = z.enum(["Islas Canarias", "Islas Baleares", "Península"], {
  errorMap: () => ({ message: "Selecciona dónde vives." }),
});

const utmField = z
  .object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    content: z.string().optional(),
    term: z.string().optional(),
    referrer: z.string().optional(),
    landingPage: z.string().optional(),
  })
  .partial()
  .optional();

// Marcas de tiempo de cliente al marcar cada check (auditoría legal).
const consentClient = z
  .object({
    privacidadAt: z.string().optional(),
    contactoAt: z.string().optional(),
    comercialAt: z.string().optional(),
  })
  .partial()
  .optional();

const consentPrivacidad = z.literal(true, {
  errorMap: () => ({ message: "Necesitamos que aceptes la política de privacidad." }),
});
const consentContacto = z.literal(true, {
  errorMap: () => ({ message: "Necesitamos tu autorización para poder llamarte." }),
});

const honeypot = z.string().max(0).optional().default("");

// De dónde viene el envío dentro de la propia web: formulario normal de la
// página, el widget asistente flotante, o el tarificador embebido en una
// landing de captación SEO — para poder distinguirlo en el origen del lead
// sin tocar la atribución de marketing real (utm).
const origenField = z.enum(["web", "asistente", "seo-landing", "lp-salud"]).optional().default("web");

const dobField = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Usa el formato dd/mm/aaaa.")
  .refine((v) => {
    const [d, m, y] = v.split("/").map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const year = new Date().getFullYear();
    return y >= 1920 && y <= year - 17;
  }, "Revisa la fecha de nacimiento.");

// Igual que dobField pero sin exigir mayoría de edad — para asegurados
// adicionales (hijos, etc.), no solo el titular/contratante.
const dobAnyAgeField = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Usa el formato dd/mm/aaaa.")
  .refine((v) => {
    const [d, m, y] = v.split("/").map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const year = new Date().getFullYear();
    return y >= 1920 && y <= year;
  }, "Revisa la fecha de nacimiento.");

// Campos de identificación pensados para la futura integración con
// Codescopic (ver payload de referencia): tipo + número de documento,
// apellidos separados y código postal real. Sin validación de letra de
// control (DNI/NIE): solo formato, la validación fuerte la hará Codescopic.
const documentoTipoField = z.enum(["Dni", "Nie"], { errorMap: () => ({ message: "Selecciona el tipo de documento." }) });
function normalizeDocumento(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
}
const documentoField = z
  .string()
  .transform(normalizeDocumento)
  .refine((v) => /^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(v), { message: "Revisa el DNI o NIE (formato no válido)." });
const codigoPostalRealField = z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos.");

// Asegurados adicionales (más allá del titular): solo género y fecha de
// nacimiento, recogidos de forma ligera dentro del propio tarificador — el
// resto de datos de cada uno (documento, dirección…) se completan más
// adelante, no en este primer contacto.
const aseguradoAdicionalSchema = z.object({
  fechaNacimiento: dobAnyAgeField,
  sexo: z.enum(["hombre", "mujer"]),
});

// Seguro actual (opcional) para comparar / presupuestar.
const importeField = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().nonnegative().max(100000).optional()
);
const seguroActual = {
  seguroActualImporte: importeField,
  seguroActualPeriodo: z.enum(["mes", "año"]).optional().default("mes"),
  seguroActualServicios: z.array(z.string().max(60)).max(20).optional().default([]),
};

/* ------------------------- Tarificador de salud --------------------------- */

export const leadSchema = z.object({
  inicio: z.enum(["cuanto_antes", "proximo_mes", "fecha_personalizada", "comparando"]),
  fechaInicioPersonalizada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.").optional(),
  codigoPostal: zonaField,
  numAsegurados: z.number().int().min(1).max(9),
  fechaNacimiento: dobField,
  sexo: z.enum(["hombre", "mujer"]),
  // Preparado para la futura integración con Codescopic: documento de
  // identidad, código postal real (además de la "zona" ya existente) y si
  // fuma, que su payload pide del titular y de cada asegurado.
  documentoTipo: documentoTipoField,
  documento: documentoField,
  codigoPostalReal: codigoPostalRealField,
  fumador: z.boolean(),
  aseguradosAdicionales: z.array(aseguradoAdicionalSchema).max(8).optional().default([]),
  coberturaDental: z.boolean(),
  yaTieneSeguro: z.boolean(),
  ...seguroActual,
  nombre: z.string().trim().min(2, "Dinos tu nombre.").max(120),
  apellido1: z.string().trim().min(2, "Dinos tu primer apellido.").max(60),
  apellido2: z.string().trim().max(60).optional().default(""),
  telefono: phoneField,
  email: z.string().trim().toLowerCase().email("Revisa tu correo electrónico."),
  aceptaPrivacidad: consentPrivacidad,
  autorizaContacto: consentContacto,
  aceptaComercial: z.boolean().default(false),
  consent: consentClient,
  company: honeypot,
  utm: utmField,
  origen: origenField,
  turnstileToken: z.string().max(2000).optional().default(""),
});
export type LeadInput = z.input<typeof leadSchema>;

/* -------------------------- Tarificador de vida --------------------------- */

export const vidaSchema = z.object({
  motivo: z.enum(["familia", "hipoteca", "ahorro", "otro"]),
  codigoPostal: zonaField,
  fechaNacimiento: dobField,
  sexo: z.enum(["hombre", "mujer"]),
  fumador: z.boolean(),
  yaTieneSeguro: z.boolean(),
  ...seguroActual,
  nombre: z.string().trim().min(2, "Dinos tu nombre.").max(120),
  telefono: phoneField,
  email: z.string().trim().toLowerCase().email("Revisa tu correo electrónico."),
  aceptaPrivacidad: consentPrivacidad,
  autorizaContacto: consentContacto,
  aceptaComercial: z.boolean().default(false),
  consent: consentClient,
  company: honeypot,
  utm: utmField,
  origen: origenField,
  turnstileToken: z.string().max(2000).optional().default(""),
});
export type VidaInput = z.input<typeof vidaSchema>;

/* ------------------------- Tarificador de decesos -------------------------- */

export const decesosSchema = z.object({
  paraQuien: z.enum(["para_mi", "familiar", "toda_familia"]),
  // Si es "para_mi" el paso de nº de asegurados no llega a mostrarse (ver
  // lib/forms.ts showIf), así que el valor nunca llega en el envío.
  numAsegurados: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 1 : Number(v)),
    z.number().int().min(1).max(9)
  ).optional().default(1),
  codigoPostal: zonaField,
  fechaNacimiento: dobField,
  sexo: z.enum(["hombre", "mujer"]),
  yaTieneSeguro: z.boolean(),
  ...seguroActual,
  nombre: z.string().trim().min(2, "Dinos tu nombre.").max(120),
  telefono: phoneField,
  email: z.string().trim().toLowerCase().email("Revisa tu correo electrónico."),
  aceptaPrivacidad: consentPrivacidad,
  autorizaContacto: consentContacto,
  aceptaComercial: z.boolean().default(false),
  consent: consentClient,
  company: honeypot,
  utm: utmField,
  origen: origenField,
  turnstileToken: z.string().max(2000).optional().default(""),
});
export type DecesosInput = z.input<typeof decesosSchema>;

/* -------------------------- Tarificador de auto ---------------------------- */

export const autoSchema = z.object({
  tipoVehiculo: z.enum(["coche", "moto"]),
  matricula: z.string().trim().max(12).optional().default(""),
  marcaVehiculo: z.string().trim().max(60).optional().default(""),
  modeloVehiculo: z.string().trim().max(60).optional().default(""),
  anioVehiculo: z.string().trim().max(4).optional().default(""),
  usoVehiculo: z.enum(["particular", "trabajo", "vtc_taxi"]),
  codigoPostal: zonaField,
  fechaNacimiento: dobField,
  sexo: z.enum(["hombre", "mujer"]),
  antiguedadCarnet: z.enum(["menos_2", "2_5", "mas_5"]),
  coberturaDeseada: z.enum(["terceros", "terceros_ampliado", "todo_riesgo", "no_lo_tengo_claro"]),
  yaTieneSeguro: z.boolean(),
  ...seguroActual,
  nombre: z.string().trim().min(2, "Dinos tu nombre.").max(120),
  telefono: phoneField,
  email: z.string().trim().toLowerCase().email("Revisa tu correo electrónico."),
  aceptaPrivacidad: consentPrivacidad,
  autorizaContacto: consentContacto,
  aceptaComercial: z.boolean().default(false),
  consent: consentClient,
  company: honeypot,
  utm: utmField,
  origen: origenField,
  turnstileToken: z.string().max(2000).optional().default(""),
});
export type AutoInput = z.input<typeof autoSchema>;

/* --------------------- Formulario "quiero que me llamen" ------------------- */

export const callRequestSchema = z.object({
  nombre: z.string().trim().max(120).optional().default(""),
  telefono: phoneField,
  codigoPostal: z.union([z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos."), z.literal("")]).optional().default(""),
  producto: z.string().max(40).optional().default("salud"),
  compania: z.string().max(60).optional(),
  precioElegido: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().nonnegative().max(100000).optional()
  ),
  diaLlamada: z.string().max(20).optional(),
  turnoLlamada: z.string().max(20).optional(),
  // Fecha concreta elegida en el selector de huecos (máx. 3 días laborables
  // vista), si el cliente llegó a elegir una en vez de dejarlo en "cuando sea".
  fechaProgramada: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional(),
  presupuestoId: z.string().max(60).optional(),
  // Resumen legible de las respuestas del asistente (p.ej. para decesos/hogar,
  // que no tienen tarificador propio): siempre construido por el widget a
  // partir de opciones fijas, nunca texto libre tecleado por el usuario.
  detalleConsulta: z.string().max(400).optional(),
  aceptaPrivacidad: consentPrivacidad,
  autorizaContacto: consentContacto,
  aceptaComercial: z.boolean().default(false),
  consent: consentClient,
  company: honeypot,
  utm: utmField,
  origen: origenField,
  turnstileToken: z.string().max(2000).optional().default(""),
});
export type CallRequestInput = z.input<typeof callRequestSchema>;

/* ------------------------- Exit-intent (callback exprés) ------------------- */
// Se ofrece justo cuando el usuario va a abandonar un tarificador a medias:
// a propósito solo pide el teléfono (sin código postal ni el resto de datos)
// para que la fricción sea mínima — es, literalmente, la última oportunidad
// antes de perder el lead.
export const exitIntentSchema = z.object({
  nombre: z.string().trim().max(120).optional().default(""),
  telefono: phoneField,
  // Viaja aquí la zona (ver zonaField): este modal solo lo lanza StepForm
  // sobre un tarificador a medias, que ya no pide código postal.
  codigoPostal: z.union([zonaField, z.literal("")]).optional().default(""),
  producto: z.string().max(40).optional().default(""),
  aceptaPrivacidad: consentPrivacidad,
  autorizaContacto: consentContacto,
  consent: consentClient,
  company: honeypot,
  utm: utmField,
  turnstileToken: z.string().max(2000).optional().default(""),
});
export type ExitIntentInput = z.input<typeof exitIntentSchema>;

/* ------------------- Calculadora de ahorro (landings SEO) ------------------ */
// Widget ligero embebido en las landings de captación pura (/seguro-de-salud-*):
// el usuario indica lo que paga ahora y cuántos asegurados tiene, ve un ahorro
// estimado al momento, y deja el teléfono para recibir su comparativa real —
// se guarda como lead aunque no llegue a completar el tarificador completo.
export const savingsCalculatorSchema = z.object({
  nombre: z.string().trim().max(120).optional().default(""),
  telefono: phoneField,
  pagoActual: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().nonnegative().max(2000).optional()
  ),
  numAsegurados: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 1 : Number(v)),
    z.number().int().min(1).max(20).default(1)
  ),
  slug: z.string().max(60),
  aceptaPrivacidad: consentPrivacidad,
  autorizaContacto: consentContacto,
  consent: consentClient,
  company: honeypot,
  utm: utmField,
  turnstileToken: z.string().max(2000).optional().default(""),
});
export type SavingsCalculatorInput = z.input<typeof savingsCalculatorSchema>;

/* --------------------- Recurso descargable (lead magnet) ------------------- */
// Landing de guías/checklists: solo email a cambio de la descarga, sin pedir
// teléfono — la contrapartida es más ligera y el objetivo es nutrir la
// newsletter, no necesariamente una llamada.
export const leadMagnetSchema = z.object({
  nombre: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().toLowerCase().email("Revisa tu correo electrónico."),
  guia: z.enum(["salud", "auto"]),
  aceptaPrivacidad: consentPrivacidad,
  aceptaComercial: z.boolean().default(false),
  consent: consentClient,
  company: honeypot,
  utm: utmField,
});
export type LeadMagnetInput = z.input<typeof leadMagnetSchema>;

/* --------------------- Igualación de precio (price-match) ------------------ */
// Formulario del flujo "¿ya tienes un precio? Te lo estudiamos". El usuario
// llega con presupuesto de otra compañía (habitualmente su renovación) y
// pide que le busquemos una alternativa igual o mejor. Se convierte en un
// lead con source="price-match" y un bloque `priceMatch` con los datos
// aportados — el equipo comercial trabaja el caso desde /admin.
//
// La captura (foto/PDF del presupuesto) es opcional pero muy útil para el
// asesor: viene comprimida desde el cliente como data URI hasta 900KB
// (mismo tope que resto del panel: ver components/admin/ImageField.tsx).
const capturaPresupuestoField = z
  .string()
  .max(900_000, "El archivo es demasiado grande.")
  .optional()
  .default("");

export const priceMatchSchema = z.object({
  producto: z.enum(["salud", "vida", "auto", "decesos", "hogar"]),
  companiaActual: z.string().trim().min(2, "Dinos qué compañía te lo ofrece.").max(120),
  precioActual: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("Debe ser un importe positivo.").max(100000, "El importe parece demasiado alto.")
  ),
  periodicidad: z.enum(["mes", "año"]),
  capturaUrl: capturaPresupuestoField,
  nombre: z.string().trim().min(2, "Dinos tu nombre.").max(120),
  telefono: phoneField,
  email: z.string().trim().toLowerCase().email("Revisa tu correo electrónico."),
  codigoPostal: zonaField,
  // Contexto opcional: le sirve al asesor para dimensionar el caso (renovar
  // caro, un asegurado con enfermedad preexistente...). Máx. 500 caracteres
  // para que no se convierta en un chat.
  comentario: z.string().trim().max(500).optional().default(""),
  aceptaPrivacidad: consentPrivacidad,
  autorizaContacto: consentContacto,
  aceptaComercial: z.boolean().default(false),
  consent: consentClient,
  company: honeypot,
  utm: utmField,
  turnstileToken: z.string().max(2000).optional().default(""),
});
export type PriceMatchInput = z.input<typeof priceMatchSchema>;
