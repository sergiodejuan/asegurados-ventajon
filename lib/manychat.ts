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
//   MANYCHAT_VERIFICATION_FLOW_NS — (opcional) el "flow_ns" de un Flow que
//     manda el enlace de un solo uso para entrar al área de cliente (ver
//     sendManychatVerificationLink más abajo y lib/clientVerification.ts).
//     Sin esta variable, el botón "reenviar por WhatsApp" del área de
//     cliente no puede completarse (sigue funcionando por email igual).
//
// ⚠️ Antes de activarlo, crea en ManyChat (Configuración → Campos personalizados)
// los campos de texto: nombre, telefono, producto, email, codigo_postal,
// precio_aprox, id_presupuesto, servicio_adicional, utm_source, utm_campaign,
// utm_medium, fuente_web, link_verificacion — la API de ManyChat no crea campos
// nuevos sobre la marcha, solo rellena los que ya existen. Usa {{nombre}} en tus plantillas/Flows
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

// true solo si el resumen por WhatsApp post-tarificador realmente se va a
// disparar (ver syncManychatLead más abajo) — para que el correo de
// comparativa (lib/comparativaEmail.ts) solo diga "también te lo hemos
// mandado por WhatsApp" cuando eso es cierto.
export function manychatThankyouConfigured(): boolean {
  return manychatConfigured() && !!process.env.MANYCHAT_THANKYOU_FLOW_NS;
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

async function setCustomField(subscriberId: string, fieldName: string, fieldValue: string | number): Promise<void> {
  // ManyChat valida el tipo del campo: a un campo "number" hay que mandarle un
  // número JSON (no un string), o responde 400 "Value for number custom field
  // should be integer or float". Por eso field_value acepta string | number y
  // los campos numéricos (telefono, codigo_postal, precio_aprox) se envían ya
  // como número desde syncManychatLead.
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

// Envía un mensaje de texto libre por WhatsApp a un suscriptor ya existente
// (o lo crea si hace falta) usando el endpoint sendContent de ManyChat —
// para el botón "Enviar por ManyChat" del seguimiento de presupuestos en
// admin. ⚠️ Igual que cualquier envío directo de WhatsApp Business, solo
// funciona dentro de la ventana de 24h desde el último mensaje del cliente:
// fuera de esa ventana, WhatsApp exige una plantilla aprobada por Meta (ver
// triggerFlow más arriba) y esta llamada devolverá el error que ManyChat
// reporte tal cual, para poder verlo en el admin — en ese caso, usa el
// botón "Abrir en WhatsApp" como alternativa manual.
async function sendContent(subscriberId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const result = await manychatFetch("/fb/sending/sendContent", {
    subscriber_id: subscriberId,
    data: { version: "v2", content: { messages: [{ type: "text", text }] } },
  });
  return { ok: result.ok, error: result.error };
}

export async function sendManychatWhatsAppText(toNumber: string, nombre: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!manychatConfigured()) return { ok: false, error: "ManyChat no configurado (falta MANYCHAT_API_TOKEN)." };
  const subscriber = await findOrCreateSubscriber(toNumber, nombre);
  if (!subscriber.ok || !subscriber.subscriberId) return { ok: false, error: subscriber.error || "No se pudo localizar al suscriptor en ManyChat." };
  return sendContent(subscriber.subscriberId, text);
}

// Enlace de un solo uso para entrar al área de cliente (ver lib/
// clientVerification.ts), mandado por WhatsApp como alternativa al email
// cuando el cliente lo pide expresamente. Igual que el mensaje de
// agradecimiento: al ser (probablemente) fuera de la ventana de 24h desde
// su último mensaje, no vale texto libre — hace falta una plantilla
// aprobada por Meta, disparada como Flow. Configuración necesaria en
// ManyChat antes de que esto funcione:
//   1. Campo personalizado de texto "link_verificacion".
//   2. Plantilla de WhatsApp con el placeholder de ese campo, aprobada por Meta.
//   3. Un Flow que envíe esa plantilla; copia su flow_ns en MANYCHAT_VERIFICATION_FLOW_NS.
// Sin MANYCHAT_VERIFICATION_FLOW_NS (o sin MANYCHAT_API_TOKEN), no-op: el
// botón de "reenviar por WhatsApp" del área de cliente mostrará que no se
// pudo enviar, sin afectar al resto de la sincronización con ManyChat.
export async function sendManychatVerificationLink(toNumber: string, nombre: string, link: string): Promise<{ ok: boolean; error?: string }> {
  if (!manychatConfigured()) return { ok: false, error: "ManyChat no configurado (falta MANYCHAT_API_TOKEN)." };
  const flowNs = process.env.MANYCHAT_VERIFICATION_FLOW_NS;
  if (!flowNs) return { ok: false, error: "Falta configurar MANYCHAT_VERIFICATION_FLOW_NS." };
  const subscriber = await findOrCreateSubscriber(toNumber, nombre);
  if (!subscriber.ok || !subscriber.subscriberId) return { ok: false, error: subscriber.error || "No se pudo localizar al suscriptor en ManyChat." };
  await setCustomField(subscriber.subscriberId, "link_verificacion", link);
  return triggerFlow(subscriber.subscriberId, flowNs);
}

export async function syncManychatLead(opts: {
  toNumber: string;
  nombre: string;
  source: string; // p.ej. "tarificador-salud", "quiero-que-me-llamen"
  producto?: string;
  email?: string;
  codigoPostal?: string; // etiqueta de zona (p.ej. "Islas Canarias") — NO es el CP
  codigoPostalReal?: string; // CP real de 5 dígitos, el que va al campo numérico
  precioAprox?: number | null;
  presupuestoId?: string | null;
  servicioAdicional?: string;
  utm?: Record<string, string | undefined>;
}): Promise<{ ok: boolean; error?: string }> {
  if (!manychatConfigured()) return { ok: false, error: "ManyChat no configurado." };

  const created = await findOrCreateSubscriber(opts.toNumber, opts.nombre);
  if (!created.ok || !created.subscriberId) return { ok: false, error: created.error };
  const id = created.subscriberId;

  // Campos numéricos de ManyChat (telefono, codigo_postal, precio_aprox) van
  // como número. El teléfono se manda en 9 dígitos españoles (sin +34, que no
  // es entero); el CP real de 5 dígitos (no la etiqueta de zona). Aviso: un CP
  // con cero inicial (Baleares 07xxx) pierde el cero al ser numérico — si
  // necesitas el CP exacto, cambia ese campo a "Texto" en ManyChat.
  const telDigits = toE164Spain(opts.toNumber).replace(/\D/g, "").replace(/^34/, "");
  const telefonoNum = /^[0-9]{9}$/.test(telDigits) ? Number(telDigits) : undefined;
  const cpNum = opts.codigoPostalReal && /^[0-9]{5}$/.test(opts.codigoPostalReal) ? Number(opts.codigoPostalReal) : undefined;
  const fields: [string, string | number | undefined][] = [
    ["nombre", opts.nombre],
    ["telefono", telefonoNum],
    ["producto", opts.producto],
    ["email", opts.email],
    ["codigo_postal", cpNum],
    ["precio_aprox", opts.precioAprox != null ? Math.round(opts.precioAprox) : undefined],
    ["id_presupuesto", opts.presupuestoId ? quoteNumber(opts.presupuestoId) : undefined],
    ["servicio_adicional", opts.servicioAdicional],
    ["utm_source", opts.utm?.source],
    ["utm_campaign", opts.utm?.campaign],
    ["utm_medium", opts.utm?.medium],
    ["fuente_web", opts.source],
  ];
  if (opts.precioAprox == null) {
    // No es un fallo de esta integración: significa que estimatePrecio() no
    // encontró ningún producto activo con precio para ese producto en el
    // catálogo (/admin/productos) en el momento de crear el presupuesto.
    console.error(`[manychat] precio_aprox no disponible para source=${opts.source} — revisa que haya un producto activo con precio en /admin/productos.`);
  }
  for (const [name, value] of fields) {
    if (value !== undefined && value !== "") await setCustomField(id, name, value);
  }

  await addTag(id, `web-${opts.source}`);

  const flowNs = process.env.MANYCHAT_THANKYOU_FLOW_NS;
  if (flowNs) await triggerFlow(id, flowNs);

  return { ok: true };
}
