import { normalizePhone } from "./schema";
import {
  SOURCE_LABELS, type ConsentRecord, type Lead, type LeadDraft, type LeadSubmission, type Status,
  type Presupuesto, type PresupuestoStatus, type PresupuestoNote, type PresupuestoEleccion,
  type Task, type TaskDraft,
  type Llamada, type LlamadaDraft, type LlamadaStatus, type LlamadaNote, type ClientNotification,
  type NpsResponse,
  type Agent, type AgentDraft, type AdminModule, type AuditAction, type AuditLog,
  type EmailLog,
  emptyAvailability,
} from "./crm";
import { hashPassword } from "./password";
import { nextBusinessDays } from "./schedule";
import { DEFAULT_PRODUCTS, sortProducts, type Product, type ProductDraft } from "./catalog";
import { DEFAULT_POSTS, type Post, type PostDraft } from "./posts";
import { DEFAULT_PROMOTIONS, isPromotionActive, type Promotion, type PromotionDraft } from "./promotions";
import { DEFAULT_TESTIMONIOS, type Testimonio, type TestimonioDraft } from "./testimonios";
import { SEED_EMAIL_TEMPLATES, type EmailTemplate, type EmailTemplateDraft } from "./leadEmailTemplates";
import { DEFAULT_CAMPAIGN_CONFIG, type CampaignConfig } from "./campaign";
import { DEFAULT_EXIT_INTENT_CONFIG, type ExitIntentConfig } from "./exitIntentCampaign";
import { DEFAULT_LANDING_SALUD, type Landing, type LandingDraft, type LandingProducto, type LandingDevice, type LandingDaypart } from "./landings";
import { DEFAULT_PRICE_MATCH_LANDING, type PriceMatchLandingConfig } from "./priceMatchLanding";
import { saludPrice, vidaPrice, autoPrice, decesosPrice, quoteNumber } from "./quote";
import { DEFAULT_THEME, type SiteTheme } from "./theme";

function makeSubmissionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Almacén de leads tipo CRM.
 * Producción: Redis (Upstash) del Marketplace de Vercel (o integración KV clásica).
 * Local / sin credenciales: memoria del proceso (NO durable).
 */

const hasKV = !!(
  (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
  (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
);

export function storageMode() {
  return hasKV ? "kv" : "memory";
}

let _redis: import("@upstash/redis").Redis | null = null;
async function redisClient() {
  if (_redis) return _redis;
  const { Redis } = await import("@upstash/redis");
  _redis = new Redis({
    url: (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)!,
    token: (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)!,
  });
  return _redis;
}

const mem = {
  data: new Map<string, unknown>(),
  z: new Map<string, { s: number; m: string }[]>(),
};

async function jget<T>(key: string): Promise<T | null> {
  if (hasKV) {
    const r = await redisClient();
    return (await r.get<T>(key)) ?? null;
  }
  return mem.data.has(key) ? (mem.data.get(key) as T) : null;
}
async function jset(key: string, val: unknown): Promise<void> {
  if (hasKV) {
    const r = await redisClient();
    await r.set(key, val as string);
    return;
  }
  mem.data.set(key, val);
}
async function jsetTtl(key: string, val: unknown, ttlSec: number): Promise<void> {
  if (hasKV) {
    const r = await redisClient();
    await r.set(key, val as string, { ex: ttlSec });
    return;
  }
  mem.data.set(key, val);
  setTimeout(() => { mem.data.delete(key); }, ttlSec * 1000).unref?.();
}
async function jdel(key: string): Promise<void> {
  if (hasKV) {
    const r = await redisClient();
    await r.del(key);
    return;
  }
  mem.data.delete(key);
}
async function zadd(key: string, score: number, member: string): Promise<void> {
  if (hasKV) {
    const r = await redisClient();
    await r.zadd(key, { score, member });
    return;
  }
  const arr = mem.z.get(key) ?? [];
  const i = arr.findIndex((e) => e.m === member);
  if (i >= 0) arr[i].s = score;
  else arr.push({ s: score, m: member });
  mem.z.set(key, arr);
}
async function zrangeRev(key: string): Promise<string[]> {
  if (hasKV) {
    const r = await redisClient();
    return (await r.zrange(key, 0, -1, { rev: true })) as string[];
  }
  return (mem.z.get(key) ?? []).slice().sort((a, b) => b.s - a.s).map((e) => e.m);
}

// Lock distribuido básico (SET NX PX ...). Se usa para evitar que dos envíos
// concurrentes del MISMO teléfono/email creen dos leads huérfanos o dejen
// los índices idx:phone/idx:email en estado inconsistente (auditoría
// consultora, race en upsertLead). Retorna un token que hay que pasar a
// releaseLock para no soltar el lock de otro proceso.
async function acquireLock(key: string, ttlMs = 5000): Promise<string | null> {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  if (hasKV) {
    const r = await redisClient();
    const res = await r.set(key, token, { nx: true, px: ttlMs });
    return res === "OK" ? token : null;
  }
  const existing = mem.data.get(key) as { token: string; expiresAt: number } | undefined;
  if (existing && existing.expiresAt > Date.now()) return null;
  mem.data.set(key, { token, expiresAt: Date.now() + ttlMs });
  return token;
}
async function releaseLock(key: string, token: string): Promise<void> {
  if (hasKV) {
    const r = await redisClient();
    // Solo borra si el token coincide (evita soltar el lock de otro proceso
    // si el nuestro caducó). Upstash Redis soporta eval con Lua.
    const script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
    try { await r.eval(script, [key], [token]); } catch { await r.del(key).catch(() => {}); }
    return;
  }
  const existing = mem.data.get(key) as { token: string; expiresAt: number } | undefined;
  if (existing?.token === token) mem.data.delete(key);
}
// Idempotency claim: SET NX PX. Retorna true si esta llamada fue la primera
// en registrar la clave (procesamos), false si otra ya la tenía (rechazamos
// como duplicado). No hay que liberar — la clave caduca sola con el TTL.
// Se usa para deduplicar webhooks Retell/Bland/Manychat en la ventana de
// firma (~5 min); una réplica accidental o intencional del mismo payload
// no doblará el efecto lateral (auditoría consultora, P0.9).
export async function claimOnce(key: string, ttlMs = 15 * 60 * 1000): Promise<boolean> {
  if (hasKV) {
    const r = await redisClient();
    const res = await r.set(key, "1", { nx: true, px: ttlMs });
    return res === "OK";
  }
  const existing = mem.data.get(key) as { expiresAt: number } | undefined;
  if (existing && existing.expiresAt > Date.now()) return false;
  mem.data.set(key, { expiresAt: Date.now() + ttlMs });
  return true;
}

async function withLock<T>(key: string, fn: () => Promise<T>, ttlMs = 5000, retries = 5): Promise<T> {
  let token: string | null = null;
  for (let i = 0; i < retries; i++) {
    token = await acquireLock(key, ttlMs);
    if (token) break;
    // Espera exponencial ligera con jitter (50-150ms base).
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100 + i * 100));
  }
  if (!token) throw new Error(`[lock] no se pudo adquirir ${key} tras ${retries} intentos`);
  try { return await fn(); }
  finally { await releaseLock(key, token).catch(() => {}); }
}

// Prueba de conexión real para el panel /admin/integraciones (API propia de
// la web): un round-trip de escritura+lectura sobre el almacén que usan de
// verdad todos los endpoints públicos, no solo comprobar que las variables
// de entorno existen — así detecta también un Redis mal configurado o caído.
export async function pingStore(): Promise<{ ok: boolean; backend: "kv" | "memory"; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const key = "integraciones:ping";
    const value = Date.now();
    await jset(key, value);
    const read = await jget<number>(key);
    if (read !== value) throw new Error("La lectura no coincide con lo escrito.");
    return { ok: true, backend: hasKV ? "kv" : "memory", latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, backend: hasKV ? "kv" : "memory", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : "Error de conexión con el almacén." };
  }
}

/* -------------------------------- Upsert ---------------------------------- */

function fillEmpty(lead: Lead, draft: LeadDraft) {
  const keys: (keyof LeadDraft)[] = [
    "nombre", "email", "codigoPostal", "inicio", "numAsegurados", "coberturaDental",
    "motivo", "fumador", "fechaNacimiento", "sexo", "producto",
    "tipoVehiculo", "matricula", "marcaVehiculo", "modeloVehiculo", "anioVehiculo",
    "usoVehiculo", "antiguedadCarnet", "coberturaDeseada",
    "seguroActualImporte", "seguroActualPeriodo", "diaLlamada", "turnoLlamada",
    "documentoTipo", "documento", "apellido1", "apellido2", "codigoPostalReal",
  ];
  for (const k of keys) {
    const dv = draft[k];
    const lv = (lead as Record<string, unknown>)[k];
    const empty = lv === "" || lv === null || lv === undefined;
    if (empty && dv !== undefined && dv !== "" && dv !== null) {
      (lead as Record<string, unknown>)[k] = dv as unknown;
    }
  }
  // presupuestoId: a diferencia de los campos de arriba, se actualiza siempre
  // al último presupuesto referenciado (p.ej. una reprogramación de llamada),
  // no solo si la ficha estaba vacía.
  if (draft.presupuestoId) lead.presupuestoId = draft.presupuestoId;
  // priceMatch: si el lead vuelve con nueva solicitud de igualación, guardamos
  // la última (la más reciente es la que interesa al asesor).
  if (draft.priceMatch) lead.priceMatch = draft.priceMatch;
  // Servicios (array): si el nuevo trae datos y la ficha estaba vacía, se completa.
  if (draft.seguroActualServicios?.length && !lead.seguroActualServicios?.length) {
    lead.seguroActualServicios = draft.seguroActualServicios;
  }
  if (draft.aseguradosAdicionales?.length && !lead.aseguradosAdicionales?.length) {
    lead.aseguradosAdicionales = draft.aseguradosAdicionales;
  }
  if (draft.aceptaPrivacidad) lead.aceptaPrivacidad = true;
  if (draft.autorizaContacto) lead.autorizaContacto = true;
  if (draft.aceptaComercial) lead.aceptaComercial = true;
  if (draft.utm && Object.keys(draft.utm).length && !Object.keys(lead.utm).length) {
    lead.utm = draft.utm as Record<string, string | undefined>;
  }
  // Atribución de landing: igual que utm, gana el primer valor no vacío —
  // no se sobrescribe en envíos posteriores del mismo lead.
  if (draft.landingSlug && !lead.landingSlug) lead.landingSlug = draft.landingSlug;
}

export async function upsertLead(
  draft: LeadDraft,
  source: string,
  consent?: ConsentRecord
): Promise<{ id: string; deduped: boolean; submissionId: string }> {
  const phone = draft.telefono ? normalizePhone(draft.telefono) : "";
  const email = draft.email ? draft.email.trim().toLowerCase() : "";
  // Lock por identidad (teléfono como primary, email como secundario): impide
  // race condition entre envíos concurrentes del mismo usuario que crearía
  // dos leads huérfanos y dejaría los índices phone/email inconsistentes
  // (auditoría consultora, API6:2023 Unrestricted business logic).
  const lockKey = `lock:upsertLead:${phone || email || "anon"}`;
  return withLock(lockKey, () => upsertLeadCritical(draft, source, phone, email, consent));
}

