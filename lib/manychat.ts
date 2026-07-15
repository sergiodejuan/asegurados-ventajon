import { toE164Spain } from "./phone";

// Integración con ManyChat: cuando un lead completa un tarificador o pide que
// le llamemos (y ha dado autorización de contacto), se sincroniza como
// suscriptor de WhatsApp en ManyChat con sus datos como campos personalizados
// y una etiqueta por origen — así conviven en la misma base que los leads que
// ya te llegan por Meta Ads, y puedes lanzarles la misma secuencia de
// WhatsApp o incluirlos en audiencias de Meta sin duplicar trabajo.
//
// Variable de entorno necesaria (Vercel → Environment Variables):
//   MANYCHAT_API_TOKEN — token de API del bot (ManyChat → Configuración → API).
// Sin ella, la sincronización queda desactivada sin más (el resto del alta
// del lead sigue funcionando con normalidad).
//
// ⚠️ Antes de activarlo, crea en ManyChat (Configuración → Campos personalizados)
// los campos de texto: producto, email, codigo_postal, precio_aprox,
// utm_source, utm_campaign, utm_medium, fuente_web — la API de ManyChat no
// crea campos nuevos sobre la marcha, solo rellena los que ya existen.
// Verifica también los nombres exactos de los endpoints contra la documentación
// vigente en api.manychat.com antes de dar por hecho que coinciden con los de
// aquí: la API de ManyChat ha ido cambiando de superficie con el tiempo.

const API_BASE = "https://api.manychat.com";

export function manychatConfigured(): boolean {
  return !!process.env.MANYCHAT_API_TOKEN;
}

async function manychatFetch<T>(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MANYCHAT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `ManyChat ${path} ${res.status}: ${text.slice(0, 300)}` };
    }
    const json = (await res.json().catch(() => null)) as { data?: T } | null;
    return { ok: true, data: json?.data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de conexión con ManyChat." };
  }
}

// Crea (o recupera, si ya existía) el suscriptor de WhatsApp a partir del
// teléfono. Requiere que el lead haya autorizado el contacto.
async function findOrCreateSubscriber(toNumber: string, nombre: string): Promise<{ ok: boolean; subscriberId?: string; error?: string }> {
  const [firstName, ...rest] = (nombre || "").trim().split(/\s+/);
  const result = await manychatFetch<{ id: string | number }>("/whatsapp/subscriber/createSubscriber", {
    whatsapp_phone: toE164Spain(toNumber),
    first_name: firstName || undefined,
    last_name: rest.join(" ") || undefined,
  });
  if (!result.ok || !result.data) return { ok: false, error: result.error };
  return { ok: true, subscriberId: String(result.data.id) };
}

async function setCustomField(subscriberId: string, fieldName: string, fieldValue: string): Promise<void> {
  const result = await manychatFetch("/fb/subscriber/setCustomFieldByName", {
    subscriber_id: subscriberId,
    field_name: fieldName,
    field_value: fieldValue,
  });
  if (!result.ok) console.error(`[manychat] setCustomField(${fieldName}) error`, result.error);
}

async function addTag(subscriberId: string, tagName: string): Promise<void> {
  const result = await manychatFetch("/fb/subscriber/addTagByName", { subscriber_id: subscriberId, tag_name: tagName });
  if (!result.ok) console.error(`[manychat] addTag(${tagName}) error`, result.error);
}

export async function syncManychatLead(opts: {
  toNumber: string;
  nombre: string;
  source: string; // p.ej. "tarificador-salud", "quiero-que-me-llamen"
  producto?: string;
  email?: string;
  codigoPostal?: string;
  precioAprox?: number | null;
  utm?: Record<string, string | undefined>;
}): Promise<{ ok: boolean; error?: string }> {
  if (!manychatConfigured()) return { ok: false, error: "ManyChat no configurado." };

  const created = await findOrCreateSubscriber(opts.toNumber, opts.nombre);
  if (!created.ok || !created.subscriberId) return { ok: false, error: created.error };
  const id = created.subscriberId;

  const fields: [string, string | undefined][] = [
    ["producto", opts.producto],
    ["email", opts.email],
    ["codigo_postal", opts.codigoPostal],
    ["precio_aprox", opts.precioAprox != null ? String(Math.round(opts.precioAprox)) : undefined],
    ["utm_source", opts.utm?.source],
    ["utm_campaign", opts.utm?.campaign],
    ["utm_medium", opts.utm?.medium],
    ["fuente_web", opts.source],
  ];
  for (const [name, value] of fields) {
    if (value) await setCustomField(id, name, value);
  }

  await addTag(id, `web-${opts.source}`);

  return { ok: true };
}
