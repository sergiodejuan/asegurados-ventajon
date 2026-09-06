import { NextResponse } from "next/server";
import { manychatAuthFail } from "@/lib/manychatAuth";
import { rateLimitFail } from "@/lib/rateLimit";
import { upsertLead, getLead, setLeadCodeoscopicInsuranceId } from "@/lib/store";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { buildHealthPayload } from "@/lib/codeoscopicMap";
import type { LeadDraft } from "@/lib/crm";
import {
  MANYCHAT_SYNC_BUDGET_MS,
  waitForBestQuote,
  buildQuoteResponse,
  buildComparativaUrl,
  type ResponseShape,
} from "@/lib/manychatSaludQuote";

export const runtime = "nodejs";
// La respuesta síncrona debe salir por debajo de los ~10s en que ManyChat
// corta la External Request (ver MANYCHAT_SYNC_BUDGET_MS). La lambda vive un
// poco más por si acaso, pero nunca esperamos a agotar este maxDuration para
// responder: lo que no llegue a tiempo lo cierra el follow-up humano.
export const maxDuration = 30;
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

function respond(payload: ResponseShape, status = 200) {
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  const requestStarted = Date.now();
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
      // Antes había un atajo aquí: si el POST /insurances ya traía alguna
      // oferta inline, respondíamos con ella. Ese atajo sesgaba SIEMPRE
      // a la aseguradora que Codeoscopic devolvía primera (Generali),
      // ignorando las demás que llegan a los pocos segundos. Ahora
      // dejamos que waitForBestQuote() decida — espera un mínimo de
      // ~18 s para dar tiempo a que respondan varias compañías y elige
      // la más barata entre todas.
    } catch (err) {
      console.error("[manychat/salud-quote] POST /insurances falló:", (err as Error).message);
      return respond({
        ok: true, estado: "calculando", leadId: lead.id, insuranceId: "",
        compania: "", producto: "", precio: null, precioTexto: "", quoteId: "", urlComparativa: buildComparativaUrl(lead.id),
        mensaje: "Estoy calculando tu tarifa. Un asesor te la enviará en breve.",
      });
    }
  }

  // Deadline síncrono: respondemos dentro del presupuesto de ManyChat (~10s).
  // Lo medimos desde que ENTRÓ la petición (no desde aquí) para que el tiempo
  // del POST /insurances cuente contra el mismo techo. Con esto devolvemos la
  // mejor oferta firme que haya llegado (normalmente Generali ~3-5s, y las que
  // acompañen); si aún no hay ninguna, respondemos "calculando" con el
  // insuranceId y el follow-up humano cierra con la tarifa definitiva.
  const deadline = requestStarted + MANYCHAT_SYNC_BUDGET_MS;
  const best = await waitForBestQuote(insuranceId, deadline);
  if (best) return respond(buildQuoteResponse(lead.id, insuranceId, best));

  // Aún sin ofertas firmes dentro del presupuesto: respondemos calculando.
  // El snapshot queda cacheado en Codeoscopic (no se pierde) y el paso de
  // poll — o el follow-up humano — cierra con la mejor tarifa.
  return respond({
    ok: true, estado: "calculando", leadId: lead.id, insuranceId,
    compania: "", producto: "", precio: null, precioTexto: "", quoteId: "", urlComparativa: buildComparativaUrl(lead.id),
    mensaje: "Estoy calculando tus tarifas. En un momento te envío las mejores opciones por aquí mismo.",
  });
}