async function upsertLeadCritical(
  draft: LeadDraft,
  source: string,
  phone: string,
  email: string,
  consent?: ConsentRecord
): Promise<{ id: string; deduped: boolean; submissionId: string }> {
  const now = new Date().toISOString();
  const score = Date.parse(now);
  const srcLabel = SOURCE_LABELS[source] ?? source;

  let id: string | null = null;
  if (phone) id = await jget<string>(`idx:phone:${phone}`);
  if (!id && email) id = await jget<string>(`idx:email:${email}`);

  if (id) {
    const lead = await jget<Lead>(`lead:${id}`);
    if (lead) {
      fillEmpty(lead, draft);
      lead.emails = lead.emails ?? []; // fichas creadas antes de este campo
      lead.updatedAt = now;
      if (!lead.sources.includes(source)) lead.sources.push(source);
      // Solo se conserva el registro de consentimiento más reciente (evita una
      // auditoría que crece sin límite); el resto de la traza queda en "activity".
      if (consent) lead.consents = [consent];
      lead.activity.unshift({
        at: now, type: "form",
        note: `Nueva solicitud desde ${srcLabel}${draft.producto ? ` · ${draft.producto}` : ""}`,
        meta: { source },
      });
      const submission: LeadSubmission = { id: makeSubmissionId(), at: now, source, producto: draft.producto ?? "", data: { ...draft } as Record<string, unknown> };
      lead.submissions = [submission, ...(lead.submissions ?? [])];
      await jset(`lead:${id}`, lead);
      if (phone) await jset(`idx:phone:${phone}`, id);
      if (email) await jset(`idx:email:${email}`, id);
      await zadd("leads:index", score, id);
      await zadd(`leads:source:${source}`, score, id);
      return { id, deduped: true, submissionId: submission.id };
    }
  }

  const newId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const lead: Lead = {
    id: newId, createdAt: now, updatedAt: now,
    source, sources: [source], producto: draft.producto ?? "",
    status: "nuevo", nextStep: "",
    agenteAsignadoId: "", agenteAsignadoNombre: "",
    nombre: draft.nombre ?? "", telefono: phone, email, codigoPostal: draft.codigoPostal ?? "",
    documentoTipo: draft.documentoTipo ?? "", documento: draft.documento ?? "",
    apellido1: draft.apellido1 ?? "", apellido2: draft.apellido2 ?? "",
    codigoPostalReal: draft.codigoPostalReal ?? "", aseguradosAdicionales: draft.aseguradosAdicionales ?? [],
    inicio: draft.inicio ?? "", numAsegurados: draft.numAsegurados ?? null, coberturaDental: draft.coberturaDental ?? null,
    motivo: draft.motivo ?? "", fumador: draft.fumador ?? null,
    paraQuien: draft.paraQuien ?? "",
    tipoVehiculo: draft.tipoVehiculo ?? "", matricula: draft.matricula ?? "",
    marcaVehiculo: draft.marcaVehiculo ?? "", modeloVehiculo: draft.modeloVehiculo ?? "", anioVehiculo: draft.anioVehiculo ?? "",
    usoVehiculo: draft.usoVehiculo ?? "", antiguedadCarnet: draft.antiguedadCarnet ?? "", coberturaDeseada: draft.coberturaDeseada ?? "",
    fechaNacimiento: draft.fechaNacimiento ?? "", sexo: draft.sexo ?? "",
    yaTieneSeguro: draft.yaTieneSeguro ?? null,
    seguroActualImporte: draft.seguroActualImporte ?? null,
    seguroActualPeriodo: draft.seguroActualPeriodo ?? "",
    seguroActualServicios: draft.seguroActualServicios ?? [],
    diaLlamada: draft.diaLlamada ?? "",
    turnoLlamada: draft.turnoLlamada ?? "",
    presupuestoId: draft.presupuestoId ?? "",
    priceMatch: draft.priceMatch ?? null,
    aceptaPrivacidad: !!draft.aceptaPrivacidad, autorizaContacto: !!draft.autorizaContacto, aceptaComercial: !!draft.aceptaComercial,
    consents: consent ? [consent] : [],
    utm: (draft.utm as Record<string, string | undefined>) ?? {},
    landingSlug: draft.landingSlug ?? "",
    activity: [{ at: now, type: "alta", note: `Alta desde ${srcLabel}${draft.producto ? ` · ${draft.producto}` : ""}`, meta: { source } }],
    submissions: [],
    emails: [],
    anonymizedAt: "",
  };
  const firstSubmission: LeadSubmission = { id: makeSubmissionId(), at: now, source, producto: draft.producto ?? "", data: { ...draft } as Record<string, unknown> };
  lead.submissions = [firstSubmission];

  await jset(`lead:${newId}`, lead);
  if (phone) await jset(`idx:phone:${phone}`, newId);
  if (email) await jset(`idx:email:${email}`, newId);
  await zadd("leads:index", score, newId);
  await zadd(`leads:source:${source}`, score, newId);
  return { id: newId, deduped: false, submissionId: firstSubmission.id };
}

/* ------------------ Área de cliente (sin registro) ------------------------- */
// Permite al propio cliente actualizar su ficha (datos de contacto y
// preferencia horaria) desde /area-cliente, localizándola por el teléfono o
// email que ya tenía guardados en su navegador. Si no se encuentra ficha, no
// se crea una nueva (evita altas fantasma desde un endpoint sin autenticar).

export async function updateLeadContactByLookup(
  lookup: { leadId?: string; telefono?: string; email?: string },
  patch: { nombre?: string; telefono?: string; email?: string; diaLlamada?: string; turnoLlamada?: string; aceptaComercial?: boolean }
): Promise<Lead | null> {
  const lookupPhone = lookup.telefono ? normalizePhone(lookup.telefono) : "";
  const lookupEmail = lookup.email ? lookup.email.trim().toLowerCase() : "";

  let id: string | null = lookup.leadId ?? null;
  if (!id && lookupPhone) id = await jget<string>(`idx:phone:${lookupPhone}`);
  if (!id && lookupEmail) id = await jget<string>(`idx:email:${lookupEmail}`);
  if (!id) return null;

  const lead = await jget<Lead>(`lead:${id}`);
  if (!lead) return null;

  const now = new Date().toISOString();
  const changes: string[] = [];

  if (patch.nombre !== undefined && patch.nombre.trim() && patch.nombre.trim() !== lead.nombre) {
    lead.nombre = patch.nombre.trim();
    changes.push("nombre");
  }
  if (patch.telefono !== undefined) {
    const newPhone = normalizePhone(patch.telefono);
    if (newPhone && newPhone !== lead.telefono) {
      // IMPORTANTE: borrar el índice del teléfono viejo antes de escribir el
      // nuevo, si no un futuro usuario que se registre con el teléfono viejo
      // recibiría la ficha del anterior (colisión de identidad — ver
      // auditoría, hallazgo P-01).
      if (lead.telefono) await jdel(`idx:phone:${lead.telefono}`).catch(() => {});
      await jset(`idx:phone:${newPhone}`, id);
      lead.telefono = newPhone;
      changes.push("teléfono");
    }
  }
  if (patch.email !== undefined) {
    const newEmail = patch.email.trim().toLowerCase();
    if (newEmail && newEmail !== lead.email) {
      // Igual que con el teléfono: liberar el índice del email viejo antes
      // de escribir el nuevo (auditoría P-01).
      if (lead.email) await jdel(`idx:email:${lead.email}`).catch(() => {});
      await jset(`idx:email:${newEmail}`, id);
      lead.email = newEmail;
      changes.push("email");
    }
  }
  if (patch.diaLlamada !== undefined && patch.diaLlamada !== lead.diaLlamada) {
    lead.diaLlamada = patch.diaLlamada;
    changes.push("día preferido");
  }
  if (patch.turnoLlamada !== undefined && patch.turnoLlamada !== lead.turnoLlamada) {
    lead.turnoLlamada = patch.turnoLlamada;
    changes.push("turno preferido");
  }
  // Consentimiento comercial: solo se registra al concederlo (nunca se
  // retira por esta vía) — pensado para el "desbloqueo" de la comparativa,
  // donde el cliente puede marcar la casilla opcional sin haberlo hecho antes.
  if (patch.aceptaComercial === true && !lead.aceptaComercial) {
    lead.aceptaComercial = true;
    changes.push("comunicaciones comerciales");
  }

  if (changes.length) {
    lead.activity.unshift({ at: now, type: "note", note: `Cliente actualizó desde su área: ${changes.join(", ")}.` });
    lead.updatedAt = now;
    await jset(`lead:${id}`, lead);
    await zadd("leads:index", Date.parse(now), id);
  }

  return lead;
}

/* ------------------------------ Consultas --------------------------------- */

export async function listLeads(source?: string): Promise<Lead[]> {
  const key = source ? `leads:source:${source}` : "leads:index";
  const ids = await zrangeRev(key);
  const out: Lead[] = [];
  for (const id of ids) {
    const l = await jget<Lead>(`lead:${id}`);
    if (l) out.push(l);
  }
  return out;
}

export async function getLead(id: string): Promise<Lead | null> {
  return jget<Lead>(`lead:${id}`);
}

const CONTACT_CHANNEL_LABELS: Record<string, string> = {
  llamada: "Llamada realizada",
  whatsapp: "WhatsApp enviado",
  email: "Email enviado",
};

export async function updateLead(
  id: string,
  patch: { status?: Status; nextStep?: string; note?: string; contact?: { channel: string; note?: string }; agente?: string }
): Promise<Lead | null> {
  const lead = await jget<Lead>(`lead:${id}`);
  if (!lead) return null;
  const now = new Date().toISOString();
  const agente = patch.agente?.trim() || undefined;
  if (patch.status && patch.status !== lead.status) {
    lead.activity.unshift({ at: now, type: "status", note: `Estado → ${patch.status}`, meta: agente ? { agente } : undefined });
    lead.status = patch.status;
  }
  if (typeof patch.nextStep === "string" && patch.nextStep !== lead.nextStep) {
    lead.nextStep = patch.nextStep;
    lead.activity.unshift({ at: now, type: "nextstep", note: `Próximo paso: ${patch.nextStep || "—"}`, meta: agente ? { agente } : undefined });
  }
  if (patch.note && patch.note.trim()) {
    lead.activity.unshift({ at: now, type: "note", note: patch.note.trim(), meta: agente ? { agente } : undefined });
  }
  if (patch.contact?.channel) {
    const label = CONTACT_CHANNEL_LABELS[patch.contact.channel] ?? patch.contact.channel;
    const note = patch.contact.note?.trim() ? `${label}: ${patch.contact.note.trim()}` : label;
    lead.activity.unshift({ at: now, type: "contact", note, meta: { channel: patch.contact.channel, ...(agente ? { agente } : {}) } });
  }
  lead.updatedAt = now;
  await jset(`lead:${id}`, lead);
  await zadd("leads:index", Date.parse(now), id);
  return lead;
}

/* ---------------------------- Correos enviados ------------------------------ */
// Traza de cada correo transaccional (resumen de comparativa, verificación de
// acceso...) en la propia ficha del lead — ver EmailLog en lib/crm.ts. El
// registro del envío ("enviado") cuenta como actividad real de la ficha
// (bump de updatedAt/índice); las aperturas y clics posteriores solo
// actualizan el propio registro, sin "revivir" la ficha en el listado cada
// vez que alguien abre un correo antiguo.

export async function addEmailLog(
  leadId: string,
  entry: { id: string; to: string; subject: string; tipo: string; agente?: string }
): Promise<void> {
  const lead = await jget<Lead>(`lead:${leadId}`);
  if (!lead) return;
  const now = new Date().toISOString();
  const log: EmailLog = {
    id: entry.id, at: now, to: entry.to, subject: entry.subject, tipo: entry.tipo,
    status: "enviado", openedAt: "", openCount: 0, clickedAt: "", clickCount: 0,
  };
  lead.emails = [log, ...(lead.emails ?? [])];
  lead.activity.unshift({ at: now, type: "email", note: `Email enviado: ${entry.subject}`, meta: entry.agente ? { agente: entry.agente } : undefined });
  lead.updatedAt = now;
  await jset(`lead:${leadId}`, lead);
  await zadd("leads:index", Date.parse(now), leadId);
}

export async function markEmailOpened(leadId: string, logId: string): Promise<void> {
  const lead = await jget<Lead>(`lead:${leadId}`);
  if (!lead) return;
  const log = (lead.emails ?? []).find((e) => e.id === logId);
  if (!log) return;
  if (!log.openedAt) log.openedAt = new Date().toISOString();
  log.openCount += 1;
  if (log.status === "enviado") log.status = "abierto";
  await jset(`lead:${leadId}`, lead);
}

export async function markEmailClicked(leadId: string, logId: string): Promise<void> {
  const lead = await jget<Lead>(`lead:${leadId}`);
  if (!lead) return;
  const log = (lead.emails ?? []).find((e) => e.id === logId);
  if (!log) return;
  const now = new Date().toISOString();
  if (!log.openedAt) log.openedAt = now; // un clic implica que se abrió
  if (!log.clickedAt) log.clickedAt = now;
  log.clickCount += 1;
  log.status = "clic";
  await jset(`lead:${leadId}`, lead);
}

/* ------------------------------- RGPD --------------------------------------- */
// Derechos de acceso/portabilidad y supresión (RGPD arts. 15/17/20). La
// supresión se implementa como anonimización: se sustituyen los datos
// identificativos por marcadores y se borran los índices de búsqueda, pero
// se conserva activity/consents como prueba de que la solicitud se atendió
// (requisito de auditoría DGSFP — borrarlo todo eliminaría la propia prueba
// de cumplimiento).

export async function exportLeadData(id: string): Promise<{ lead: Lead; presupuestos: Presupuesto[] } | null> {
  const lead = await jget<Lead>(`lead:${id}`);
  if (!lead) return null;
  const presupuestos = await listPresupuestosByLead(id);
  return { lead, presupuestos };
}

export async function anonymizeLead(
  id: string,
  agente?: string,
  motivo = "Datos personales anonimizados a petición del interesado (derecho de supresión, RGPD)."
): Promise<Lead | null> {
  const lead = await jget<Lead>(`lead:${id}`);
  if (!lead) return null;
  const now = new Date().toISOString();

  if (lead.telefono) await jdel(`idx:phone:${lead.telefono}`);
  if (lead.email) await jdel(`idx:email:${lead.email}`);

  lead.nombre = "[anonimizado]";
  lead.telefono = "";
  lead.email = "";
  lead.codigoPostal = "";
  lead.fechaNacimiento = "";
  lead.seguroActualServicios = [];
  lead.utm = {};
  lead.emails = (lead.emails ?? []).map((e) => ({ ...e, to: "[anonimizado]" }));
  lead.anonymizedAt = now;
  lead.updatedAt = now;
  lead.activity.unshift({
    at: now, type: "rgpd",
    note: motivo,
    meta: agente ? { agente } : undefined,
  });
  await jset(`lead:${id}`, lead);
  await zadd("leads:index", Date.parse(now), id);

  const presupuestos = await listPresupuestosByLead(id);
  for (const p of presupuestos) {
    p.nombre = "[anonimizado]";
    p.telefono = "";
    p.email = "";
    if (p.data) {
      p.data = { ...p.data };
      delete p.data.codigoPostal;
      delete p.data.fechaNacimiento;
    }
    p.updatedAt = now;
    await jset(`presupuesto:${p.id}`, p);
  }

  return lead;
}

