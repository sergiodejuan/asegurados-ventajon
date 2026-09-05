import { NextResponse } from "next/server";
import { manychatAuthFail } from "@/lib/manychatAuth";
import { rateLimitFail } from "@/lib/rateLimit";
import { upsertLead, getLead, setLeadCodeoscopicInsuranceId } from "@/lib/store";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { buildHealthPayload } from "@/lib/codeoscopicMap";
import { summarizeInsurance } from "@/lib/codeoscopicSnapshot";
import type { CodeoscopicQuoteSummary } from "@/lib/store";
import type { LeadDraft } from "@/lib/crm";
import { createQuoteAccessToken } from "@/lib/quoteTokens";
import { SITE_URL } from "@/lib/brand";

// Construye el link firmado a /comparativa que el flow envía por WhatsApp.
// El token cifra el leadId; la comparativa lo intercambia por el `quote`
// hidratado — el usuario NO vuelve a introducir sus datos.
function buildComparativaUrl(leadId: string): string {
  if (!leadId) return "";
  try {
    const token = createQuoteAccessToken(leadId);
    const base = SITE_URL.replace(/\/+$/, "");
    return `${base}/comparativa?producto=salud&token=${encodeURIComponent(token)}`;
  } catch (err) {
    // Sin QUOTE_TOKEN_SECRET en prod: no devolvemos URL — el asesor
    // toma el relevo. Nunca respondemos con un link sin firmar.
    console.error("[manychat/salud-quote] no se pudo firmar token:", (err as Error).message);
    return "";
  }
}

export const runtime = "nodejs";
// Codeoscopic tarda entre 5 y 40 segundos en devolver las primeras ofertas
// firmes. Damos hasta 55s para responder algo útil por WhatsApp; si no
// llega ninguna oferta a tiempo, respondemos con el mensaje "seguimos
// calculando" y el asesor cierra en el siguiente paso.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// POST /api/manychat/salud-quote
//
// El paso "External Request" de un flow de ManyChat llama aquí con los
// datos que el usuario ha ido dejando por WhatsApp. La respuesta trae:
//   - `mensaje`: texto ya listo para pintar en el siguiente Send Message.
//   - `precio`, `compania`, `producto`: campos personalizados para
//     usarlos como merge tags.
//   - `leadId`, `insuranceId`: para trazabilidad y follow-up del asesor.
//
// El endpoint TAMBIÉN da de alta el lead con `source="manychat"` para que
// aparezca en el CRM aunque el usuario abandone la conversación.
//
// Autenticación: header `x-manychat-secret` (MANYCHAT_WEBHOOK_SECRET).

// ManyChat interpola los merge tags como texto crudo dentro del JSON —
// si un Custom Field está vacío, se convierte en "" (cuando el tag va
// entre comillas) o en nada (si no lleva comillas, y ahí rompe el JSON).
// Por eso aceptamos aquí strings, numbers y booleans en los tres campos
// tipados y los coercionamos abajo. `unknown` para no tener que pelear
// contra el sistema de tipos en cada caso.
type Body = {
  telefono?: string;
  nombre?: string;
  apellido1?: string;
  apellido2?: string;
  email?: string;
  fechaNacimiento?: string; // dd/mm/aaaa o yyyy-mm-dd
  sexo?: string;            // "hombre" | "mujer"
  documento?: string;
  documentoTipo?: string;   // "DNI" | "NIE" | "PASSPORT"
  codigoPostal?: string;
  numAsegurados?: unknown;    // number | "1".."9" | "" | null
  coberturaDental?: unknown;  // boolean | "true"/"false"/"sí"/"no"/"" | null
  fumador?: unknown;          // idem
  aceptaPrivacidad?: unknown; // idem
};

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// "true"/"false", "1"/"0", "sí"/"no", "yes"/"no", "" → null.
function coerceBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (!s) return null;
    if (["true", "1", "sí", "si", "yes", "y"].includes(s)) return true;
    if (["false", "0", "no", "n"].includes(s)) return false;
  }
  return null;
}

// Respuesta pensada para ManyChat: solo campos escalares y un mensaje ya
// formateado. Los arrays de ManyChat son incómodos de iterar en su UI.
type ResponseShape = {
  ok: boolean;
  mensaje: string;
  leadId: string;
  insuranceId: string;
  quoteId: string;       // id de la cotización ganadora, para /coverages
  estado: "cotizado" | "calculando" | "faltan_datos" | "error";
  compania: string;
  producto: string;
  precio: number | null; // €/mes
  precioTexto: string;   // "23,45€/mes" o "" si no hay
  // URL firmada que puede enviarse por WhatsApp para abrir la comparativa
  // completa con los datos ya precargados (sin volver a pedir al usuario).
  // TTL 30 días. Sólo se rellena cuando hay `leadId`.
  urlComparativa: string;
  error?: string;
};

