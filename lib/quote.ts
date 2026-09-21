import { WHATSAPP_URL } from "./brand";
import type { PricingZona, ProductPricing, TramoEdad, DescuentoAsegurados } from "./catalog";

// Perfil resumido que viaja del tarificador a la página de comparativa (y de
// ahí a la página de cada compañía). Se guarda en sessionStorage: vive solo
// mientras dura la sesión del navegador, no es información persistida en servidor.
export type QuoteProfile = {
  id: string;
  // leadId del lead creado en el gate (salud). Ancla la tarificación real de
  // Codeoscopic, que ahora cuelga del lead y no de un presupuesto.
  leadId?: string;
  producto: "salud" | "vida" | "auto" | "decesos";
  createdAt: string;
  codigoPostal?: string;
  numAsegurados?: number;
  coberturaDental?: boolean;
  fechaNacimiento?: string; // dd/mm/aaaa
  sexo?: "hombre" | "mujer";
  motivo?: string; // vida
  fumador?: boolean; // vida
  paraQuien?: string; // decesos
  inicio?: string;
  // Auto
  tipoVehiculo?: string;
  matricula?: string;
  marcaVehiculo?: string;
  modeloVehiculo?: string;
  anioVehiculo?: string;
  usoVehiculo?: string;
  antiguedadCarnet?: string;
  coberturaDeseada?: string;
  // Contacto + consentimiento ya dados en el tarificador: si están presentes,
  // "quiero que me llamen" no debe volver a pedirlos.
  nombre?: string;
  telefono?: string;
  email?: string;
  consentAt?: { privacidadAt?: string; contactoAt?: string; comercialAt?: string };
  // Última preferencia de horario solicitada para este presupuesto (si el
  // cliente la reprogramó desde su área de cliente).
  diaLlamada?: string;
  turnoLlamada?: string;
};

const STORAGE_KEY = "ventajon:quote";
// Draft de payload de tarificación pendiente de completar con datos de
// contacto + consentimientos. Se guarda en sessionStorage cuando el
// tarificador termina los pasos técnicos, y la comparativa lo consume al
// completar el gate de contacto — en ese momento se crea el lead REAL en
// el backend. Antes esta captura estaba duplicada (tarificador + comparativa).
const DRAFT_KEY = "ventajon:leadDraft";

export function saveQuote(q: QuoteProfile) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(q)); } catch { /* sessionStorage no disponible */ }
}

export function loadQuote(): QuoteProfile | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QuoteProfile) : null;
  } catch {
    return null;
  }
}

export function updateQuote(patch: Partial<QuoteProfile>): QuoteProfile | null {
  const current = loadQuote();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveQuote(next);
  return next;
}

export type LeadDraftPayload = {
  producto: "salud" | "vida" | "auto" | "decesos";
  endpoint: string; // p. ej. "/api/lead" o "/api/vida"
  data: Record<string, unknown>; // payload SIN nombre/telefono/email/consents
};

export function saveLeadDraft(draft: LeadDraftPayload) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}

export function loadLeadDraft(): LeadDraftPayload | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as LeadDraftPayload) : null;
  } catch {
    return null;
  }
}

export function clearLeadDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
}

export function quoteNumber(id: string) {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase() || "000000";
}

export function ageFromDob(dob?: string): number | null {
  const m = dob?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  const today = new Date();
  let age = today.getFullYear() - y;
  const beforeBirthday = today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d);
  if (beforeBirthday) age--;
  return age;
}

export function saludPrice(base: { conCopago: number; sinCopago: number }, profile: Pick<QuoteProfile, "numAsegurados" | "coberturaDental">) {
  const n = Math.max(1, Math.min(9, profile.numAsegurados ?? 1));
  const dentalExtra = profile.coberturaDental ? 4 : 0;
  return {
    conCopago: (base.conCopago + dentalExtra) * n,
    sinCopago: (base.sinCopago + dentalExtra) * n,
  };
}

/* --------------------- Precios avanzados (tramos/zona/descuento) ---------- */
// La zona viaja en el perfil como etiqueta del tarificador ("Islas Canarias"…);
// la traducimos a la clave estable con la que se guardan los precios.
export function pricingZonaFromLabel(codigoPostal?: string): PricingZona {
  const s = (codigoPostal || "").toLowerCase();
  if (s.includes("canaria")) return "canarias";
  if (s.includes("balear")) return "baleares";
  return "peninsula";
}

// Tramo de edad que cubre la edad dada (o null si no hay configuración/edad).
export function resolveTramo(pricing: ProductPricing | undefined, edad: number | null): TramoEdad | null {
  if (!pricing?.tramos?.length || edad == null) return null;
  return pricing.tramos.find((t) => edad >= t.min && edad <= t.max) ?? null;
}

// Aplica el descuento por nº de asegurados a una prima total: se coge el de
// mayor `desde` que no supere el nº de asegurados. En € resta de la prima
// mensual total; en % la reduce.
export function applyNumInsuredDiscount(total: number, numAsegurados: number, descuentos?: DescuentoAsegurados[]): number {
  if (!descuentos?.length) return total;
  const aplicable = descuentos
    .filter((d) => numAsegurados >= d.desde)
    .sort((a, b) => b.desde - a.desde)[0];
  if (!aplicable) return total;
  const out = aplicable.tipo === "pct" ? total * (1 - aplicable.valor / 100) : total - aplicable.valor;
  return Math.max(0, Math.round(out * 100) / 100);
}