// Política de retención (RGPD art. 5.1.e, ver /legal): un lead que nunca
// llega a convertirse en cliente ("ganado") se anonimiza automáticamente
// pasado el plazo, en vez de conservarse indefinidamente. Los que sí se
// convirtieron en cliente NO se tocan aquí — su conservación se rige por
// los plazos contractuales/fiscales, no por esta limpieza. Pensada para
// ejecutarse periódicamente desde /api/cron/retention (ver vercel.json).
export async function purgeStaleLeads(olderThanDays: number): Promise<{ purged: number; total: number }> {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const all = await listLeads();
  const candidatos = all.filter((l) => l.status !== "ganado" && !l.anonymizedAt && Date.parse(l.updatedAt) < cutoff);

  for (const lead of candidatos) {
    await anonymizeLead(
      lead.id,
      undefined,
      `Datos personales anonimizados automáticamente: sin actividad desde hace más de ${olderThanDays} días sin haber contratado (política de retención, RGPD art. 5.1.e).`
    );
  }

  return { purged: candidatos.length, total: all.length };
}

/* ---------------------------- Catálogo (productos) ------------------------- */
// Ofertas por compañía × producto que alimentan la página de comparativa.
// Se guardan como un único documento JSON (catálogo pequeño, no necesita índice).

const PRODUCTS_KEY = "products:all";

async function readProducts(): Promise<Product[]> {
  const stored = await jget<Product[]>(PRODUCTS_KEY);
  if (!stored || !stored.length) {
    // Copia, no la referencia: en modo memoria (sin KV) devolver el array
    // por defecto tal cual y luego hacerle .push() en create() mutaría la
    // constante compartida DEFAULT_PRODUCTS para siempre en este proceso.
    const seeded = [...DEFAULT_PRODUCTS];
    await jset(PRODUCTS_KEY, seeded);
    return seeded;
  }
  // Añade de forma aditiva cualquier producto por defecto que todavía no
  // exista en lo guardado (p.ej. al lanzar un producto nuevo como "auto" en
  // un sitio que ya tenía datos reales de salud/vida) sin tocar lo existente.
  const knownIds = new Set(stored.map((p) => p.id));
  const missing = DEFAULT_PRODUCTS.filter((p) => !knownIds.has(p.id));
  if (missing.length) {
    const next = [...stored, ...missing];
    await jset(PRODUCTS_KEY, next);
    return next;
  }
  return stored;
}

export async function listProducts(producto?: string, onlyActive = false): Promise<Product[]> {
  let all = await readProducts();
  if (producto) all = all.filter((p) => p.producto === producto);
  if (onlyActive) all = all.filter((p) => p.activo);
  return sortProducts(all);
}

// Precio "desde" real para las landings que se anuncian como más baratas
// (p.ej. /seguro-de-salud-barato): el mínimo entre las compañías de salud
// activas ahora mismo en /admin/productos, para no depender de una cifra
// fija que se quede desactualizada. Devuelve null si no hay ninguna con
// precio (catálogo vacío o todas desactivadas).
export async function getStartingSaludPrice(modo: "con_copago" | "sin_copago"): Promise<number | null> {
  const activos = await listProducts("salud", true);
  const campo = modo === "con_copago" ? "precioConCopago" : "precioSinCopago";
  const precios = activos.map((p) => p[campo]).filter((n): n is number => typeof n === "number" && n > 0);
  return precios.length ? Math.min(...precios) : null;
}

export async function getProduct(id: string): Promise<Product | null> {
  const all = await readProducts();
  return all.find((p) => p.id === id) ?? null;
}

export async function saveProduct(id: string, patch: ProductDraft): Promise<Product | null> {
  const all = await readProducts();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await jset(PRODUCTS_KEY, all);
  return all[idx];
}

export async function createProduct(product: Omit<Product, "updatedAt">): Promise<Product> {
  const all = await readProducts();
  const withTimestamp: Product = { ...product, updatedAt: new Date().toISOString() };
  const idx = all.findIndex((p) => p.id === product.id);
  if (idx >= 0) all[idx] = withTimestamp;
  else all.push(withTimestamp);
  await jset(PRODUCTS_KEY, all);
  return withTimestamp;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const all = await readProducts();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false;
  await jset(PRODUCTS_KEY, next);
  return true;
}

/* -------------------------- Blog ("Actualidad") ----------------------------- */
// Entradas del blog, editables desde /admin/blog. Mismo patrón que el
// catálogo de productos: un único documento JSON, con semilla aditiva.

const POSTS_KEY = "posts:all";

async function readPosts(): Promise<Post[]> {
  const stored = await jget<Post[]>(POSTS_KEY);
  if (!stored || !stored.length) {
    // Copia, no la referencia: ver nota equivalente en readProducts().
    const seeded = [...DEFAULT_POSTS];
    await jset(POSTS_KEY, seeded);
    return seeded;
  }
  const knownIds = new Set(stored.map((p) => p.id));
  const missing = DEFAULT_POSTS.filter((p) => !knownIds.has(p.id));
  if (missing.length) {
    const next = [...stored, ...missing];
    await jset(POSTS_KEY, next);
    return next;
  }
  return stored;
}

function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function listPosts(opts?: { onlyPublished?: boolean }): Promise<Post[]> {
  let all = await readPosts();
  if (opts?.onlyPublished) all = all.filter((p) => p.status === "publicado");
  return sortPosts(all);
}

export async function getPost(id: string): Promise<Post | null> {
  const all = await readPosts();
  return all.find((p) => p.id === id) ?? null;
}

export async function getPostBySlug(slug: string, opts?: { onlyPublished?: boolean }): Promise<Post | null> {
  const all = await readPosts();
  const post = all.find((p) => p.slug === slug) ?? null;
  if (post && opts?.onlyPublished && post.status !== "publicado") return null;
  return post;
}

export async function otherPosts(id: string, limit = 3): Promise<Post[]> {
  const all = await listPosts({ onlyPublished: true });
  return all.filter((p) => p.id !== id).slice(0, limit);
}

// true si el slug ya está en uso por OTRA entrada (excludeId = la que se está editando).
export async function slugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const all = await readPosts();
  return all.some((p) => p.slug === slug && p.id !== excludeId);
}

export async function createPost(draft: PostDraft): Promise<Post> {
  const all = await readPosts();
  const now = new Date().toISOString();
  const post: Post = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    slug: draft.slug ?? "",
    status: draft.status ?? "borrador",
    category: draft.category ?? "",
    title: draft.title ?? "",
    dek: draft.dek ?? "",
    featuredImageUrl: draft.featuredImageUrl ?? "",
    headerImageUrl: draft.headerImageUrl ?? "",
    metaTitle: draft.metaTitle ?? "",
    metaDescription: draft.metaDescription ?? "",
    readMinutes: draft.readMinutes ?? 5,
    publishedAt: draft.publishedAt ?? now.slice(0, 10),
    updatedAt: now,
    cta: draft.cta ?? { label: "Calcula tu precio", href: "/tarificador" },
    intro: draft.intro ?? "",
    blocks: draft.blocks ?? [],
  };
  all.push(post);
  await jset(POSTS_KEY, all);
  return post;
}

export async function updatePost(id: string, patch: PostDraft): Promise<Post | null> {
  const all = await readPosts();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await jset(POSTS_KEY, all);
  return all[idx];
}

export async function deletePost(id: string): Promise<boolean> {
  const all = await readPosts();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false;
  await jset(POSTS_KEY, next);
  return true;
}

/* ----------------------------- Promociones ----------------------------- */
// "/promociones" y "/promociones/[slug]", editables desde /admin/promociones.
// Mismo patrón que el blog: un único documento JSON, con semilla aditiva.

const PROMOTIONS_KEY = "promotions:all";

async function readPromotions(): Promise<Promotion[]> {
  const stored = await jget<Promotion[]>(PROMOTIONS_KEY);
  if (!stored || !stored.length) {
    // Copia, no la referencia: ver nota equivalente en readProducts().
    const seeded = [...DEFAULT_PROMOTIONS];
    await jset(PROMOTIONS_KEY, seeded);
    return seeded;
  }
  const knownIds = new Set(stored.map((p) => p.id));
  const missing = DEFAULT_PROMOTIONS.filter((p) => !knownIds.has(p.id));
  if (missing.length) {
    const next = [...stored, ...missing];
    await jset(PROMOTIONS_KEY, next);
    return next;
  }
  return stored;
}

function sortPromotions(promotions: Promotion[]): Promotion[] {
  return [...promotions].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function listPromotions(opts?: { onlyPublished?: boolean }): Promise<Promotion[]> {
  let all = await readPromotions();
  if (opts?.onlyPublished) all = all.filter((p) => isPromotionActive(p));
  return sortPromotions(all);
}

export async function getPromotion(id: string): Promise<Promotion | null> {
  const all = await readPromotions();
  return all.find((p) => p.id === id) ?? null;
}

export async function getPromotionBySlug(slug: string, opts?: { onlyPublished?: boolean }): Promise<Promotion | null> {
  const all = await readPromotions();
  const promo = all.find((p) => p.slug === slug) ?? null;
  if (promo && opts?.onlyPublished && !isPromotionActive(promo)) return null;
  return promo;
}

export async function otherPromotions(id: string, limit = 3): Promise<Promotion[]> {
  const all = await listPromotions({ onlyPublished: true });
  return all.filter((p) => p.id !== id).slice(0, limit);
}

// true si el slug ya está en uso por OTRA promoción (excludeId = la que se está editando).
export async function promotionSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const all = await readPromotions();
  return all.some((p) => p.slug === slug && p.id !== excludeId);
}

export async function createPromotion(draft: PromotionDraft): Promise<Promotion> {
  const all = await readPromotions();
  const now = new Date().toISOString();
  const promo: Promotion = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    slug: draft.slug ?? "",
    status: draft.status ?? "borrador",
    categoria: draft.categoria ?? "",
    imagenUrl: draft.imagenUrl ?? "",
    tituloTarjeta: draft.tituloTarjeta ?? "",
    h1: draft.h1 ?? "",
    validoHasta: draft.validoHasta ?? "",
    subtitulo: draft.subtitulo ?? "",
    introParrafos: draft.introParrafos ?? [],
    bases: draft.bases ?? [],
    ctaTexto: draft.ctaTexto ?? "Calcula tu precio",
    ctaHref: draft.ctaHref ?? "/tarificador",
    producto: draft.producto ?? "",
    linkExterno: draft.linkExterno ?? "",
    metaTitle: draft.metaTitle ?? "",
    metaDescription: draft.metaDescription ?? "",
    publishedAt: draft.publishedAt ?? now.slice(0, 10),
    finPromocion: draft.finPromocion ?? "",
    mostrarEnHome: draft.mostrarEnHome ?? false,
    updatedAt: now,
  };
  all.push(promo);
  await jset(PROMOTIONS_KEY, all);
  return promo;
}

export async function updatePromotion(id: string, patch: PromotionDraft): Promise<Promotion | null> {
  const all = await readPromotions();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await jset(PROMOTIONS_KEY, all);
  return all[idx];
}

export async function deletePromotion(id: string): Promise<boolean> {
  const all = await readPromotions();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false;
  await jset(PROMOTIONS_KEY, next);
  return true;
}

/* ------------------------- Plantillas de email (leads) ------------------ */
// Editables desde /admin/configuracion/plantillas-email, usadas al enviar un
// correo manual desde la ficha de un lead — ver
// app/api/admin/leads/[id]/enviar-email y lib/leadEmailTemplates.ts. Mismo
// patrón de colección con semilla aditiva que promociones/testimonios.

const EMAIL_TEMPLATES_KEY = "email_templates:all";

async function readEmailTemplates(): Promise<EmailTemplate[]> {
  const stored = await jget<EmailTemplate[]>(EMAIL_TEMPLATES_KEY);
  if (!stored || !stored.length) {
    const seeded = [...SEED_EMAIL_TEMPLATES];
    await jset(EMAIL_TEMPLATES_KEY, seeded);
    return seeded;
  }
  const knownIds = new Set(stored.map((t) => t.id));
  const missing = SEED_EMAIL_TEMPLATES.filter((t) => !knownIds.has(t.id));
  if (missing.length) {
    const next = [...stored, ...missing];
    await jset(EMAIL_TEMPLATES_KEY, next);
    return next;
  }
  return stored;
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const all = await readEmailTemplates();
  return [...all].sort((a, b) => (a.nombre < b.nombre ? -1 : 1));
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  const all = await readEmailTemplates();
  return all.find((t) => t.id === id) ?? null;
}

