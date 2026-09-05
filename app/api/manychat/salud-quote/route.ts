import { NextResponse } from "next/server";
import { manychatAuthFail } from "@/lib/manychatAuth";
import { rateLimitFail } from "@/lib/rateLimit";
import { upsertLead, getLead, setLeadCodeoscopicInsuranceId } from "@/lib/store";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { buildHealthPayload } from "@/lib/codeoscopicMap";
import { summarizeInsurance } from "@/lib/codeoscopicSnapshot";
import type { CodeoscopicQuoteSummary } from "@/lib/store";
import type { LeadDraft } from "@/lib/crm";

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
  numAsegurados?: number;
  coberturaDental?: boolean;
  fumador?: boolean;
  aceptaPrivacidad?: boolean;
};

// Respuesta pensada para ManyChat: solo campos escalares y un mensaje ya
// formateado. Los arrays de ManyChat son incómodos de iterar en su UI.
type ResponseShape = {
  ok: boolean;
  mensaje: string;
  leadId: string;
  insuranceId: string;
  estado: "cotizado" | "calculando" | "faltan_datos" | "error";
  compania: string;
  producto: string;
  precio: number | null; // €/mes
  precioTexto: string;   // "23,45€/mes" o "" si no hay
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
      leadId: "", insuranceId: "", compania: "", producto: "", precio: null, precioTexto: "",
    }, 400);
  }

  const telefono = (body.telefono ?? "").trim();
  if (!telefono) {
    return respond({
      ok: false, estado: "faltan_datos", error: "Falta el teléfono.",
      mensaje: "Necesito tu teléfono para poder enviarte la tarifa.",
      leadId: "", insuranceId: "", compania: "", producto: "", precio: null, precioTexto: "",
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
    numAsegurados: typeof body.numAsegurados === "number" ? body.numAsegurados : null,
    coberturaDental: typeof body.coberturaDental === "boolean" ? body.coberturaDental : null,
    fumador: typeof body.fumador === "boolean" ? body.fumador : null,
    aceptaPrivacidad: !!body.aceptaPrivacidad,
    autorizaContacto: true, // llegó por WhatsApp opt-in, ya consintió el canal.
    utm: { source: "manychat" },
  };

  const upserted = await upsertLead(draft, "manychat");
  const lead = await getLead(upserted.id);
  if (!lead) {
    return respond({
      ok: false, estado: "error", error: "No se pudo crear el lead.",
      mensaje: "Uy, ha habido un problema técnico. Un asesor te contactará enseguida.",
      leadId: "", insuranceId: "", compania: "", producto: "", precio: null, precioTexto: "",
    }, 500);
  }

  // Sin Codeoscopic no hay tarifa real; devolvemos mensaje neutro y dejamos
  // el lead para que el asesor cierre.
  if (!codeoscopicConfigured()) {
    return respond({
      ok: true, estado: "calculando", leadId: lead.id, insuranceId: "",
      compania: "", producto: "", precio: null, precioTexto: "",
      mensaje: "Perfecto, ya tengo tus datos. Un asesor te enviará la tarifa personalizada en unos minutos.",
    });
  }

  const mapped = await buildHealthPayload(lead, null);
  if (!mapped.ok) {
    return respond({
      ok: true, estado: "faltan_datos", error: mapped.reason,
      leadId: lead.id, insuranceId: "",
      compania: "", producto: "", precio: null, precioTexto: "",
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
        compania: "", producto: "", precio: null, precioTexto: "",
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
    compania: "", producto: "", precio: null, precioTexto: "",
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
  return {
    ok: true, estado: "cotizado", leadId, insuranceId,
    compania, producto, precio, precioTexto, mensaje,
  };
}
