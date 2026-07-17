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
// página, o el widget asistente flotante — para poder distinguirlo en el
// origen del lead sin tocar la atribución de marketing real (utm).
const origenField = z.enum(["web", "asistente"]).optional().default("web");

const dobField = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Usa el formato dd/mm/aaaa.")
  .refine((v) => {
    const [d, m, y] = v.split("/").map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const year = new Date().getFullYear();
    return y >= 1920 && y <= year - 17;
  }, "Revisa la fecha de nacimiento.");

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
  codigoPostal: z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos."),
  numAsegurados: z.number().int().min(1).max(9),
  fechaNacimiento: dobField,
  sexo: z.enum(["hombre", "mujer"]),
  coberturaDental: z.boolean(),
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
});
export type LeadInput = z.input<typeof leadSchema>;

/* -------------------------- Tarificador de vida --------------------------- */

export const vidaSchema = z.object({
  motivo: z.enum(["familia", "hipoteca", "ahorro", "otro"]),
  codigoPostal: z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos."),
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
});
export type VidaInput = z.input<typeof vidaSchema>;

/* -------------------------- Tarificador de auto ---------------------------- */

export const autoSchema = z.object({
  tipoVehiculo: z.enum(["coche", "moto"]),
  matricula: z.string().trim().max(12).optional().default(""),
  marcaVehiculo: z.string().trim().max(60).optional().default(""),
  modeloVehiculo: z.string().trim().max(60).optional().default(""),
  anioVehiculo: z.string().trim().max(4).optional().default(""),
  usoVehiculo: z.enum(["particular", "trabajo", "vtc_taxi"]),
  codigoPostal: z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos."),
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
});
export type AutoInput = z.input<typeof autoSchema>;

/* --------------------- Formulario "quiero que me llamen" ------------------- */

export const callRequestSchema = z.object({
  nombre: z.string().trim().max(120).optional().default(""),
  telefono: phoneField,
  codigoPostal: z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos."),
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
  codigoPostal: z.union([z.string().regex(/^\d{5}$/), z.literal("")]).optional().default(""),
  producto: z.string().max(40).optional().default(""),
  aceptaPrivacidad: consentPrivacidad,
  autorizaContacto: consentContacto,
  consent: consentClient,
  company: honeypot,
  utm: utmField,
});
export type ExitIntentInput = z.input<typeof exitIntentSchema>;

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