export async function createEmailTemplate(draft: EmailTemplateDraft): Promise<EmailTemplate> {
  const all = await readEmailTemplates();
  const now = new Date().toISOString();
  const template: EmailTemplate = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nombre: draft.nombre ?? "",
    asunto: draft.asunto ?? "",
    cuerpoHtml: draft.cuerpoHtml ?? "",
    createdAt: now,
    updatedAt: now,
  };
  all.push(template);
  await jset(EMAIL_TEMPLATES_KEY, all);
  return template;
}

export async function updateEmailTemplate(id: string, patch: EmailTemplateDraft): Promise<EmailTemplate | null> {
  const all = await readEmailTemplates();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await jset(EMAIL_TEMPLATES_KEY, all);
  return all[idx];
}

export async function deleteEmailTemplate(id: string): Promise<boolean> {
  const all = await readEmailTemplates();
  const next = all.filter((t) => t.id !== id);
  if (next.length === all.length) return false;
  await jset(EMAIL_TEMPLATES_KEY, next);
  return true;
}

/* ----------------------------- Testimonios ------------------------------ */
// "/testimonios" y "/testimonios/[slug]", editables desde /admin/testimonios.
// Mismo patrón que promociones (semilla aditiva), salvo que las semillas de
// testimonios son ilustrativas y siempre en status "borrador" — ver el aviso
// en lib/testimonios.ts.

const TESTIMONIOS_KEY = "testimonios:all";

async function readTestimonios(): Promise<Testimonio[]> {
  const stored = await jget<Testimonio[]>(TESTIMONIOS_KEY);
  if (!stored || !stored.length) {
    const seeded = [...DEFAULT_TESTIMONIOS];
    await jset(TESTIMONIOS_KEY, seeded);
    return seeded;
  }
  const knownIds = new Set(stored.map((t) => t.id));
  const missing = DEFAULT_TESTIMONIOS.filter((t) => !knownIds.has(t.id));
  if (missing.length) {
    const next = [...stored, ...missing];
    await jset(TESTIMONIOS_KEY, next);
    return next;
  }
  return stored;
}

function sortTestimonios(testimonios: Testimonio[]): Testimonio[] {
  return [...testimonios].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function listTestimonios(opts?: { onlyPublished?: boolean }): Promise<Testimonio[]> {
  let all = await readTestimonios();
  if (opts?.onlyPublished) all = all.filter((t) => t.status === "publicado");
  return sortTestimonios(all);
}

export async function getTestimonio(id: string): Promise<Testimonio | null> {
  const all = await readTestimonios();
  return all.find((t) => t.id === id) ?? null;
}

export async function getTestimonioBySlug(slug: string, opts?: { onlyPublished?: boolean }): Promise<Testimonio | null> {
  const all = await readTestimonios();
  const testimonio = all.find((t) => t.slug === slug) ?? null;
  if (testimonio && opts?.onlyPublished && testimonio.status !== "publicado") return null;
  return testimonio;
}

export async function otherTestimonios(id: string, limit = 3): Promise<Testimonio[]> {
  const all = await listTestimonios({ onlyPublished: true });
  return all.filter((t) => t.id !== id).slice(0, limit);
}

// true si el slug ya está en uso por OTRO testimonio (excludeId = el que se está editando).
export async function testimonioSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const all = await readTestimonios();
  return all.some((t) => t.slug === slug && t.id !== excludeId);
}

export async function createTestimonio(draft: TestimonioDraft): Promise<Testimonio> {
  const all = await readTestimonios();
  const now = new Date().toISOString();
  const testimonio: Testimonio = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    slug: draft.slug ?? "",
    status: draft.status ?? "borrador",
    nombre: draft.nombre ?? "",
    ubicacion: draft.ubicacion ?? "",
    producto: draft.producto ?? "",
    resumen: draft.resumen ?? "",
    cita: draft.cita ?? "",
    fotoDestacada: draft.fotoDestacada ?? "",
    galeria: draft.galeria ?? [],
    capitulos: draft.capitulos ?? [],
    ctaTexto: draft.ctaTexto ?? "Calcula tu precio",
    ctaHref: draft.ctaHref ?? "/tarificador",
    metaTitle: draft.metaTitle ?? "",
    metaDescription: draft.metaDescription ?? "",
    publishedAt: draft.publishedAt ?? now.slice(0, 10),
    updatedAt: now,
  };
  all.push(testimonio);
  await jset(TESTIMONIOS_KEY, all);
  return testimonio;
}

export async function updateTestimonio(id: string, patch: TestimonioDraft): Promise<Testimonio | null> {
  const all = await readTestimonios();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await jset(TESTIMONIOS_KEY, all);
  return all[idx];
}

export async function deleteTestimonio(id: string): Promise<boolean> {
  const all = await readTestimonios();
  const next = all.filter((t) => t.id !== id);
  if (next.length === all.length) return false;
  await jset(TESTIMONIOS_KEY, next);
  return true;
}

/* ------------------------ Banners de campaña (slider) ----------------------- */

const CAMPAIGN_KEY = "campaign:home";

export async function getCampaignConfig(): Promise<CampaignConfig> {
  const stored = await jget<CampaignConfig>(CAMPAIGN_KEY);
  if (!stored || !Array.isArray(stored.slides)) return DEFAULT_CAMPAIGN_CONFIG;
  return { ...DEFAULT_CAMPAIGN_CONFIG, ...stored };
}

export async function saveCampaignConfig(patch: Partial<CampaignConfig>): Promise<CampaignConfig> {
  const current = await getCampaignConfig();
  const next: CampaignConfig = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await jset(CAMPAIGN_KEY, next);
  return next;
}

/* ------------------------- Landings PAID (/lp/[slug]) ----------------------- */
// Editable desde /admin/campanas/landings. Sustituye a la antigua landing
// única de /lp/salud (documento singleton en "landing:lp-salud") por una
// colección — mismo patrón que promociones/testimonios: un array JSON
// completo bajo una única clave, leído/escrito entero en cada operación.

const LANDINGS_KEY = "landings:all";
// Clave legacy de la landing única anterior a esta colección — se lee solo
// una vez, para migrar su contenido si la colección nueva está vacía. No se
// borra: queda como copia de seguridad recuperable en Redis sin más coste.
const LEGACY_LP_SALUD_KEY = "landing:lp-salud";

async function readLandings(): Promise<Landing[]> {
  const stored = await jget<Landing[]>(LANDINGS_KEY);
  if (stored && stored.length) return stored;

  // Primer arranque tras el despliegue de la colección: si había una config
  // guardada bajo el documento singleton antiguo, se adapta a un Landing con
  // slug "salud" para no perder la copia ya editada por el equipo de paid;
  // si no había nada, se siembra con la copia por defecto de siempre.
  const legacy = await jget<Omit<Landing, "id" | "slug" | "status" | "producto" | "createdAt">>(LEGACY_LP_SALUD_KEY);
  const seeded: Landing[] = [
    legacy
      ? {
          ...DEFAULT_LANDING_SALUD,
          ...legacy,
          id: "seed-salud", slug: "salud", status: "publicado", producto: "salud",
          createdAt: legacy.updatedAt || DEFAULT_LANDING_SALUD.createdAt,
        }
      : DEFAULT_LANDING_SALUD,
  ];
  await jset(LANDINGS_KEY, seeded);
  return seeded;
}

export async function listLandings(opts?: { onlyPublished?: boolean; producto?: LandingProducto }): Promise<Landing[]> {
  let all = await readLandings();
  if (opts?.onlyPublished) all = all.filter((l) => l.status === "publicado");
  if (opts?.producto) all = all.filter((l) => l.producto === opts.producto);
  return [...all].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getLanding(id: string): Promise<Landing | null> {
  const all = await readLandings();
  return all.find((l) => l.id === id) ?? null;
}

export async function getLandingBySlug(slug: string, opts?: { onlyPublished?: boolean }): Promise<Landing | null> {
  const all = await readLandings();
  const landing = all.find((l) => l.slug === slug) ?? null;
  if (landing && opts?.onlyPublished && landing.status !== "publicado") return null;
  return landing;
}

// true si el slug ya está en uso por OTRA landing (excludeId = la que se está editando).
export async function landingSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const all = await readLandings();
  return all.some((l) => l.slug === slug && l.id !== excludeId);
}

export async function createLanding(draft: LandingDraft): Promise<Landing> {
  const all = await readLandings();
  const now = new Date().toISOString();
  const landing: Landing = {
    ...DEFAULT_LANDING_SALUD,
    ...draft,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    slug: draft.slug ?? "",
    status: draft.status ?? "borrador",
    producto: draft.producto ?? "salud",
    createdAt: now,
    updatedAt: now,
  };
  all.push(landing);
  await jset(LANDINGS_KEY, all);
  return landing;
}

export async function updateLanding(id: string, patch: LandingDraft): Promise<Landing | null> {
  const all = await readLandings();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await jset(LANDINGS_KEY, all);
  return all[idx];
}

export async function deleteLanding(id: string): Promise<boolean> {
  const all = await readLandings();
  const next = all.filter((l) => l.id !== id);
  if (next.length === all.length) return false;
  await jset(LANDINGS_KEY, next);
  return true;
}

// Copia una landing existente bajo un slug nuevo, como borrador — el punto
// de partida para "por ramo o público objetivo" sin reescribir todo a mano.
export async function duplicateLanding(id: string, newSlug: string): Promise<Landing | null> {
  const source = await getLanding(id);
  if (!source) return null;
  const all = await readLandings();
  const now = new Date().toISOString();
  const copy: Landing = {
    ...source,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    slug: newSlug,
    status: "borrador",
    createdAt: now,
    updatedAt: now,
  };
  all.push(copy);
  await jset(LANDINGS_KEY, all);
  return copy;
}

/* ------------------- Contadores del dashboard de landings ------------------ */
// Vistas y clics de CTA por landing y día, para el mini-dashboard de
// comparación (/admin/campanas/landings/comparar). Bucket diario, no log por
// evento — suficiente para tendencia histórica sin crecer sin límite.
// A diferencia del resto del store (documentos JSON completos vía jget/jset),
// aquí usamos comandos atómicos nativos de Redis (HINCRBY/HGETALL): es un
// contador puro, no hace falta el lock de más arriba.

async function hincrby(key: string, field: string, by = 1): Promise<void> {
  if (hasKV) {
    const r = await redisClient();
    await r.hincrby(key, field, by);
    return;
  }
  const rec = (mem.data.get(key) as Record<string, number> | undefined) ?? {};
  rec[field] = (rec[field] ?? 0) + by;
  mem.data.set(key, rec);
}
async function hgetall(key: string): Promise<Record<string, number>> {
  if (hasKV) {
    const r = await redisClient();
    return ((await r.hgetall(key)) as Record<string, number> | null) ?? {};
  }
  return (mem.data.get(key) as Record<string, number> | undefined) ?? {};
}

