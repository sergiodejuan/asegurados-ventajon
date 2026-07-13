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
});
export type VidaInput = z.input<typeof vidaSchema>;

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
  presupuestoId: z.string().max(60).optional(),
  aceptaPrivacidad: consentPrivacidad,
  autorizaContacto: consentContacto,
  aceptaComercial: z.boolean().default(false),
  consent: consentClient,
  company: honeypot,
  utm: utmField,
});
export type CallRequestInput = z.input<typeof callRequestSchema>;
