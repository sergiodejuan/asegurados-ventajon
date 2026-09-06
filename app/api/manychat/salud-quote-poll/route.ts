import { NextResponse } from "next/server";
import { manychatAuthFail } from "@/lib/manychatAuth";
import { rateLimitFail } from "@/lib/rateLimit";
import { getLead } from "@/lib/store";
import { codeoscopicConfigured, CodeoscopicError } from "@/lib/codeoscopic";
import {
  readBestQuoteOnce,
  buildQuoteResponse,
  buildCalculandoResponse,
  type ResponseShape,
} from "@/lib/manychatSaludQuote";

export const runtime = "nodejs";
// Solo lee un snapshot ya calculado: es rápido y va sobrado dentro de los
// ~10s de ManyChat. No necesita el maxDuration largo del paso de arranque.
export const maxDuration = 15;
export const dynamic = "force-dynamic";

// POST /api/manychat/salud-quote-poll
//
// Segundo paso (opcional pero recomendado) del flow de tarifa de salud.
// Se llama DESPUÉS de un "Smart Delay" de ManyChat (p.ej. 15-25 s) sobre la
// respuesta de /salud-quote, para recuperar la mejor tarifa una vez que ya
// han respondido las aseguradoras lentas (Adeslas/Asisa 15-30 s).
//
// Por qué existe: ManyChat aborta cualquier External Request a los ~10 s, así
// que /salud-quote no puede esperar a todas las compañías. Este endpoint solo
// LEE el snapshot que Codeoscopic ya tiene cacheado (una sola llamada, rápida)
// y devuelve la más barata firme del momento.
//
// Body: { "insuranceId": "40307819" }  ó  { "leadId": "..." }
//   - Preferido: insuranceId (el que devolvió /salud-quote como {{insuranceId}}).
//   - Alternativa: leadId — se resuelve al insuranceId anclado al lead.
//
// Autenticación: header `x-manychat-secret` (MANYCHAT_WEBHOOK_SECRET).

type Body = { insuranceId?: string; leadId?: string };

function respond(payload: ResponseShape, status = 200) {
  return NextResponse.json(payload, { status });
}

function calculandoMsg(leadId: string, insuranceId: string): ResponseShape {
  return buildCalculandoResponse(
    leadId,
    insuranceId,
    "Sigo afinando tu mejor tarifa. Dame un momentito más y te la envío por aquí.",
  );
}

export async function POST(request: Request) {
  const denied = manychatAuthFail(request);
  if (denied) return denied;

  const rl = await rateLimitFail(request, { bucket: "manychat-salud-quote-poll", limit: 60, windowSeconds: 3600 });
  if (rl) return rl;

  let body: Body;
  try { body = await request.json(); }
  catch {
    return respond({
      ok: false, estado: "error", error: "Cuerpo no válido.",
      mensaje: "Ups, no me llegó bien la referencia de tu tarifa. Un asesor te la envía enseguida.",
      leadId: "", insuranceId: "", compania: "", producto: "", precio: null, precioTexto: "", quoteId: "", urlComparativa: "",
    }, 400);
  }

  let insuranceId = (body.insuranceId ?? "").toString().trim();
  const leadId = (body.leadId ?? "").toString().trim();

  // Sin insuranceId, intentamos resolverlo desde el lead.
  if (!insuranceId && leadId) {
    const lead = await getLead(leadId);
    insuranceId = lead?.codeoscopicInsuranceId?.trim() || "";
  }

  if (!insuranceId) {
    // Todavía no hay cotización arrancada (o el arranque falló). Respondemos
    // calculando para que el flow pueda reintentar o pasar al asesor.
    return respond(calculandoMsg(leadId, ""));
  }

  if (!codeoscopicConfigured()) {
    return respond(calculandoMsg(leadId, insuranceId));
  }

  try {
    const best = await readBestQuoteOnce(insuranceId);
    if (best) return respond(buildQuoteResponse(leadId, insuranceId, best));
    // Aún sin ofertas firmes: el flow puede volver a esperar y repollear.
    return respond(calculandoMsg(leadId, insuranceId));
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[manychat/salud-quote-poll] Codeoscopic falló:", (err as Error).message, "status", status);
    return respond(calculandoMsg(leadId, insuranceId));
  }
}
