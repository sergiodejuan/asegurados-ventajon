// Mapper: Lead (formato interno) → payload de POST /insurances de la API
// Integra de Codeoscopic para el ramo Salud. Toda la conversión de valores
// (fechas dd/mm/aaaa → ISO, sexo hombre/mujer → Male/Female, resolución de
// municipio a partir del CP) se hace aquí para que el endpoint quede fino.

import type { Lead } from "./crm";
import type { Presupuesto } from "./crm";
import { resolveTownIdByPostalCode } from "./codeoscopicTowns";

/* ------------------------------ Conversores ------------------------------ */

function toIsoDate(dob: string): string | null {
  // El schema interno guarda dd/mm/aaaa (ver lib/schema.ts). Codeoscopic
  // pide ISO yyyy-mm-dd. Si viene ya en ISO (algunos flujos), se acepta.
  if (!dob) return null;
  const trimmed = dob.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function toCodeoscopicGender(sexo: string): "Male" | "Female" | null {
  if (sexo === "hombre") return "Male";
  if (sexo === "mujer") return "Female";
  return null;
}

// La fecha de efecto: si el lead marcó "cuanto_antes"/"proximo_mes"/etc., el
// endpoint ya guarda `inicio` como una etiqueta descriptiva; el mapper la
// traduce a una fecha ISO real que Codeoscopic pueda usar.
function resolveEffectiveDate(inicio: string): string {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  let candidate: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
    // Fecha personalizada elegida por el lead.
    candidate = inicio;
  } else if (inicio === "proximo_mes") {
    // Día 1 del mes que viene, construido en UTC para no irnos al último día
    // del mes anterior al pasar de hora local a ISO.
    candidate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  } else {
    // "cuanto_antes" / "comparando" / cualquier otro caso: hoy + 15 días (le
    // damos margen a que el equipo comercial haga el contacto antes del efecto).
    candidate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  // Codeoscopic rechaza fechas de efecto anteriores a hoy ("The effective
  // date cannot be before today.", 400). Una fecha personalizada elegida hace
  // tiempo, o un lead antiguo que se re-cotiza, puede quedar en el pasado: la
  // subimos a hoy como mínimo. La comparación de strings ISO yyyy-mm-dd es
  // segura por orden lexicográfico.
  return candidate < todayIso ? todayIso : candidate;
}

// El teléfono interno viene ya normalizado a E.164 español (ver lib/phone.ts:
// toE164Spain devuelve "+34XXXXXXXXX"). Codeoscopic espera solo dígitos sin
// prefijo internacional en holder.phones[].number según el ejemplo del portal
// ("652789558"), pero acepta con prefijo en algunos productos — nos quedamos
// con solo los 9 dígitos españoles para no arriesgar.
function normalizeSpanishPhone(telefono: string): string {
  const digits = String(telefono).replace(/\D/g, "");
  if (digits.startsWith("34") && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return digits; // último recurso, dejamos lo que haya
}

/* ------------------------------- Payload --------------------------------- */

export type CodeoscopicHealthPayload = {
  insuranceLine: { id: "Health" };
  effectiveDate: string;
  holder: {
    // OBLIGATORIO. La API real de Integra rechaza el POST /insurances sin
    // documento del titular ("The identity document of the holder is
    // mandatory", 400) incluso para el precio estimado — al contrario de lo
    // que sugería el manual. Por eso el mapper lo exige y, si el lead no lo
    // trae (flujo público del tarificador, que difiere el DNI), devuelve
    // ok:false y la comparativa cae al catálogo sin lanzar el 400.
    identificationDocument: { type: { id: string }; id: string };
    name: string;
    surname: string;
    surname2?: string;
    birthDate: string;
    gender: { id: "Male" | "Female" };
    smoker: boolean;
    phones: { number: string; primary: boolean }[];
    addresses: { postalCode: string; town: { id: number | string }; primary: boolean }[];
  };
  risk: {
    insureds: {
      birthDate: string;
      gender: { id: "Male" | "Female" };
      smoker?: boolean;
      addresses?: { postalCode: string; town: { id: number | string }; primary: boolean }[];
    }[];
  };
};

// Cualquier fallo del mapper es determinístico: si faltan datos obligatorios
// para tarificar (nombre/apellido, documento DNI/NIE, fecha nac., sexo, CP
// real), devolvemos null con la razón. El endpoint la propaga al cliente para
// que la comparativa caiga al mock sin que el usuario vea un error críptico.
export type MapResult =
  | { ok: true; payload: CodeoscopicHealthPayload }
  | { ok: false; reason: string };

export async function buildHealthPayload(lead: Lead, presupuesto: Presupuesto | null): Promise<MapResult> {
  // Datos mínimos del titular para TARIFICAR (precio estimado). Confirmado
  // contra la API real: el documento del titular (DNI/NIE) SÍ es obligatorio
  // incluso para el estimado. Si el lead no lo trae (flujo público del
  // tarificador, que difiere el DNI a la contratación), devolvemos ok:false
  // con un motivo claro y la comparativa cae al catálogo — nunca se llega a
  // enviar un POST que Codeoscopic rechazaría con 400.
  if (!lead.nombre || !lead.apellido1) return { ok: false, reason: "Sin nombre/apellido del titular." };
  if (!lead.documento || !lead.documentoTipo) return { ok: false, reason: "Sin documento del titular (DNI/NIE), obligatorio para tarificar." };
  const holderDob = toIsoDate(lead.fechaNacimiento);
  if (!holderDob) return { ok: false, reason: "Fecha de nacimiento del titular no válida." };
  const holderGender = toCodeoscopicGender(lead.sexo);
  if (!holderGender) return { ok: false, reason: "Sexo del titular no válido." };
  if (!lead.codigoPostalReal) return { ok: false, reason: "Sin código postal real." };

  const townId = await resolveTownIdByPostalCode(lead.codigoPostalReal);
  if (townId == null) return { ok: false, reason: `Codeoscopic no reconoce el CP ${lead.codigoPostalReal}.` };

  // La lista de asegurados NO puede ir vacía (la API responde 400 "The
  // `insureds` field cannot be null or empty."). El titular es siempre el
  // primer asegurado del riesgo: en salud el tomador se cubre a sí mismo, y
  // `numAsegurados` cuenta al titular + los adicionales. Añadimos primero al
  // titular (fecha, sexo y fumador) y después los adicionales bien formados;
  // los adicionales mal formados (leads antiguos sin la migración) se ignoran.
  const insureds: CodeoscopicHealthPayload["risk"]["insureds"] = [
    { birthDate: holderDob, gender: { id: holderGender }, smoker: !!lead.fumador },
  ];
  for (const a of lead.aseguradosAdicionales ?? []) {
    const dob = toIsoDate(a.fechaNacimiento);
    const g = toCodeoscopicGender(a.sexo);
    if (dob && g) insureds.push({ birthDate: dob, gender: { id: g } });
  }

  // El inicio deseado puede venir en el propio lead o, si el usuario eligió
  // fecha personalizada, en el propio campo — el /api/lead ya resuelve esa
  // rama y guarda el string final en lead.inicio.
  const effectiveDate = resolveEffectiveDate(lead.inicio || "");

  // Si por lo que sea el presupuesto trae un dato adicional (p.ej. una fecha
  // más específica), tendría prioridad. Hoy no lo usamos, pero dejamos el
  // parámetro para no romper la firma cuando amplíe el modelo.
  void presupuesto;

  // Documento del titular: garantizado arriba (obligatorio para tarificar).
  const identificationDocument = { type: { id: lead.documentoTipo }, id: lead.documento };

  const payload: CodeoscopicHealthPayload = {
    insuranceLine: { id: "Health" },
    effectiveDate,
    holder: {
      identificationDocument,
      name: lead.nombre.trim(),
      surname: lead.apellido1.trim(),
      surname2: lead.apellido2?.trim() || undefined,
      birthDate: holderDob,
      gender: { id: holderGender },
      smoker: !!lead.fumador,
      phones: [{ number: normalizeSpanishPhone(lead.telefono), primary: true }],
      addresses: [{ postalCode: lead.codigoPostalReal, town: { id: townId }, primary: true }],
    },
    risk: { insureds },
  };
  return { ok: true, payload };
}
