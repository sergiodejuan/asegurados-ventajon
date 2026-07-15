import { toE164Spain } from "./phone";
import { quoteNumber } from "./quote";

// Integración con ManyChat: cuando un lead completa un tarificador o pide que
// le llamemos (y ha dado autorización de contacto), se sincroniza como
// suscriptor de WhatsApp en ManyChat con sus datos como campos personalizados
// y una etiqueta por origen — así conviven en la misma base que los leads que
// ya te llegan por Meta Ads, y puedes lanzarles la misma secuencia de
// WhatsApp o incluirlos en audiencias de Meta sin duplicar trabajo.
//
// Variables de entorno (Vercel → Environment Variables):
//   MANYCHAT_API_TOKEN — token de API del bot (ManyChat → Configuración → API).
//     Sin ella, la sincronización queda desactivada sin más (el resto del alta
//     del lead sigue funcionando con normalidad).
//   MANYCHAT_THANKYOU_FLOW_NS — (opcional) el "flow_ns" de un Flow de ManyChat
//     que envía la plantilla de WhatsApp de agradecimiento/resumen. Sin esta
//     variable, simplemente no se dispara ningún mensaje de WhatsApp (el resto
//     de la sincronización sigue funcionando igual).
//
// ⚠️ Antes de activarlo, crea en ManyChat (Configuración → Campos personalizados)
// los campos de texto: nombre, telefono, producto, email, codigo_postal,
// precio_aprox, id_presupuesto, utm_source, utm_campaign, utm_medium,
// fuente_web — la API de ManyChat no crea campos nuevos sobre la marcha,
// solo rellena los que ya existen. Usa {{nombre}} en tus plantillas/Flows
// para el nombre del
// formulario web: el first_name/last_name "de sistema" de ManyChat NO sirve
// aquí, porque solo se rellena al crear el suscriptor por primera vez — si el
// número ya existía como suscriptor (típico si venía de Meta Ads), ManyChat
// no lo actualiza, así que el nombre del tarificador se guarda siempre como
// este campo personalizado en vez de depender de eso.
//
// ⚠️ Para el mensaje de agradecimiento con el resumen: WhatsApp exige que un
// mensaje que abre conversación (el lead no te ha escrito antes) use una
// plantilla aprobada por Meta, no texto libre. Los pasos son: 1) crear en
// ManyChat una plantilla de WhatsApp con placeholders (p.ej. usando los campos
// producto/precio_aprox/codigo_postal ya sincronizados) y esperar su
// aprobación por Meta; 2) crear un Flow en ManyChat que envíe esa plantilla;
// 3) copiar el flow_ns de ese Flow y ponerlo en MANYCHAT_THANKYOU_FLOW_NS.
//
// ⚠️ Limitación conocida y confirmada de la API de ManyChat: si el número de
// WhatsApp ya existía como suscriptor antes de pasar por la web (típico si
// venía de una campaña de Meta Ads), createSubscriber devuelve un error de
// "ya existe" y no hay ningún endpoint público fiable para recuperar su id a
// partir del whatsapp_phone (es una limitación reportada en la comunidad de
// ManyChat, no un fallo de este código). En ese caso, esta sincronización
// concreta se salta con un aviso en el log — el resto del alta del lead no
// se ve afectado. Si esto ocurre a menudo, la única solución del lado de
// ManyChat es crear una Automatización con una regla "Nuevo contacto" que
// copie whatsapp_phone a un campo personalizado propio y buscar por ahí con
// /fb/subscriber/findByCustomField — pero solo cubre contactos creados desde
// que esa regla exista, no los ya existentes.

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