// Precio de salud de una opción NEGOCIADA teniendo en cuenta, si están
// configurados, los tramos de edad + zona y el descuento por nº de asegurados.
// Si no hay pricing avanzado, se comporta como saludPrice (precio plano).
export function saludPriceAdvanced(
  product: { precioConCopago?: number; precioSinCopago?: number; pricing?: ProductPricing },
  profile: Pick<QuoteProfile, "numAsegurados" | "coberturaDental" | "codigoPostal"> & { edad?: number | null },
): { conCopago: number; sinCopago: number } {
  const zona = pricingZonaFromLabel(profile.codigoPostal);
  const tramo = resolveTramo(product.pricing, profile.edad ?? null);
  const zonaPrecio = tramo?.porZona?.[zona];
  const baseCon = zonaPrecio?.conCopago ?? product.precioConCopago ?? 0;
  const baseSin = zonaPrecio?.sinCopago ?? product.precioSinCopago ?? 0;
  const n = Math.max(1, Math.min(9, profile.numAsegurados ?? 1));
  const dentalExtra = profile.coberturaDental ? 4 : 0;
  return {
    conCopago: applyNumInsuredDiscount((baseCon + dentalExtra) * n, n, product.pricing?.descuentos),
    sinCopago: applyNumInsuredDiscount((baseSin + dentalExtra) * n, n, product.pricing?.descuentos),
  };
}

// Precio base por zona/edad para ramos de precio único (vida/auto/decesos).
// Devuelve el precio del tramo+zona si existe, o el precio plano del producto.
export function resolveBasePrecio(
  product: { precio?: number; pricing?: ProductPricing },
  profile: { codigoPostal?: string; edad?: number | null },
): number {
  const zona = pricingZonaFromLabel(profile.codigoPostal);
  const tramo = resolveTramo(product.pricing, profile.edad ?? null);
  return tramo?.porZona?.[zona]?.precio ?? product.precio ?? 0;
}

export function vidaPrice(base: { precio: number }, profile: Pick<QuoteProfile, "fumador">) {
  const smokerExtra = profile.fumador ? Math.round(base.precio * 0.4) : 0;
  return { precio: base.precio + smokerExtra };
}

// A diferencia de vida/auto (precio único de partida), el de decesos escala
// con el nº de personas a asegurar — igual que salud — porque cada persona
// añade su propia prima a la póliza familiar.
export function decesosPrice(base: { precio: number }, profile: Pick<QuoteProfile, "numAsegurados">) {
  const n = Math.max(1, Math.min(9, profile.numAsegurados ?? 1));
  return { precio: base.precio * n };
}

export function autoPrice(base: { precio: number }, profile: Pick<QuoteProfile, "antiguedadCarnet" | "coberturaDeseada">) {
  const carnetExtra = profile.antiguedadCarnet === "menos_2" ? Math.round(base.precio * 0.35)
    : profile.antiguedadCarnet === "2_5" ? Math.round(base.precio * 0.12)
    : 0;
  const coberturaExtra = profile.coberturaDeseada === "todo_riesgo" ? Math.round(base.precio * 0.6)
    : profile.coberturaDeseada === "terceros_ampliado" ? Math.round(base.precio * 0.2)
    : 0;
  return { precio: base.precio + carnetExtra + coberturaExtra };
}

const PRODUCTO_LABELS: Record<string, string> = {
  salud: "Seguro de salud",
  vida: "Seguro de vida",
  auto: "Seguro de auto",
  decesos: "Seguro de decesos",
};

export function buildWhatsAppText(opts: { producto: string; compania?: string; quote?: QuoteProfile | null; origen?: string }) {
  const lines = ["Hola, vengo de la comparativa de Asegurados Ventajon."];
  if (opts.compania) lines.push(`Me interesa la opción de ${opts.compania}.`);
  lines.push(`Producto: ${PRODUCTO_LABELS[opts.producto] ?? "Seguro"}.`);
  if (opts.quote?.id) lines.push(`Presupuesto nº ${quoteNumber(opts.quote.id)}.`);
  if (opts.quote?.codigoPostal) lines.push(`Zona: ${opts.quote.codigoPostal}.`);
  if (opts.quote?.numAsegurados) lines.push(`Personas a asegurar: ${opts.quote.numAsegurados}.`);
  if (opts.quote?.fechaNacimiento) lines.push(`Fecha de nacimiento: ${opts.quote.fechaNacimiento}.`);
  if (opts.quote?.matricula) lines.push(`Matrícula: ${opts.quote.matricula}.`);
  if (opts.quote?.marcaVehiculo) lines.push(`Vehículo: ${opts.quote.marcaVehiculo} ${opts.quote.modeloVehiculo ?? ""}.`.trim());
  if (opts.origen) lines.push(`Origen: ${opts.origen}.`);
  return lines.join(" ");
}

export function whatsAppUrl(text: string) {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}

// Resultado de una solicitud de llamada, para personalizar la página de
// agradecimiento (nombre + preferencia horaria + producto solicitado, este
// último para poder sugerir un segundo producto sin volver a preguntarlo)
// sin tener que volver a pedirlo.
export type CallResult = { nombre?: string; diaLlamada?: string; turnoLlamada?: string; producto?: string };
const CALL_RESULT_KEY = "ventajon:callResult";

export function saveCallResult(v: CallResult) {
  try { sessionStorage.setItem(CALL_RESULT_KEY, JSON.stringify(v)); } catch { /* sessionStorage no disponible */ }
}

export function loadCallResult(): CallResult | null {
  try {
    const raw = sessionStorage.getItem(CALL_RESULT_KEY);
    return raw ? (JSON.parse(raw) as CallResult) : null;
  } catch {
    return null;
  }
}

export { slugifyCompania as slugify } from "./catalog";