function fmtEUR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return `${n.toFixed(2).replace(".", ",")}€/mes`;
}

// De todas las ofertas del snapshot, quédate con la más barata firme
// (`estimate=false, premium>0`). Si no hay firmes, cae a la estimada más
// barata; si ni eso, devuelve null.
function pickBestQuote(quotes: CodeoscopicQuoteSummary[]): CodeoscopicQuoteSummary | null {
  const firm = quotes.filter((q) => !q.estimate && typeof q.premium === "number" && q.premium! > 0);
  const bucket = firm.length ? firm : quotes.filter((q) => typeof q.premium === "number" && q.premium! > 0);
  if (!bucket.length) return null;
  return [...bucket].sort((a, b) => (a.premium ?? Infinity) - (b.premium ?? Infinity))[0];
}

// Espera hasta `deadlineMs` a que Codeoscopic tenga al menos una oferta
// con precio. Poll cada 2s con `getInsurance` — barato, la sesión Redis
// del helper Codeoscopic se cachea entre llamadas.
async function waitForFirstQuote(insuranceId: string, deadlineMs: number): Promise<CodeoscopicQuoteSummary | null> {
  while (Date.now() < deadlineMs) {
    try {
      const snap = await codeoscopicFetch<CodeoscopicInsurance>(`/insurances/${encodeURIComponent(insuranceId)}`);
      const best = pickBestQuote(summarizeInsurance(snap).quotes);
      if (best) return best;
    } catch (err) {
      console.error("[manychat/salud-quote] poll fallo:", (err as Error).message);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

function respond(payload: ResponseShape, status = 200) {
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  const denied = manychatAuthFail(request);
  if (denied) return denied;

  // Anti-abuso: 20 tarifas/hora por IP (ManyChat siempre viene desde su
  // rango, así que en la práctica limita la orquestación entera).
  const rl = await rateLimitFail(request, { bucket: "manychat-salud-quote", limit: 20, windowSeconds: 3600 });
  if (rl) return rl;

  let body: Body;
  try { body = await request.json(); }
  catch {
    return respond({
      ok: false, estado: "error", error: "Cuerpo no válido.",
      mensaje: "Ups, no me ha llegado bien la información. Escríbeme otra vez, por favor.",
      leadId: "", insuranceId: "", compania: "", producto: "", precio: null, precioTexto: "", quoteId: "", urlComparativa: "",
    }, 400);
  }

  const telefono = (body.telefono ?? "").trim();
  if (!telefono) {
    return respond({
      ok: false, estado: "faltan_datos", error: "Falta el teléfono.",
      mensaje: "Necesito tu teléfono para poder enviarte la tarifa.",
      leadId: "", insuranceId: "", compania: "", producto: "", precio: null, precioTexto: "", quoteId: "", urlComparativa: "",
    }, 400);
  }

  // Damos de alta el lead siempre — así aunque falte algún dato para tarifar
  // el asesor tiene la ficha y puede llamar después. `source="manychat"`.
  const draft: LeadDraft = {
    producto: "salud",
    nombre: body.nombre?.trim() ?? "",
    apellido1: body.apellido1?.trim() ?? "",
    apellido2: body.apellido2?.trim() ?? "",
    telefono,
    email: body.email?.trim() ?? "",
    fechaNacimiento: body.fechaNacimiento?.trim() ?? "",
    sexo: body.sexo?.trim() ?? "",
    documento: body.documento?.trim() ?? "",
    documentoTipo: body.documentoTipo?.trim() ?? "",
    codigoPostal: body.codigoPostal?.trim() ?? "",
    codigoPostalReal: body.codigoPostal?.trim() ?? "",
    numAsegurados: coerceNumber(body.numAsegurados),
    coberturaDental: coerceBoolean(body.coberturaDental),
    fumador: coerceBoolean(body.fumador),
    aceptaPrivacidad: coerceBoolean(body.aceptaPrivacidad) === true,
    autorizaContacto: true, // llegó por WhatsApp opt-in, ya consintió el canal.
    utm: { source: "manychat" },
  };

  const upserted = await upsertLead(draft, "manychat");
  const lead = await getLead(upserted.id);
  if (!lead) {
    return respond({
      ok: false, estado: "error", error: "No se pudo crear el lead.",
      mensaje: "Uy, ha habido un problema técnico. Un asesor te contactará enseguida.",
      leadId: "", insuranceId: "", compania: "", producto: "", precio: null, precioTexto: "", quoteId: "", urlComparativa: "",
    }, 500);
  }

  // Sin Codeoscopic no hay tarifa real; devolvemos mensaje neutro y dejamos
  // el lead para que el asesor cierre.
  if (!codeoscopicConfigured()) {
    return respond({
      ok: true, estado: "calculando", leadId: lead.id, insuranceId: "",
      compania: "", producto: "", precio: null, precioTexto: "", quoteId: "", urlComparativa: buildComparativaUrl(lead.id),
      mensaje: "Perfecto, ya tengo tus datos. Un asesor te enviará la tarifa personalizada en unos minutos.",
    });
  }

  const mapped = await buildHealthPayload(lead, null);
  if (!mapped.ok) {
    return respond({
      ok: true, estado: "faltan_datos", error: mapped.reason,
      leadId: lead.id, insuranceId: "",
      compania: "", producto: "", precio: null, precioTexto: "", quoteId: "", urlComparativa: buildComparativaUrl(lead.id),
      mensaje: `Para darte el precio exacto todavía necesito un dato: ${mapped.reason} ¿Me lo puedes dar?`,
    });
  }

  // Reutiliza el insurance si ya existía (mismo usuario re-consultando).
  let insuranceId = lead.codeoscopicInsuranceId || "";
  if (!insuranceId) {
    try {
      const created = await codeoscopicFetch<CodeoscopicInsurance>("/insurances", {
        method: "POST", body: mapped.payload,
      });
      if (!created?.id) throw new CodeoscopicError(502, "Codeoscopic no devolvió un id.");
      insuranceId = created.id;
      await setLeadCodeoscopicInsuranceId(lead.id, insuranceId);

      // A veces el POST ya devuelve alguna oferta firme — usarla ahorra el
      // primer poll y respondemos más rápido a WhatsApp.
      const inline = pickBestQuote(summarizeInsurance(created).quotes);
      if (inline) return respond(buildQuoteResponse(lead.id, insuranceId, inline));
    } catch (err) {
      console.error("[manychat/salud-quote] POST /insurances falló:", (err as Error).message);
      return respond({
        ok: true, estado: "calculando", leadId: lead.id, insuranceId: "",
        compania: "", producto: "", precio: null, precioTexto: "", quoteId: "", urlComparativa: buildComparativaUrl(lead.id),
        mensaje: "Estoy calculando tu tarifa. Un asesor te la enviará en breve.",
      });
    }
  }

  // Deadline: dejamos 8s de margen sobre maxDuration para que la respuesta
  // salga a tiempo aunque el último poll haya empezado.
  const deadline = Date.now() + 48_000;
  const best = await waitForFirstQuote(insuranceId, deadline);
  if (best) return respond(buildQuoteResponse(lead.id, insuranceId, best));

  // Timeout sin ofertas: respondemos calculando y el follow-up humano se
  // encarga (el snapshot queda cacheado en Codeoscopic, no se pierde).
  return respond({
    ok: true, estado: "calculando", leadId: lead.id, insuranceId,
    compania: "", producto: "", precio: null, precioTexto: "", quoteId: "", urlComparativa: buildComparativaUrl(lead.id),
    mensaje: "Estoy calculando tus tarifas. En un par de minutos te envío las mejores opciones por aquí mismo.",
  });
}

function buildQuoteResponse(leadId: string, insuranceId: string, best: CodeoscopicQuoteSummary): ResponseShape {
  const precio = typeof best.premium === "number" ? best.premium : null;
  const precioTexto = fmtEUR(precio);
  const compania = best.compania || "";
  const producto = best.producto || "";
  const mensaje = precio != null
    ? `Tu mejor tarifa ahora mismo:\n\n• ${compania}${producto ? ` — ${producto}` : ""}\n• Desde ${precioTexto}\n\n¿Quieres que un asesor te cierre la póliza con esta compañía?`
    : `Tenemos oferta de ${compania}${producto ? ` (${producto})` : ""} pero necesito confirmar el precio. Un asesor te lo envía enseguida.`;
  const urlComparativa = buildComparativaUrl(leadId);
  const mensajeConLink = urlComparativa
    ? `${mensaje}\n\n🔗 Ver todas las opciones y coberturas: ${urlComparativa}`
    : mensaje;
  return {
    ok: true, estado: "cotizado", leadId, insuranceId,
    compania, producto, precio, precioTexto, mensaje: mensajeConLink,
    quoteId: String(best.id ?? ""),
    urlComparativa,
  };
}