async function manychatGet<T>(path: string, params: Record<string, string>): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.MANYCHAT_API_TOKEN}` },
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

// Busca un suscriptor ya sincronizado antes por nuestro propio sistema (solo
// funciona si en su día se creó con el campo "phone" relleno, como hace
// createSubscriber más abajo). No sirve para encontrar contactos que ya
// existían en ManyChat por otra vía (p.ej. Meta Ads) sin haber pasado antes
// por nuestra web, porque findBySystemField solo busca por "phone"/"email",
// no por "whatsapp_phone".
async function findSubscriberByPhone(e164Phone: string): Promise<{ ok: boolean; subscriberId?: string }> {
  const result = await manychatGet<{ id?: string | number } | null>("/fb/subscriber/findBySystemField", { phone: e164Phone });
  const id = result.ok ? result.data?.id : undefined;
  if (!id) return { ok: false };
  return { ok: true, subscriberId: String(id) };
}

// Crea el suscriptor de WhatsApp a partir del teléfono. Requiere que el lead
// haya autorizado el contacto (se usa como consent_phrase, que ManyChat pide
// para crear un suscriptor solo con whatsapp_phone). Se rellena también el
// campo de sistema "phone" (además de "whatsapp_phone") para poder
// encontrarlo con findBySystemField en futuras sincronizaciones.
async function createSubscriber(toNumber: string, nombre: string): Promise<{ ok: boolean; subscriberId?: string; error?: string; alreadyExists?: boolean }> {
  const [firstName, ...rest] = (nombre || "").trim().split(/\s+/);
  const e164 = toE164Spain(toNumber);
  const result = await manychatFetch<{ id: string | number }>("/fb/subscriber/createSubscriber", {
    whatsapp_phone: e164,
    phone: e164,
    has_opt_in_sms: true, // ManyChat lo exige en cuanto se rellena "phone"
    first_name: firstName || undefined,
    last_name: rest.join(" ") || undefined,
    consent_phrase: "El usuario ha autorizado el contacto por WhatsApp al enviar un formulario en asegurados-ventajon.com.",
  });
  if (!result.ok || !result.data) {
    const alreadyExists = /already exist/i.test(result.error ?? "");
    return { ok: false, error: result.error, alreadyExists };
  }
  return { ok: true, subscriberId: String(result.data.id) };
}

// Primero busca por el campo de sistema "phone" (por si este lead ya pasó
// antes por nuestra web) y solo si no lo encuentra intenta crearlo. Si
// ManyChat responde que ya existe pero no lo habíamos encontrado por
// "phone" (típico de contactos que llegaron por Meta Ads con solo
// "whatsapp_phone" relleno), no hay forma fiable de recuperar su id por API
// — limitación documentada de ManyChat, no un fallo de este código — así
// que se registra el motivo en el log y esa sincronización concreta se
// salta, sin bloquear el alta del lead en el resto del sistema.
async function findOrCreateSubscriber(toNumber: string, nombre: string): Promise<{ ok: boolean; subscriberId?: string; error?: string }> {
  const e164 = toE164Spain(toNumber);
  const found = await findSubscriberByPhone(e164);
  if (found.ok && found.subscriberId) return { ok: true, subscriberId: found.subscriberId };

  const created = await createSubscriber(toNumber, nombre);
  if (created.ok) return created;
  if (created.alreadyExists) {
    return {
      ok: false,
      error:
        "El contacto ya existía en ManyChat (probablemente de Meta Ads, con solo whatsapp_phone relleno) y no se pudo " +
        "encontrar por el campo phone. La API de ManyChat no permite recuperar su id por whatsapp_phone directamente.",
    };
  }
  return created;
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

// Dispara el Flow de agradecimiento/resumen (plantilla de WhatsApp ya
// aprobada por Meta) sobre un suscriptor. Requiere MANYCHAT_THANKYOU_FLOW_NS.
async function triggerFlow(subscriberId: string, flowNs: string): Promise<{ ok: boolean; error?: string }> {
  const result = await manychatFetch("/fb/sending/sendFlow", { subscriber_id: subscriberId, flow_ns: flowNs });
  if (!result.ok) console.error("[manychat] triggerFlow error", result.error);
  return { ok: result.ok, error: result.error };
}

export async function syncManychatLead(opts: {
  toNumber: string;
  nombre: string;
  source: string; // p.ej. "tarificador-salud", "quiero-que-me-llamen"
  producto?: string;
  email?: string;
  codigoPostal?: string;
  precioAprox?: number | null;
  presupuestoId?: string | null;
  utm?: Record<string, string | undefined>;
}): Promise<{ ok: boolean; error?: string }> {
  if (!manychatConfigured()) return { ok: false, error: "ManyChat no configurado." };

  const created = await findOrCreateSubscriber(opts.toNumber, opts.nombre);
  if (!created.ok || !created.subscriberId) return { ok: false, error: created.error };
  const id = created.subscriberId;

  const fields: [string, string | undefined][] = [
    ["nombre", opts.nombre],
    ["telefono", toE164Spain(opts.toNumber)],
    ["producto", opts.producto],
    ["email", opts.email],
    ["codigo_postal", opts.codigoPostal],
    ["precio_aprox", opts.precioAprox != null ? String(Math.round(opts.precioAprox)) : undefined],
    ["id_presupuesto", opts.presupuestoId ? quoteNumber(opts.presupuestoId) : undefined],
    ["utm_source", opts.utm?.source],
    ["utm_campaign", opts.utm?.campaign],
    ["utm_medium", opts.utm?.medium],
    ["fuente_web", opts.source],
  ];
  for (const [name, value] of fields) {
    if (value) await setCustomField(id, name, value);
  }

  await addTag(id, `web-${opts.source}`);

  const flowNs = process.env.MANYCHAT_THANKYOU_FLOW_NS;
  if (flowNs) await triggerFlow(id, flowNs);

  return { ok: true };
}
