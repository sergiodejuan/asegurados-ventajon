import { normalizePhone } from "./schema";
import { SOURCE_LABELS, type ConsentRecord, type Lead, type LeadDraft, type Status } from "./crm";

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

/* -------------------------------- Upsert ---------------------------------- */

function fillEmpty(lead: Lead, draft: LeadDraft) {
  const keys: (keyof LeadDraft)[] = [
    "nombre", "email", "codigoPostal", "inicio", "numAsegurados", "coberturaDental",
    "motivo", "fumador", "fechaNacimiento", "sexo", "producto",
    "seguroActualImporte", "seguroActualPeriodo",
  ];
  for (const k of keys) {
    const dv = draft[k];
    const lv = (lead as Record<string, unknown>)[k];
    const empty = lv === "" || lv === null || lv === undefined;
    if (empty && dv !== undefined && dv !== "" && dv !== null) {
      (lead as Record<string, unknown>)[k] = dv as unknown;
    }
  }
  // Servicios (array): si el nuevo trae datos y la ficha estaba vacía, se completa.
  if (draft.seguroActualServicios?.length && !lead.seguroActualServicios?.length) {
    lead.seguroActualServicios = draft.seguroActualServicios;
  }
  if (draft.aceptaPrivacidad) lead.aceptaPrivacidad = true;
  if (draft.autorizaContacto) lead.autorizaContacto = true;
  if (draft.aceptaComercial) lead.aceptaComercial = true;
  if (draft.utm && Object.keys(draft.utm).length && !Object.keys(lead.utm).length) {
    lead.utm = draft.utm as Record<string, string | undefined>;
  }
}

export async function upsertLead(
  draft: LeadDraft,
  source: string,
  consent?: ConsentRecord
): Promise<{ id: string; deduped: boolean }> {
  const phone = draft.telefono ? normalizePhone(draft.telefono) : "";
  const email = draft.email ? draft.email.trim().toLowerCase() : "";
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
      lead.updatedAt = now;
      if (!lead.sources.includes(source)) lead.sources.push(source);
      if (consent) lead.consents = [consent, ...(lead.consents ?? [])];
      lead.activity.unshift({
        at: now, type: "form",
        note: `Nueva solicitud desde ${srcLabel}${draft.producto ? ` · ${draft.producto}` : ""}`,
        meta: { source },
      });
      await jset(`lead:${id}`, lead);
      if (phone) await jset(`idx:phone:${phone}`, id);
      if (email) await jset(`idx:email:${email}`, id);
      await zadd("leads:index", score, id);
      await zadd(`leads:source:${source}`, score, id);
      return { id, deduped: true };
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
    nombre: draft.nombre ?? "", telefono: phone, email, codigoPostal: draft.codigoPostal ?? "",
    inicio: draft.inicio ?? "", numAsegurados: draft.numAsegurados ?? null, coberturaDental: draft.coberturaDental ?? null,
    motivo: draft.motivo ?? "", fumador: draft.fumador ?? null,
    fechaNacimiento: draft.fechaNacimiento ?? "", sexo: draft.sexo ?? "",
    yaTieneSeguro: draft.yaTieneSeguro ?? null,
    seguroActualImporte: draft.seguroActualImporte ?? null,
    seguroActualPeriodo: draft.seguroActualPeriodo ?? "",
    seguroActualServicios: draft.seguroActualServicios ?? [],
    aceptaPrivacidad: !!draft.aceptaPrivacidad, autorizaContacto: !!draft.autorizaContacto, aceptaComercial: !!draft.aceptaComercial,
    consents: consent ? [consent] : [],
    utm: (draft.utm as Record<string, string | undefined>) ?? {},
    activity: [{ at: now, type: "alta", note: `Alta desde ${srcLabel}${draft.producto ? ` · ${draft.producto}` : ""}`, meta: { source } }],
  };

  await jset(`lead:${newId}`, lead);
  if (phone) await jset(`idx:phone:${phone}`, newId);
  if (email) await jset(`idx:email:${email}`, newId);
  await zadd("leads:index", score, newId);
  await zadd(`leads:source:${source}`, score, newId);
  return { id: newId, deduped: false };
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

export async function updateLead(
  id: string,
  patch: { status?: Status; nextStep?: string; note?: string }
): Promise<Lead | null> {
  const lead = await jget<Lead>(`lead:${id}`);
  if (!lead) return null;
  const now = new Date().toISOString();
  if (patch.status && patch.status !== lead.status) {
    lead.activity.unshift({ at: now, type: "status", note: `Estado → ${patch.status}` });
    lead.status = patch.status;
  }
  if (typeof patch.nextStep === "string" && patch.nextStep !== lead.nextStep) {
    lead.nextStep = patch.nextStep;
    lead.activity.unshift({ at: now, type: "nextstep", note: `Próximo paso: ${patch.nextStep || "—"}` });
  }
  if (patch.note && patch.note.trim()) {
    lead.activity.unshift({ at: now, type: "note", note: patch.note.trim() });
  }
  lead.updatedAt = now;
  await jset(`lead:${id}`, lead);
  await zadd("leads:index", Date.parse(now), id);
  return lead;
}