function beaconKey(slug: string, day: string): string {
  return `beacon:${slug}:${day}`;
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
// Rango de días yyyy-mm-dd inclusive, en orden — usado para leer el
// desglose de un periodo día a día sin necesitar un índice aparte.
function dayRange(fromDay: string, toDay: string): string[] {
  const days: string[] = [];
  let d = new Date(`${fromDay}T00:00:00Z`);
  const end = new Date(`${toDay}T00:00:00Z`);
  while (d <= end && days.length < 366) {
    days.push(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  }
  return days;
}

export type LandingEventKind = "view" | "cta_calcular" | "cta_llamar";

// Cada campo del hash combina las 3 dimensiones ("kind:device:daypart") en
// vez de abrir una clave de Redis por combinación — sigue siendo un único
// HINCRBY/HGETALL por landing y día, solo que con más campos dentro. El
// desglose por dispositivo/franja horaria se reconstruye sumando los campos
// que correspondan (ver parseCounterField / aggregateLandingCounters).
function counterField(kind: LandingEventKind, device: LandingDevice, daypart: LandingDaypart): string {
  return `${kind}:${device}:${daypart}`;
}
function parseCounterField(field: string): { kind: LandingEventKind; device: LandingDevice; daypart: LandingDaypart } | null {
  const [kind, device, daypart] = field.split(":");
  if (!kind || !device || !daypart) return null;
  return { kind: kind as LandingEventKind, device: device as LandingDevice, daypart: daypart as LandingDaypart };
}

export async function trackLandingEvent(
  slug: string, kind: LandingEventKind, device: LandingDevice, daypart: LandingDaypart, day = todayStr()
): Promise<void> {
  await hincrby(beaconKey(slug, day), counterField(kind, device, daypart), 1);
}

// { [yyyy-mm-dd]: { "view:mobile:tarde": N, ... } } para el rango pedido —
// forma cruda, pensada para agregar con aggregateLandingCounters.
export async function getLandingCounters(slug: string, fromDay: string, toDay: string): Promise<Record<string, Record<string, number>>> {
  const out: Record<string, Record<string, number>> = {};
  for (const day of dayRange(fromDay, toDay)) {
    out[day] = await hgetall(beaconKey(slug, day));
  }
  return out;
}

export type LandingCounterTotals = { views: number; ctaCalcular: number; ctaLlamar: number };

// Reduce la forma cruda de getLandingCounters a: el total (todas las
// dimensiones sumadas) + el desglose por dispositivo y por franja horaria —
// consumido por app/api/admin/landings/stats.
export function aggregateLandingCounters(counters: Record<string, Record<string, number>>): {
  total: LandingCounterTotals;
  byDevice: Record<LandingDevice, LandingCounterTotals>;
  byDaypart: Record<LandingDaypart, LandingCounterTotals>;
} {
  const empty = (): LandingCounterTotals => ({ views: 0, ctaCalcular: 0, ctaLlamar: 0 });
  const total = empty();
  const byDevice: Record<LandingDevice, LandingCounterTotals> = { mobile: empty(), tablet: empty(), desktop: empty() };
  const byDaypart: Record<LandingDaypart, LandingCounterTotals> = { madrugada: empty(), manana: empty(), tarde: empty(), noche: empty() };

  function add(bucket: LandingCounterTotals, kind: LandingEventKind, n: number) {
    if (kind === "view") bucket.views += n;
    else if (kind === "cta_calcular") bucket.ctaCalcular += n;
    else if (kind === "cta_llamar") bucket.ctaLlamar += n;
  }

  for (const dayFields of Object.values(counters)) {
    for (const [field, n] of Object.entries(dayFields)) {
      const parsed = parseCounterField(field);
      if (!parsed) continue; // campo de un formato antiguo/desconocido — se ignora, no rompe el resto
      add(total, parsed.kind, n);
      if (byDevice[parsed.device]) add(byDevice[parsed.device], parsed.kind, n);
      if (byDaypart[parsed.daypart]) add(byDaypart[parsed.daypart], parsed.kind, n);
    }
  }
  return { total, byDevice, byDaypart };
}

/* ---------------- Landing "igualación de precio" ---------------- */
// Editable desde /admin/campanas/precio-mejor. Singleton (a diferencia de
// las landings de /lp/[slug], que son una colección — ver más abajo):
// mantiene defaults por sub-sección para no romper la landing si se guarda
// una config parcial.

const PRICE_MATCH_KEY = "landing:price-match";

export async function getPriceMatchLandingConfig(): Promise<PriceMatchLandingConfig> {
  const stored = await jget<PriceMatchLandingConfig>(PRICE_MATCH_KEY);
  if (!stored) return DEFAULT_PRICE_MATCH_LANDING;
  return {
    ...DEFAULT_PRICE_MATCH_LANDING,
    ...stored,
    hideAssistant: typeof stored.hideAssistant === "boolean" ? stored.hideAssistant : DEFAULT_PRICE_MATCH_LANDING.hideAssistant,
    hero: { ...DEFAULT_PRICE_MATCH_LANDING.hero, ...(stored.hero ?? {}) },
    compromisoBadges: Array.isArray(stored.compromisoBadges) ? stored.compromisoBadges : DEFAULT_PRICE_MATCH_LANDING.compromisoBadges,
    comoFunciona: {
      ...DEFAULT_PRICE_MATCH_LANDING.comoFunciona,
      ...(stored.comoFunciona ?? {}),
      steps: Array.isArray(stored.comoFunciona?.steps) ? stored.comoFunciona!.steps : DEFAULT_PRICE_MATCH_LANDING.comoFunciona.steps,
    },
    socialProof: {
      ...DEFAULT_PRICE_MATCH_LANDING.socialProof,
      ...(stored.socialProof ?? {}),
      testimonios: Array.isArray(stored.socialProof?.testimonios) ? stored.socialProof!.testimonios : DEFAULT_PRICE_MATCH_LANDING.socialProof.testimonios,
    },
    faq: {
      ...DEFAULT_PRICE_MATCH_LANDING.faq,
      ...(stored.faq ?? {}),
      items: Array.isArray(stored.faq?.items) ? stored.faq!.items : DEFAULT_PRICE_MATCH_LANDING.faq.items,
    },
    footer: {
      ...DEFAULT_PRICE_MATCH_LANDING.footer,
      ...(stored.footer ?? {}),
      enlaces: Array.isArray(stored.footer?.enlaces) ? stored.footer!.enlaces : DEFAULT_PRICE_MATCH_LANDING.footer.enlaces,
    },
    utm: { ...DEFAULT_PRICE_MATCH_LANDING.utm, ...(stored.utm ?? {}) },
  };
}

export async function savePriceMatchLandingConfig(next: PriceMatchLandingConfig): Promise<PriceMatchLandingConfig> {
  const stamped: PriceMatchLandingConfig = { ...next, updatedAt: new Date().toISOString() };
  await jset(PRICE_MATCH_KEY, stamped);
  return stamped;
}

/* ------------------------ Exit-intent de la web general --------------------- */

const EXIT_INTENT_KEY = "exitintent:general";

export async function getExitIntentConfig(): Promise<ExitIntentConfig> {
  const stored = await jget<ExitIntentConfig>(EXIT_INTENT_KEY);
  if (!stored || !Array.isArray(stored.campaigns)) return DEFAULT_EXIT_INTENT_CONFIG;
  return { ...DEFAULT_EXIT_INTENT_CONFIG, ...stored };
}

export async function saveExitIntentConfig(patch: Partial<ExitIntentConfig>): Promise<ExitIntentConfig> {
  const current = await getExitIntentConfig();
  const next: ExitIntentConfig = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await jset(EXIT_INTENT_KEY, next);
  return next;
}

/* --------------------------- Apariencia del sitio --------------------------- */

const THEME_KEY = "theme:site";

export async function getTheme(): Promise<SiteTheme> {
  const stored = await jget<SiteTheme>(THEME_KEY);
  if (!stored) return DEFAULT_THEME;
  return {
    ...DEFAULT_THEME,
    ...stored,
    colors: { ...DEFAULT_THEME.colors, ...(stored.colors ?? {}) },
    heroImages: { ...(stored.heroImages ?? {}) },
    partnerLogos: { ...(stored.partnerLogos ?? {}) },
    cookieConsent: { ...DEFAULT_THEME.cookieConsent, ...(stored.cookieConsent ?? {}) },
    accessibilityWidget: { ...DEFAULT_THEME.accessibilityWidget, ...(stored.accessibilityWidget ?? {}) },
    ga4: { ...DEFAULT_THEME.ga4, ...(stored.ga4 ?? {}) },
    metaPixel: { ...DEFAULT_THEME.metaPixel, ...(stored.metaPixel ?? {}) },
    pageTransitionLoader: {
      ...DEFAULT_THEME.pageTransitionLoader,
      ...(stored.pageTransitionLoader ?? {}),
      subtitles: { ...DEFAULT_THEME.pageTransitionLoader.subtitles, ...(stored.pageTransitionLoader?.subtitles ?? {}) },
      tips: stored.pageTransitionLoader?.tips ?? DEFAULT_THEME.pageTransitionLoader.tips,
    },
    autoWidget: { ...DEFAULT_THEME.autoWidget, ...(stored.autoWidget ?? {}) },
    homeHero: { ...DEFAULT_THEME.homeHero, ...(stored.homeHero ?? {}) },
  };
}

export async function saveTheme(patch: Partial<SiteTheme>): Promise<SiteTheme> {
  const current = await getTheme();
  const next: SiteTheme = {
    ...current,
    ...patch,
    colors: { ...current.colors, ...(patch.colors ?? {}) },
    heroImages: { ...current.heroImages, ...(patch.heroImages ?? {}) },
    partnerLogos: { ...current.partnerLogos, ...(patch.partnerLogos ?? {}) },
    cookieConsent: { ...current.cookieConsent, ...(patch.cookieConsent ?? {}) },
    accessibilityWidget: { ...current.accessibilityWidget, ...(patch.accessibilityWidget ?? {}) },
    ga4: { ...current.ga4, ...(patch.ga4 ?? {}) },
    metaPixel: { ...current.metaPixel, ...(patch.metaPixel ?? {}) },
    autoWidget: { ...current.autoWidget, ...(patch.autoWidget ?? {}) },
    homeHero: { ...current.homeHero, ...(patch.homeHero ?? {}) },
    updatedAt: new Date().toISOString(),
  };
  await jset(THEME_KEY, next);
  return next;
}

/* ------------------------------ Presupuestos -------------------------------- */
// Precio orientativo según la compañía recomendada/destacada del catálogo
// (no es una cotización en firme). Compartido entre la creación del
// presupuesto (al completar el tarificador) y cualquier recálculo posterior.
export async function estimatePrecio(producto: string, data: Record<string, unknown>): Promise<number | null> {
  if (producto !== "salud" && producto !== "vida" && producto !== "auto" && producto !== "decesos") return null;
  const products = await listProducts(producto, true);
  if (!products.length) return null;
  const rec = products.find((p) => p.destacado) ?? products[0];
  if (producto === "salud") {
    const price = saludPrice(
      { conCopago: rec.precioConCopago ?? 0, sinCopago: rec.precioSinCopago ?? 0 },
      { numAsegurados: Number(data.numAsegurados) || 1, coberturaDental: !!data.coberturaDental }
    );
    return Math.min(price.conCopago, price.sinCopago);
  }
  if (producto === "auto") {
    const price = autoPrice(
      { precio: rec.precio ?? 0 },
      { antiguedadCarnet: data.antiguedadCarnet as string | undefined, coberturaDeseada: data.coberturaDeseada as string | undefined }
    );
    return price.precio;
  }
  if (producto === "decesos") {
    const price = decesosPrice({ precio: rec.precio ?? 0 }, { numAsegurados: Number(data.numAsegurados) || 1 });
    return price.precio;
  }
  const price = vidaPrice({ precio: rec.precio ?? 0 }, { fumador: !!data.fumador });
  return price.precio;
}

export async function createPresupuesto(input: {
  id: string;
  leadId: string;
  source: string;
  producto: string;
  data: Record<string, unknown>;
  nombre: string;
  telefono: string;
  email: string;
}): Promise<Presupuesto> {
  const now = new Date().toISOString();
  const precioAprox = await estimatePrecio(input.producto, input.data);
  const presupuesto: Presupuesto = {
    id: input.id, leadId: input.leadId, createdAt: now, updatedAt: now, closedAt: "",
    source: input.source, producto: input.producto, status: "nuevo",
    data: input.data, precioAprox, notas: [], eleccion: null, closedBy: "",
    nombre: input.nombre, telefono: input.telefono, email: input.email,
  };
  await jset(`presupuesto:${input.id}`, presupuesto);
  await zadd("presupuestos:index", Date.parse(now), input.id);
  await zadd(`presupuestos:byLead:${input.leadId}`, Date.parse(now), input.id);
  await jset(`presupuesto:byCode:${quoteNumber(input.id)}`, input.id);
  return presupuesto;
}

// Presupuesto preparado a medida por un agente desde /admin/presupuestos
// (elige un producto del catálogo o escribe uno personalizado). Se vincula
// siempre a un lead ya existente.
export async function createManualPresupuesto(input: {
  leadId: string;
  producto: string;
  compania: string;
  precio: number | null;
  condiciones?: string;
  servicios?: string[];
  // Presente cuando el agente consultó un precio real vía Codeoscopic antes
  // de crear el presupuesto (ver app/api/admin/leads/[id]/codeoscopic-quote
  // y components/admin/CreatePresupuestoModal.tsx) — se guarda igual que
  // setPresupuestoCodeoscopicInsurance, para que el badge "Codeoscopic ✓"
  // (app/admin/page.tsx PresupuestosPanel) se muestre también aquí.
  codeoscopicInsuranceId?: string;
}): Promise<Presupuesto | null> {
  const lead = await getLead(input.leadId);
  if (!lead) return null;
  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const eleccion: PresupuestoEleccion = {
    compania: input.compania, precio: input.precio,
    condiciones: input.condiciones, servicios: input.servicios, at: now,
  };
  const data: Record<string, unknown> = { codigoPostal: lead.codigoPostal };
  if (input.codeoscopicInsuranceId) data.codeoscopicInsuranceId = input.codeoscopicInsuranceId;
  const presupuesto: Presupuesto = {
    id, leadId: input.leadId, createdAt: now, updatedAt: now, closedAt: "",
    source: "admin-manual", producto: input.producto, status: "enviado",
    data, precioAprox: input.precio, notas: [], eleccion, closedBy: "",
    nombre: lead.nombre, telefono: lead.telefono, email: lead.email,
  };
  await jset(`presupuesto:${id}`, presupuesto);
  await zadd("presupuestos:index", Date.parse(now), id);
  await zadd(`presupuestos:byLead:${input.leadId}`, Date.parse(now), id);
  await jset(`presupuesto:byCode:${quoteNumber(id)}`, id);
  return presupuesto;
}

// Registra qué compañía y precio eligió realmente el cliente (al pedir que
// le llamen sobre una compañía concreta desde la comparativa): se aplica al
// presupuesto más reciente de ese lead para el mismo producto.
// Guarda el id devuelto por Codeoscopic al crear el proyecto de seguros
// (POST /insurances) en el propio presupuesto, para que el polling posterior
// desde el frontend sepa a qué insurance mirar. Se guarda dentro de `data`
// para no ampliar el tipo Presupuesto — es un dato específico de una
// integración externa, no un campo estable del pipeline comercial.
export async function setPresupuestoCodeoscopicInsurance(
  presupuestoId: string,
  insuranceId: string
): Promise<void> {
  const p = await jget<Presupuesto>(`presupuesto:${presupuestoId}`);
  if (!p) return;
  const data = { ...(p.data ?? {}), codeoscopicInsuranceId: insuranceId };
  const now = new Date().toISOString();
  await jset(`presupuesto:${presupuestoId}`, { ...p, data, updatedAt: now });
}

// Snapshot resumido de las cotizaciones que devuelve Codeoscopic — lo que
// se muestra en el bloque "Codeoscopic" de /admin/presupuestos/[id] para
// que el equipo comercial vea el detalle real sin depender de que la API
// de Codeoscopic responda en ese momento. Se refresca en cada
// POST /api/quote/create y cada GET /api/quote/[insuranceId].
export type CodeoscopicQuoteSummary = {
  id: string;
  compania: string;
  producto: string;
  modalidad: string;
  premium: number | null;
  downPayment: number | null;
  frequency: string;
  estimate: boolean;
};

/* ------------------------- Métricas Codeoscopic --------------------------- */
// Escanea todos los presupuestos y agrega KPIs de la integración Codeoscopic
// para /admin/informes. Es O(N) sobre el listado — bien mientras no sean
// decenas de miles; en ese caso movemos esto a un cron con precómputo.

export type CodeoscopicMetrics = {
  totalPresupuestos: number;
  soloSalud: number;
  conInsuranceId: number;
  conSnapshot: number;
  snapshotCompleto: number;
  cotizacionesTotales: number;
  precioMedioMensual: number | null;
  topCompanias: { compania: string; cotizaciones: number; precioMedio: number | null }[];
  topElecciones: { compania: string; elecciones: number; precioMedio: number | null }[];
  ultimoSnapshotAt: string;
};

export async function computeCodeoscopicMetrics(): Promise<CodeoscopicMetrics> {
  const all = await listPresupuestos();
  const salud = all.filter((p) => p.producto === "salud");
  let conInsuranceId = 0;
  let conSnapshot = 0;
  let snapshotCompleto = 0;
  let cotizacionesTotales = 0;
  let ultimoSnapshotAt = "";
  const preciosMensuales: number[] = [];
  const cotXCompania = new Map<string, number[]>();
  const eleccionesXCompania = new Map<string, number[]>();

  for (const p of salud) {
    const data = (p.data ?? {}) as Record<string, unknown>;
    const insuranceId = typeof data.codeoscopicInsuranceId === "string" ? data.codeoscopicInsuranceId : "";
    if (insuranceId) conInsuranceId += 1;
    const snap = data.codeoscopicSnapshot as { updatedAt?: string; done?: boolean; quotes?: unknown[] } | undefined;
    if (snap && Array.isArray(snap.quotes)) {
      conSnapshot += 1;
      if (snap.done) snapshotCompleto += 1;
      if (snap.updatedAt && (!ultimoSnapshotAt || snap.updatedAt > ultimoSnapshotAt)) ultimoSnapshotAt = snap.updatedAt;
      for (const q of snap.quotes) {
        const quote = q as { compania?: string; premium?: number | null; frequency?: string };
        cotizacionesTotales += 1;
        if (typeof quote.premium === "number") {
          const mensual = quote.frequency === "Annually" ? quote.premium / 12 : quote.premium;
          preciosMensuales.push(mensual);
          const bucket = cotXCompania.get(quote.compania ?? "—") ?? [];
          bucket.push(mensual);
          cotXCompania.set(quote.compania ?? "—", bucket);
        }
      }
    }
    if (p.eleccion?.compania) {
      const bucket = eleccionesXCompania.get(p.eleccion.compania) ?? [];
      if (typeof p.eleccion.precio === "number") bucket.push(p.eleccion.precio);
      eleccionesXCompania.set(p.eleccion.compania, bucket);
    }
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const topCompanias = Array.from(cotXCompania.entries())
    .map(([compania, arr]) => ({ compania, cotizaciones: arr.length, precioMedio: avg(arr) }))
    .sort((a, b) => b.cotizaciones - a.cotizaciones)
    .slice(0, 10);

  const topElecciones = Array.from(eleccionesXCompania.entries())
    .map(([compania, arr]) => ({ compania, elecciones: arr.length, precioMedio: avg(arr) }))
    .sort((a, b) => b.elecciones - a.elecciones)
    .slice(0, 10);

  return {
    totalPresupuestos: all.length,
    soloSalud: salud.length,
    conInsuranceId,
    conSnapshot,
    snapshotCompleto,
    cotizacionesTotales,
    precioMedioMensual: avg(preciosMensuales),
    topCompanias,
    topElecciones,
    ultimoSnapshotAt,
  };
}

/* ------------------- Métricas "igualación de precio" ---------------------- */
// Escanea leads con priceMatch para /admin/informes. Devuelve total,
// distribución por compañía competidora, precio medio ofrecido, ratio de
// cierre (leads price-match con eleccion registrada).

export type PriceMatchMetrics = {
  totalSolicitudes: number;
  precioMedioOfrecido: number | null;
  topCompeticion: { compania: string; solicitudes: number; precioMedio: number | null }[];
  cerrados: number; // leads price-match que acabaron con presupuesto.eleccion
  ratioCierre: number; // 0-1
  ultimoSolicitadoAt: string;
};

export async function computePriceMatchMetrics(): Promise<PriceMatchMetrics> {
  const all = await listLeads();
  const pmLeads = all.filter((l) => l.priceMatch);
  const precios: number[] = [];
  const byCompania = new Map<string, number[]>();
  let ultimo = "";

  for (const l of pmLeads) {
    const pm = l.priceMatch!;
    if (typeof pm.precioActual === "number") {
      // Mensualizamos si viene anual para comparar en la misma escala.
      const mensual = pm.periodicidad === "año" ? pm.precioActual / 12 : pm.precioActual;
      precios.push(mensual);
      const bucket = byCompania.get(pm.companiaActual || "—") ?? [];
      bucket.push(mensual);
      byCompania.set(pm.companiaActual || "—", bucket);
    }
    if (pm.solicitadoAt && pm.solicitadoAt > ultimo) ultimo = pm.solicitadoAt;
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  // Cierre: leads price-match cuyo presupuesto asociado tiene eleccion.
  // Escaneamos presupuestos y cruzamos por leadId.
  const allPresupuestos = await listPresupuestos();
  const cerradosSet = new Set<string>();
  const pmLeadIds = new Set(pmLeads.map((l) => l.id));
  for (const p of allPresupuestos) {
    if (pmLeadIds.has(p.leadId) && p.eleccion?.compania) cerradosSet.add(p.leadId);
  }

  const topCompeticion = Array.from(byCompania.entries())
    .map(([compania, arr]) => ({ compania, solicitudes: arr.length, precioMedio: avg(arr) }))
    .sort((a, b) => b.solicitudes - a.solicitudes)
    .slice(0, 10);

  return {
    totalSolicitudes: pmLeads.length,
    precioMedioOfrecido: avg(precios),
    topCompeticion,
    cerrados: cerradosSet.size,
    ratioCierre: pmLeads.length > 0 ? cerradosSet.size / pmLeads.length : 0,
    ultimoSolicitadoAt: ultimo,
  };
}

export async function setPresupuestoCodeoscopicSnapshot(
  presupuestoId: string,
  snapshot: { insuranceId: string; quotes: CodeoscopicQuoteSummary[]; done: boolean }
): Promise<void> {
  const p = await jget<Presupuesto>(`presupuesto:${presupuestoId}`);
  if (!p) return;
  const now = new Date().toISOString();
  const data = {
    ...(p.data ?? {}),
    codeoscopicInsuranceId: snapshot.insuranceId,
    codeoscopicSnapshot: {
      updatedAt: now,
      done: snapshot.done,
      quotes: snapshot.quotes,
    },
  };
  await jset(`presupuesto:${presupuestoId}`, { ...p, data, updatedAt: now });
}

export async function setPresupuestoEleccion(
  leadId: string,
  producto: string,
  eleccion: { compania: string; precio: number | null }
): Promise<Presupuesto | null> {
  const list = await listPresupuestosByLead(leadId);
  const target = list.find((p) => p.producto === producto) ?? list[0];
  if (!target) return null;
  const now = new Date().toISOString();
  target.eleccion = { compania: eleccion.compania, precio: eleccion.precio, at: now };
  target.updatedAt = now;
  await jset(`presupuesto:${target.id}`, target);
  await zadd("presupuestos:index", Date.parse(now), target.id);
  await zadd(`presupuestos:byLead:${leadId}`, Date.parse(now), target.id);
  return target;
}

export async function listPresupuestos(): Promise<Presupuesto[]> {
  const ids = await zrangeRev("presupuestos:index");
  const out: Presupuesto[] = [];
  for (const id of ids) {
    const p = await jget<Presupuesto>(`presupuesto:${id}`);
    if (p) out.push(p);
  }
  return out;
}

export async function listPresupuestosByLead(leadId: string): Promise<Presupuesto[]> {
  const ids = await zrangeRev(`presupuestos:byLead:${leadId}`);
  const out: Presupuesto[] = [];
  for (const id of ids) {
    const p = await jget<Presupuesto>(`presupuesto:${id}`);
    if (p) out.push(p);
  }
  return out;
}

export async function getPresupuesto(id: string): Promise<Presupuesto | null> {
  return jget<Presupuesto>(`presupuesto:${id}`);
}

async function getPresupuestoByCode(code: string): Promise<Presupuesto | null> {
  const id = await jget<string>(`presupuesto:byCode:${code}`);
  if (!id) return null;
  return getPresupuesto(id);
}

// Área de cliente sin registro: localiza al lead a partir de UN solo dato
// (el que el cliente tenga a mano) — su correo, su móvil (con o sin
// prefijo +34) o su número de presupuesto (código corto). Se detecta el
// tipo de dato por su forma: con "@" se busca por correo, si son dígitos de
// móvil español se busca por teléfono, y en cualquier otro caso se
// interpreta como número de presupuesto.
async function findLeadIdByIdentifier(raw: string): Promise<string | null> {
  const value = raw.trim();
  if (!value) return null;

  if (value.includes("@")) {
    return (await jget<string>(`idx:email:${value.toLowerCase()}`)) ?? null;
  }

  const digits = value.replace(/[\s.\-()]/g, "");
  if (/^(\+?34)?[6-9]\d{8}$/.test(digits)) {
    return (await jget<string>(`idx:phone:${normalizePhone(digits)}`)) ?? null;
  }

  const code = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const presupuesto = code ? await getPresupuestoByCode(code) : null;
  return presupuesto?.leadId ?? null;
}

// Localiza al lead por su dato único y devuelve TODOS sus presupuestos (no
// solo el que dio pie a la búsqueda), para que un cliente con varios
// tarificadores los vea todos entrando con cualquiera de sus datos. Un lead
// sin ningún presupuesto (p.ej. solo pidió que le llamaran, o su única
// consulta fue un ticket del asistente) también se identifica correctamente
// — sigue teniendo llamadas que ver en su área de cliente — devuelve la
// lista vacía en vez de null. Solo es null si no se encuentra el lead.
export async function findClientPresupuestos(identifier: string): Promise<{ leadId: string; presupuestos: Presupuesto[] } | null> {
  const leadId = await findLeadIdByIdentifier(identifier);
  if (!leadId) return null;
  const presupuestos = await listPresupuestosByLead(leadId);
  return { leadId, presupuestos };
}

export async function updatePresupuesto(
  id: string,
  patch: { status?: PresupuestoStatus; note?: string; agente?: string }
): Promise<{ presupuesto: Presupuesto; notifyText: string | null; notifyUrl: string } | null> {
  const p = await jget<Presupuesto>(`presupuesto:${id}`);
  if (!p) return null;
  const now = new Date().toISOString();
  const agente = patch.agente?.trim() || "";
  const wonJustNow = !!patch.status && patch.status !== p.status && patch.status === "ganado";
  if (patch.status && patch.status !== p.status) {
    p.status = patch.status;
    const closing = patch.status === "ganado" || patch.status === "perdido";
    p.closedAt = closing ? now : "";
    if (closing && agente) p.closedBy = agente;
    if (!closing) p.closedBy = "";
  }
  if (patch.note && patch.note.trim()) {
    const note: PresupuestoNote = { id: makeSubmissionId(), at: now, texto: patch.note.trim(), agente: agente || undefined };
    p.notas = [note, ...p.notas];
  }
  p.updatedAt = now;
  await jset(`presupuesto:${id}`, p);
  await zadd("presupuestos:index", Date.parse(now), id);
  await zadd(`presupuestos:byLead:${p.leadId}`, Date.parse(now), id);

  // Al contratar (ganado), igual que al cerrar una llamada: se ofrece la
  // encuesta de satisfacción en el momento en que la experiencia está más
  // fresca, en vez de esperar a que el cliente entre por su cuenta.
  let notifyText: string | null = null;
  let notifyUrl = "";
  if (wonJustNow) {
    notifyText = "¡Enhorabuena por tu nuevo seguro! ¿Nos cuentas qué tal la experiencia?";
    notifyUrl = `/valoracion/${p.id}`;
    await createClientNotification({ leadId: p.leadId, llamadaId: "", texto: notifyText, url: notifyUrl });
  }

  return { presupuesto: p, notifyText, notifyUrl };
}

/* ---------------------------------- Llamadas ----------------------------------- */
// Cada solicitud de "que me llamen" (formulario, quick-confirm, asistente,
// reprogramación desde el área de cliente) crea una llamada propia — igual
// que un presupuesto por cada tarificación —, gestionable desde
// /admin/llamadas con su propio estado, notas y agente, sin perder el
// vínculo con el lead ni, si aplica, con el presupuesto sobre el que trata.

export async function createLlamada(draft: LlamadaDraft): Promise<Llamada> {
  const now = new Date().toISOString();
  const id = makeSubmissionId();
  const llamada: Llamada = {
    id, leadId: draft.leadId, createdAt: now, updatedAt: now, status: draft.fechaProgramada ? "programada" : "pendiente",
    producto: draft.producto ?? "", source: draft.source ?? "", presupuestoId: draft.presupuestoId ?? "",
    motivo: draft.motivo ?? "", diaLlamada: draft.diaLlamada ?? "", turnoLlamada: draft.turnoLlamada ?? "",
    fechaProgramada: draft.fechaProgramada ?? "", horaProgramada: "", agente: "", notas: [],
    nombre: draft.nombre ?? "", telefono: draft.telefono ?? "", codigoPostal: draft.codigoPostal ?? "",
  };
  await jset(`llamada:${id}`, llamada);
  await zadd("llamadas:index", Date.parse(now), id);
  await zadd(`llamadas:byLead:${draft.leadId}`, Date.parse(now), id);
  return llamada;
}

export async function listLlamadas(): Promise<Llamada[]> {
  const ids = await zrangeRev("llamadas:index");
  const out: Llamada[] = [];
  for (const id of ids) {
    const l = await jget<Llamada>(`llamada:${id}`);
    if (l) out.push(l);
  }
  return out;
}

export async function listLlamadasByLead(leadId: string): Promise<Llamada[]> {
  const ids = await zrangeRev(`llamadas:byLead:${leadId}`);
  const out: Llamada[] = [];
  for (const id of ids) {
    const l = await jget<Llamada>(`llamada:${id}`);
    if (l) out.push(l);
  }
  return out;
}

export async function getLlamada(id: string): Promise<Llamada | null> {
  return jget<Llamada>(`llamada:${id}`);
}

const LLAMADA_STATUS_ACTIVITY: Record<LlamadaStatus, string> = {
  pendiente: "pendiente",
  programada: "programada",
  hecha: "marcada como hecha",
  cancelada: "cancelada",
};

// Cuándo, en texto legible, según lo que haya fijado el agente (fecha+hora
// concreta) o, a falta de eso, la preferencia original del cliente.
function cuandoLlamada(l: Llamada): string {
  if (l.fechaProgramada) {
    const d = new Date(`${l.fechaProgramada}T${l.horaProgramada || "00:00"}:00`);
    const fechaTxt = Number.isNaN(d.getTime())
      ? l.fechaProgramada
      : d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
    return l.horaProgramada ? `el ${fechaTxt} a las ${l.horaProgramada}` : `el ${fechaTxt}`;
  }
  const partes = [l.diaLlamada, l.turnoLlamada].filter(Boolean);
  return partes.length ? partes.join(" ") : "";
}

// Actualiza estado/notas/reprogramación de una llamada. Cualquier cambio se
// refleja también como nota de actividad en la ficha única del lead. Si el
// cambio es relevante para el cliente (reprogramación, cierre o
// cancelación), se genera además una notificación pendiente de enviar
// (`notifyText`) — quien llame a esta función decide si además dispara un
// push, para no acoplar el almacén de datos con la integración externa.
export async function updateLlamada(
  id: string,
  patch: {
    status?: LlamadaStatus; note?: string; agente?: string;
    diaLlamada?: string; turnoLlamada?: string; fechaProgramada?: string; horaProgramada?: string;
  }
): Promise<{ llamada: Llamada; notifyText: string | null; notifyUrl: string } | null> {
  const l = await jget<Llamada>(`llamada:${id}`);
  if (!l) return null;
  const now = new Date().toISOString();
  const agente = patch.agente?.trim() || undefined;
  if (agente) l.agente = agente;

  const statusChanged = !!patch.status && patch.status !== l.status;
  const rescheduled = patch.diaLlamada !== undefined || patch.turnoLlamada !== undefined
    || patch.fechaProgramada !== undefined || patch.horaProgramada !== undefined;

  if (patch.diaLlamada !== undefined) l.diaLlamada = patch.diaLlamada;
  if (patch.turnoLlamada !== undefined) l.turnoLlamada = patch.turnoLlamada;
  if (patch.fechaProgramada !== undefined) l.fechaProgramada = patch.fechaProgramada;
  if (patch.horaProgramada !== undefined) l.horaProgramada = patch.horaProgramada;
  if (patch.status) l.status = patch.status;

  if (patch.note && patch.note.trim()) {
    const nota: LlamadaNote = { id: makeSubmissionId(), at: now, texto: patch.note.trim(), agente };
    l.notas = [nota, ...l.notas];
  }
  l.updatedAt = now;
  await jset(`llamada:${id}`, l);
  await zadd("llamadas:index", Date.parse(now), id);
  await zadd(`llamadas:byLead:${l.leadId}`, Date.parse(now), id);

  const activityParts: string[] = [];
  if (statusChanged) activityParts.push(`Llamada ${LLAMADA_STATUS_ACTIVITY[l.status]}`);
  if (rescheduled) activityParts.push(`reprogramada${cuandoLlamada(l) ? ` para ${cuandoLlamada(l)}` : ""}`);
  if (patch.note && patch.note.trim()) activityParts.push(patch.note.trim());
  if (activityParts.length) await updateLead(l.leadId, { note: activityParts.join(" — "), agente });

  // Solo avisamos al cliente ante eventos que le conciernen de verdad
  // (nunca por una nota interna suelta).
  let notifyText: string | null = null;
  let notifyUrl = "";
  if (rescheduled) {
    notifyText = `Hemos reprogramado tu llamada${cuandoLlamada(l) ? ` para ${cuandoLlamada(l)}` : ""}.`;
  } else if (statusChanged && l.status === "hecha") {
    // En vez de mandar sin más al área de cliente, el aviso lleva directo a
    // la encuesta de satisfacción — el momento en el que más fresca está la
    // experiencia para responder en 10 segundos.
    notifyText = "¿Qué tal la llamada? Cuéntanoslo en 10 segundos.";
    notifyUrl = `/valoracion/${l.id}`;
  } else if (statusChanged && l.status === "cancelada") {
    notifyText = "Hemos cancelado tu llamada.";
  }
  if (notifyText) await createClientNotification({ leadId: l.leadId, llamadaId: l.id, texto: notifyText, url: notifyUrl });

  return { llamada: l, notifyText, notifyUrl };
}

/* ----------------------------- Notificaciones al cliente ----------------------------- */

export async function createClientNotification(input: { leadId: string; llamadaId: string; texto: string; url?: string }): Promise<ClientNotification> {
  const now = new Date().toISOString();
  const id = makeSubmissionId();
  const n: ClientNotification = { id, leadId: input.leadId, llamadaId: input.llamadaId, at: now, texto: input.texto, leido: false, url: input.url ?? "" };
  await jset(`notif:${id}`, n);
  await zadd(`notifs:byLead:${input.leadId}`, Date.parse(now), id);
  return n;
}

export async function listClientNotifications(leadId: string): Promise<ClientNotification[]> {
  const ids = await zrangeRev(`notifs:byLead:${leadId}`);
  const out: ClientNotification[] = [];
  for (const id of ids) {
    const n = await jget<ClientNotification>(`notif:${id}`);
    if (n) out.push(n);
  }
  return out;
}

export async function markNotificationsRead(leadId: string, ids?: string[]): Promise<void> {
  const all = await listClientNotifications(leadId);
  const targets = ids ? all.filter((n) => ids.includes(n.id)) : all;
  for (const n of targets) {
    if (n.leido) continue;
    n.leido = true;
    await jset(`notif:${n.id}`, n);
  }
}

/* ------------------------- Suscripciones de aviso push ------------------------- */
// Un lead puede tener varias (uno por dispositivo/navegador donde activó
// los avisos). Sin integración de pago ni SDK nativo: Web Push estándar,
// opcional (si no hay claves VAPID configuradas, sencillamente no se envía
// nada — ver lib/webPush.ts).

export type StoredPushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function savePushSubscription(leadId: string, sub: StoredPushSubscription): Promise<void> {
  const key = `pushSubs:byLead:${leadId}`;
  const existing = (await jget<StoredPushSubscription[]>(key)) ?? [];
  const next = [sub, ...existing.filter((s) => s.endpoint !== sub.endpoint)].slice(0, 10);
  await jset(key, next);
}

export async function listPushSubscriptions(leadId: string): Promise<StoredPushSubscription[]> {
  return (await jget<StoredPushSubscription[]>(`pushSubs:byLead:${leadId}`)) ?? [];
}

export async function removePushSubscription(leadId: string, endpoint: string): Promise<void> {
  const key = `pushSubs:byLead:${leadId}`;
  const existing = (await jget<StoredPushSubscription[]>(key)) ?? [];
  await jset(key, existing.filter((s) => s.endpoint !== endpoint));
}

/* -------------------- Suscripciones push del equipo (admin) -------------------- */
// Además del canal cliente (por lead), cada agente del equipo puede activar
// avisos push en su navegador para enterarse en tiempo real de un lead nuevo.
// Los avisos son distintos: aquí siempre "algo entra al pipeline", allí
// "hay novedad en tu ficha". Se guardan aparte para no cruzar suscripciones.

export type StoredTeamPushSubscription = StoredPushSubscription & { agentId: string; savedAt: string };

export async function saveTeamPushSubscription(agentId: string, sub: StoredPushSubscription): Promise<void> {
  const key = `pushSubs:team:${agentId}`;
  const existing = (await jget<StoredTeamPushSubscription[]>(key)) ?? [];
  const now = new Date().toISOString();
  const next: StoredTeamPushSubscription[] = [
    { ...sub, agentId, savedAt: now },
    ...existing.filter((s) => s.endpoint !== sub.endpoint),
  ].slice(0, 10);
  await jset(key, next);
  // Índice de agentes con push activo (para poder listarlos en el fanout sin
  // recorrer todas las claves KV).
  const ids = new Set((await jget<string[]>("pushSubs:team:index")) ?? []);
  ids.add(agentId);
  await jset("pushSubs:team:index", Array.from(ids));
}

export async function listTeamPushSubscriptions(agentId: string): Promise<StoredTeamPushSubscription[]> {
  return (await jget<StoredTeamPushSubscription[]>(`pushSubs:team:${agentId}`)) ?? [];
}

export async function listAllTeamPushSubscriptions(): Promise<StoredTeamPushSubscription[]> {
  const ids = (await jget<string[]>("pushSubs:team:index")) ?? [];
  if (!ids.length) return [];
  const groups = await Promise.all(ids.map((id) => listTeamPushSubscriptions(id)));
  return groups.flat();
}

export async function removeTeamPushSubscription(agentId: string, endpoint: string): Promise<void> {
  const key = `pushSubs:team:${agentId}`;
  const existing = (await jget<StoredTeamPushSubscription[]>(key)) ?? [];
  const next = existing.filter((s) => s.endpoint !== endpoint);
  await jset(key, next);
  if (!next.length) {
    const ids = ((await jget<string[]>("pushSubs:team:index")) ?? []).filter((id) => id !== agentId);
    await jset("pushSubs:team:index", ids);
  }
}

/* --------------------- Configuración de avisos al equipo --------------------- */

const TEAM_NOTIFICATIONS_KEY = "config:team-notifications";

export async function getTeamNotificationsConfig(): Promise<import("./teamNotifications").TeamNotificationsConfig> {
  const { DEFAULT_TEAM_NOTIFICATIONS } = await import("./teamNotifications");
  const stored = await jget<import("./teamNotifications").TeamNotificationsConfig>(TEAM_NOTIFICATIONS_KEY);
  if (!stored) return DEFAULT_TEAM_NOTIFICATIONS;
  return {
    ...DEFAULT_TEAM_NOTIFICATIONS,
    ...stored,
    email: { ...DEFAULT_TEAM_NOTIFICATIONS.email, ...(stored.email ?? {}) },
    push: { ...DEFAULT_TEAM_NOTIFICATIONS.push, ...(stored.push ?? {}) },
  };
}

export async function saveTeamNotificationsConfig(
  patch: Partial<import("./teamNotifications").TeamNotificationsConfig>
): Promise<import("./teamNotifications").TeamNotificationsConfig> {
  const current = await getTeamNotificationsConfig();
  const next: import("./teamNotifications").TeamNotificationsConfig = {
    ...current,
    ...patch,
    email: { ...current.email, ...(patch.email ?? {}) },
    push: { ...current.push, ...(patch.push ?? {}) },
    updatedAt: new Date().toISOString(),
  };
  await jset(TEAM_NOTIFICATIONS_KEY, next);
  return next;
}

/* ---------------------------------- Tareas ------------------------------------ */

export async function createTask(draft: TaskDraft): Promise<Task> {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const task: Task = {
    id, leadId: draft.leadId ?? "", presupuestoId: draft.presupuestoId ?? "",
    titulo: draft.titulo.trim(), notas: draft.notas?.trim() ?? "",
    fecha: draft.fecha, hora: draft.hora ?? "", agente: draft.agente?.trim() ?? "",
    completada: false, completedAt: "", createdAt: now, updatedAt: now,
  };
  await jset(`task:${id}`, task);
  // Orden cronológico por fecha+hora (no por creación), para la agenda.
  const score = Date.parse(`${task.fecha}T${task.hora || "00:00"}:00`) || Date.parse(now);
  await zadd("tasks:index", score, id);
  if (task.leadId) await zadd(`tasks:byLead:${task.leadId}`, score, id);
  return task;
}

export async function listTasks(): Promise<Task[]> {
  const ids = await zrangeRev("tasks:index");
  const out: Task[] = [];
  for (const id of ids) {
    const t = await jget<Task>(`task:${id}`);
    if (t) out.push(t);
  }
  return out.reverse(); // orden cronológico ascendente (próximas primero)
}

export async function listTasksByLead(leadId: string): Promise<Task[]> {
  const ids = await zrangeRev(`tasks:byLead:${leadId}`);
  const out: Task[] = [];
  for (const id of ids) {
    const t = await jget<Task>(`task:${id}`);
    if (t) out.push(t);
  }
  return out.reverse();
}

export async function updateTask(
  id: string,
  patch: { completada?: boolean; titulo?: string; notas?: string; fecha?: string; hora?: string }
): Promise<Task | null> {
  const t = await jget<Task>(`task:${id}`);
  if (!t) return null;
  const now = new Date().toISOString();
  if (typeof patch.completada === "boolean") {
    t.completada = patch.completada;
    t.completedAt = patch.completada ? now : "";
  }
  if (typeof patch.titulo === "string" && patch.titulo.trim()) t.titulo = patch.titulo.trim();
  if (typeof patch.notas === "string") t.notas = patch.notas.trim();
  if (typeof patch.fecha === "string") t.fecha = patch.fecha;
  if (typeof patch.hora === "string") t.hora = patch.hora;
  t.updatedAt = now;
  await jset(`task:${id}`, t);
  const score = Date.parse(`${t.fecha}T${t.hora || "00:00"}:00`) || Date.parse(now);
  await zadd("tasks:index", score, id);
  if (t.leadId) await zadd(`tasks:byLead:${t.leadId}`, score, id);
  return t;
}

export async function deleteTask(id: string): Promise<boolean> {
  const t = await jget<Task>(`task:${id}`);
  if (!t) return false;
  await jdel(`task:${id}`);
  return true;
}

/* -------------------------------- Valoración (NPS) -------------------------------- */
// Una respuesta por llamada/presupuesto (refId = el id de esa entidad, que ya
// es un UUID impredecible — así el enlace público /valoracion/[id] no
// necesita sesión ni login, igual que un enlace de encuesta por email).

export async function getNpsResponse(refId: string): Promise<NpsResponse | null> {
  return jget<NpsResponse>(`nps:byRef:${refId}`);
}

export async function saveNpsResponse(input: {
  refId: string; refType: "llamada" | "presupuesto"; leadId: string; producto: string;
  score: number; comentario?: string;
}): Promise<NpsResponse> {
  const now = new Date().toISOString();
  const id = makeSubmissionId();
  const n: NpsResponse = {
    id, refId: input.refId, refType: input.refType, leadId: input.leadId, producto: input.producto,
    score: Math.max(0, Math.min(10, Math.round(input.score))),
    comentario: input.comentario?.trim() ?? "",
    quiereResena: input.score >= 9,
    createdAt: now,
  };
  await jset(`nps:byRef:${input.refId}`, n);
  await zadd("nps:index", Date.parse(now), input.refId);

  const nota = `Encuesta de satisfacción respondida: ${n.score}/10${n.comentario ? ` — "${n.comentario}"` : ""}.`;
  if (input.refType === "llamada") {
    await updateLlamada(input.refId, { note: nota }).catch(() => {});
  } else {
    await updatePresupuesto(input.refId, { note: nota }).catch(() => {});
  }
  return n;
}

/* --------------------------------- Agentes -------------------------------- */
// Cuenta propia por cada persona del equipo comercial: login, foto,
// permisos modulares y disponibilidad (días/turnos) — esta última alimenta
// los huecos que se ofrecen al cliente en el selector de fecha de llamada.

export async function createAgent(draft: AgentDraft): Promise<Agent> {
  const now = new Date().toISOString();
  const id = makeSubmissionId();
  const email = draft.email.trim().toLowerCase();
  const agent: Agent = {
    id, nombre: draft.nombre.trim(), email,
    passwordHash: draft.password ? await hashPassword(draft.password) : "",
    fotoUrl: draft.fotoUrl ?? "", rol: draft.rol ?? "agente",
    permisos: draft.permisos ?? [], disponibilidad: draft.disponibilidad ?? emptyAvailability(),
    activo: draft.activo ?? true, createdAt: now, updatedAt: now, lastLoginAt: "",
  };
  await jset(`agent:${id}`, agent);
  if (email) await jset(`idx:agentEmail:${email}`, id);
  await zadd("agents:index", Date.parse(now), id);
  return agent;
}

export async function listAgents(): Promise<Agent[]> {
  const ids = await zrangeRev("agents:index");
  const out: Agent[] = [];
  for (const id of ids) {
    const a = await jget<Agent>(`agent:${id}`);
    if (a) out.push(a);
  }
  return out;
}

export async function getAgent(id: string): Promise<Agent | null> {
  return jget<Agent>(`agent:${id}`);
}

export async function getAgentByEmail(email: string): Promise<Agent | null> {
  const id = await jget<string>(`idx:agentEmail:${email.trim().toLowerCase()}`);
  return id ? jget<Agent>(`agent:${id}`) : null;
}

export async function updateAgent(id: string, patch: Partial<AgentDraft>): Promise<Agent | null> {
  const a = await jget<Agent>(`agent:${id}`);
  if (!a) return null;
  if (patch.nombre !== undefined) a.nombre = patch.nombre.trim();
  if (patch.email !== undefined) {
    const newEmail = patch.email.trim().toLowerCase();
    if (newEmail && newEmail !== a.email) {
      await jset(`idx:agentEmail:${newEmail}`, id);
      a.email = newEmail;
    }
  }
  if (patch.fotoUrl !== undefined) a.fotoUrl = patch.fotoUrl;
  if (patch.rol !== undefined) a.rol = patch.rol;
  if (patch.permisos !== undefined) a.permisos = patch.permisos;
  if (patch.disponibilidad !== undefined) a.disponibilidad = patch.disponibilidad;
  if (patch.activo !== undefined) a.activo = patch.activo;
  if (patch.password) a.passwordHash = await hashPassword(patch.password);
  a.updatedAt = new Date().toISOString();
  await jset(`agent:${id}`, a);
  return a;
}

export async function deleteAgent(id: string): Promise<boolean> {
  const a = await jget<Agent>(`agent:${id}`);
  if (!a) return false;
  await jdel(`agent:${id}`);
  if (a.email) await jdel(`idx:agentEmail:${a.email}`);
  return true;
}

export async function touchAgentLogin(id: string): Promise<void> {
  const a = await jget<Agent>(`agent:${id}`);
  if (!a) return;
  a.lastLoginAt = new Date().toISOString();
  await jset(`agent:${id}`, a);
}

/* --------------------------- OTP 2FA para agentes --------------------------- */
// Plus3: tras validar email+contraseña, generamos un OTP de 6 dígitos, lo
// guardamos aquí con TTL 10min y single-use (se borra al verificar) y lo
// enviamos por email. Solo cuando el agente pega el código creamos la
// cookie de sesión. Blindar el 2FA es la defensa más importante contra
// credenciales filtradas — password reuse sigue siendo la principal causa
// de compromiso de cuentas admin (Verizon DBIR 2024).
export type AdminOtpRecord = {
  agentId: string;
  codeHash: string; // SHA-256 hex del código, para no guardar el código en claro
  attempts: number; // se bloquea a partir de 5 intentos
  createdAt: string;
};
const OTP_TTL_SEC = 10 * 60;

export async function saveAdminOtp(nonce: string, rec: AdminOtpRecord): Promise<void> {
  await jsetTtl(`otp:admin:${nonce}`, rec, OTP_TTL_SEC);
}
export async function getAdminOtp(nonce: string): Promise<AdminOtpRecord | null> {
  return jget<AdminOtpRecord>(`otp:admin:${nonce}`);
}
export async function bumpAdminOtpAttempts(nonce: string): Promise<void> {
  const rec = await getAdminOtp(nonce);
  if (!rec) return;
  rec.attempts += 1;
  // Se conserva el TTL restante — si Upstash pierde el TTL al re-escribir,
  // el registro caduca a los 10 min desde createdAt via la comprobación en
  // el endpoint de verificación (defensa en profundidad).
  await jsetTtl(`otp:admin:${nonce}`, rec, OTP_TTL_SEC);
}
export async function deleteAdminOtp(nonce: string): Promise<void> {
  await jdel(`otp:admin:${nonce}`);
}

/* ------------------------------ Registro de auditoría ------------------------------ */

export async function createAuditLog(entry: {
  agenteId: string; agenteNombre: string; action: AuditAction; modulo: AdminModule | "auth";
  entidad: string; entidadId: string; resumen: string;
}): Promise<AuditLog> {
  const now = new Date().toISOString();
  const id = makeSubmissionId();
  const log: AuditLog = { id, at: now, ...entry };
  await jset(`audit:${id}`, log);
  await zadd("audit:index", Date.parse(now), id);
  return log;
}

export async function listAuditLogs(filters?: { agenteId?: string; modulo?: string; limit?: number }): Promise<AuditLog[]> {
  const ids = await zrangeRev("audit:index");
  const out: AuditLog[] = [];
  for (const id of ids) {
    if (filters?.limit && out.length >= filters.limit) break;
    const l = await jget<AuditLog>(`audit:${id}`);
    if (!l) continue;
    if (filters?.agenteId && l.agenteId !== filters.agenteId) continue;
    if (filters?.modulo && l.modulo !== filters.modulo) continue;
    out.push(l);
  }
  return out;
}

/* --------------------------- Asignación de cartera --------------------------- */

export async function assignLead(leadId: string, agenteId: string, agenteNombre: string): Promise<Lead | null> {
  const lead = await jget<Lead>(`lead:${leadId}`);
  if (!lead) return null;
  const now = new Date().toISOString();
  lead.agenteAsignadoId = agenteId;
  lead.agenteAsignadoNombre = agenteNombre;
  lead.updatedAt = now;
  lead.activity.unshift({
    at: now, type: "note",
    note: agenteId ? `Asignado a ${agenteNombre}.` : "Sin asignar.",
  });
  await jset(`lead:${leadId}`, lead);
  await zadd("leads:index", Date.parse(now), leadId);
  return lead;
}

/* ------------------------------ Disponibilidad ------------------------------ */
// Huecos que se ofrecen en el selector de fecha del cliente: próximos 3 días
// laborables, por turno. Si todavía no hay ningún agente dado de alta, no se
// bloquea nada (para no romper la captación de leads antes de configurar el
// equipo) — en cuanto hay al menos un agente activo, la disponibilidad real
// (quién trabaja ese día/turno, menos lo ya reservado) empieza a mandar.

export type SlotAvailability = { fecha: string; dayKey: string; label: string; manana: boolean; tarde: boolean };

export async function getAvailability(days = 3): Promise<SlotAvailability[]> {
  const agents = (await listAgents()).filter((a) => a.activo);
  const candidates = nextBusinessDays(days);
  if (!agents.length) return candidates.map((c) => ({ ...c, manana: true, tarde: true }));

  const llamadas = await listLlamadas();
  return candidates.map((c) => {
    const capacidadManana = agents.filter((a) => a.disponibilidad[c.dayKey]?.manana).length;
    const capacidadTarde = agents.filter((a) => a.disponibilidad[c.dayKey]?.tarde).length;
    const reservadasManana = llamadas.filter((l) => l.fechaProgramada === c.fecha && l.turnoLlamada === "Mañana" && l.status !== "cancelada").length;
    const reservadasTarde = llamadas.filter((l) => l.fechaProgramada === c.fecha && l.turnoLlamada === "Tarde" && l.status !== "cancelada").length;
    return { ...c, manana: capacidadManana > reservadasManana, tarde: capacidadTarde > reservadasTarde };
  });
}
