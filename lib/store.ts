import { normalizePhone } from "./schema";
import {
  SOURCE_LABELS, type ConsentRecord, type Lead, type LeadDraft, type LeadSubmission, type Status,
  type Presupuesto, type PresupuestoStatus, type PresupuestoNote, type PresupuestoEleccion,
  type Task, type TaskDraft,
} from "./crm";
import { DEFAULT_PRODUCTS, sortProducts, type Product, type ProductDraft } from "./catalog";
import { DEFAULT_POSTS, type Post, type PostDraft } from "./posts";
import { DEFAULT_CAMPAIGN_CONFIG, type CampaignConfig } from "./campaign";
import { saludPrice, vidaPrice, autoPrice, quoteNumber } from "./quote";
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

/* -------------------------------- Upsert ---------------------------------- */

function fillEmpty(lead: Lead, draft: LeadDraft) {
  const keys: (keyof LeadDraft)[] = [
    "nombre", "email", "codigoPostal", "inicio", "numAsegurados", "coberturaDental",
    "motivo", "fumador", "fechaNacimiento", "sexo", "producto",
    "tipoVehiculo", "matricula", "marcaVehiculo", "modeloVehiculo", "anioVehiculo",
    "usoVehiculo", "antiguedadCarnet", "coberturaDeseada",
    "seguroActualImporte", "seguroActualPeriodo", "diaLlamada", "turnoLlamada",
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
): Promise<{ id: string; deduped: boolean; submissionId: string }> {
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
    nombre: draft.nombre ?? "", telefono: phone, email, codigoPostal: draft.codigoPostal ?? "",
    inicio: draft.inicio ?? "", numAsegurados: draft.numAsegurados ?? null, coberturaDental: draft.coberturaDental ?? null,
    motivo: draft.motivo ?? "", fumador: draft.fumador ?? null,
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
    aceptaPrivacidad: !!draft.aceptaPrivacidad, autorizaContacto: !!draft.autorizaContacto, aceptaComercial: !!draft.aceptaComercial,
    consents: consent ? [consent] : [],
    utm: (draft.utm as Record<string, string | undefined>) ?? {},
    activity: [{ at: now, type: "alta", note: `Alta desde ${srcLabel}${draft.producto ? ` · ${draft.producto}` : ""}`, meta: { source } }],
    submissions: [],
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
  lookup: { telefono?: string; email?: string },
  patch: { nombre?: string; telefono?: string; email?: string; diaLlamada?: string; turnoLlamada?: string }
): Promise<Lead | null> {
  const lookupPhone = lookup.telefono ? normalizePhone(lookup.telefono) : "";
  const lookupEmail = lookup.email ? lookup.email.trim().toLowerCase() : "";

  let id: string | null = null;
  if (lookupPhone) id = await jget<string>(`idx:phone:${lookupPhone}`);
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
      await jset(`idx:phone:${newPhone}`, id);
      lead.telefono = newPhone;
      changes.push("teléfono");
    }
  }
  if (patch.email !== undefined) {
    const newEmail = patch.email.trim().toLowerCase();
    if (newEmail && newEmail !== lead.email) {
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

export async function anonymizeLead(id: string, agente?: string): Promise<Lead | null> {
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
  lead.anonymizedAt = now;
  lead.updatedAt = now;
  lead.activity.unshift({
    at: now, type: "rgpd",
    note: "Datos personales anonimizados a petición del interesado (derecho de supresión, RGPD).",
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

/* ---------------------------- Catálogo (productos) ------------------------- */
// Ofertas por compañía × producto que alimentan la página de comparativa.
// Se guardan como un único documento JSON (catálogo pequeño, no necesita índice).

const PRODUCTS_KEY = "products:all";

async function readProducts(): Promise<Product[]> {
  const stored = await jget<Product[]>(PRODUCTS_KEY);
  if (!stored || !stored.length) {
    await jset(PRODUCTS_KEY, DEFAULT_PRODUCTS);
    return DEFAULT_PRODUCTS;
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
    await jset(POSTS_KEY, DEFAULT_POSTS);
    return DEFAULT_POSTS;
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
  if (producto !== "salud" && producto !== "vida" && producto !== "auto") return null;
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
  const presupuesto: Presupuesto = {
    id, leadId: input.leadId, createdAt: now, updatedAt: now, closedAt: "",
    source: "admin-manual", producto: input.producto, status: "enviado",
    data: { codigoPostal: lead.codigoPostal }, precioAprox: input.precio, notas: [], eleccion, closedBy: "",
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

// Área de cliente sin registro: localiza los presupuestos de un lead a
// partir de su número de presupuesto (código corto, único), su correo y su
// teléfono — los tres deben coincidir con el presupuesto de ese código. Si
// coincide, devuelve TODOS los presupuestos de ese lead (no solo el que dio
// el código), para que un cliente con varios tarificadores los vea todos
// entrando con cualquiera de sus números. Sin correspondencia exacta,
// devuelve null (mensaje de error genérico, sin filtrar qué dato falló).
export async function findClientPresupuestos(input: {
  codigo: string; email: string; telefono: string;
}): Promise<Presupuesto[] | null> {
  const code = input.codigo.trim().toUpperCase();
  if (!code) return null;
  const match = await getPresupuestoByCode(code);
  if (!match) return null;
  const email = input.email.trim().toLowerCase();
  const telefono = normalizePhone(input.telefono);
  if (match.email.trim().toLowerCase() !== email || normalizePhone(match.telefono) !== telefono) return null;
  return listPresupuestosByLead(match.leadId);
}

export async function updatePresupuesto(
  id: string,
  patch: { status?: PresupuestoStatus; note?: string; agente?: string }
): Promise<Presupuesto | null> {
  const p = await jget<Presupuesto>(`presupuesto:${id}`);
  if (!p) return null;
  const now = new Date().toISOString();
  const agente = patch.agente?.trim() || "";
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
  return p;
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
