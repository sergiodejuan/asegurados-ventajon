import { NextResponse } from "next/server";
import { manychatAuthFail } from "@/lib/manychatAuth";
import { rateLimitFail } from "@/lib/rateLimit";
import { getLead } from "@/lib/store";
import {
  resolveNegociadasSalud,
  buildNegociadasMensaje,
  edadDesdeFecha,
  type NegociadasProfile,
} from "@/lib/negociadasSalud";

export const runtime = "nodejs";
// Solo lee catálogo (y opcionalmente el lead): rápido, sobra dentro de los
// ~10s de ManyChat.
export const maxDuration = 15;
export const dynamic = "force-dynamic";

// POST /api/manychat/salud-negociadas
//
// Devuelve el mensaje de las opciones NEGOCIADAS por Asegurados Ventajón
// (Mapfre/Adeslas, SIN copagos), personalizado por edad, dental y nº de
// asegurados. Se envía justo DESPUÉS de la tarifa de Codeoscopic (que suele
// venir con copago) como gancho: mismas compañías, sin copagos.
//
// Body (todo opcional; lo ideal es pasar leadId):
//   { "leadId": "..." }                        → lee edad/dental/nº del lead
//   { "fechaNacimiento": "12/03/1985",         → o pásalos directos como
//     "coberturaDental": "sí", "numAsegurados": 2 }   merge tags
//
// Autenticación: header `x-manychat-secret` (MANYCHAT_WEBHOOK_SECRET).

type Body = {
  leadId?: string;
  fechaNacimiento?: string;
  coberturaDental?: unknown; // boolean | "sí"/"no"/"true"/"false"/"" | null
  numAsegurados?: unknown;   // number | "1".."9" | "" | null
};

type ResponseShape = {
  ok: boolean;
  estado: "ok" | "sin_opciones" | "error";
  mensaje: string;
  // Bloque de líneas por si quieres montar el copy tú en ManyChat.
  negociadasTexto: string;
  mejorCompania: string;
  mejorPrecio: number | null;
  mejorPrecioTexto: string;
  leadId: string;
  error?: string;
};

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

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
  const denied = manychatAuthFail(request);
  if (denied) return denied;

  const rl = await rateLimitFail(request, { bucket: "manychat-salud-negociadas", limit: 60, windowSeconds: 3600 });
  if (rl) return rl;

  let body: Body;
  try { body = await request.json(); }
  catch {
    return respond({
      ok: false, estado: "error", error: "Cuerpo no válido.",
      mensaje: "Ups, no pude cargar las opciones negociadas. Un asesor te las envía enseguida.",
      negociadasTexto: "", mejorCompania: "", mejorPrecio: null, mejorPrecioTexto: "", leadId: "",
    }, 400);
  }

  // Resolvemos el perfil: preferimos el lead (datos ya validados); si no hay
  // leadId, tomamos los merge tags que vengan en el body.
  const leadId = (body.leadId ?? "").toString().trim();
  let fechaNacimiento = body.fechaNacimiento?.toString().trim() ?? "";
  let coberturaDental = coerceBoolean(body.coberturaDental);
  let numAsegurados = coerceNumber(body.numAsegurados);

  if (leadId) {
    const lead = await getLead(leadId);
    if (lead) {
      if (!fechaNacimiento) fechaNacimiento = lead.fechaNacimiento || "";
      if (coberturaDental == null) coberturaDental = lead.coberturaDental;
      if (numAsegurados == null) numAsegurados = lead.numAsegurados;
    }
  }

  const edad = edadDesdeFecha(fechaNacimiento);
  const profile: NegociadasProfile = { edad, coberturaDental, numAsegurados };

  try {
    const options = await resolveNegociadasSalud(profile);
    if (!options.length) {
      return respond({
        ok: true, estado: "sin_opciones",
        mensaje: "Un asesor te va a preparar las opciones negociadas sin copagos y te las envía por aquí mismo.",
        negociadasTexto: "", mejorCompania: "", mejorPrecio: null, mejorPrecioTexto: "", leadId,
      });
    }
    const mensaje = buildNegociadasMensaje(options, edad != null);
    const best = options[0];
    return respond({
      ok: true, estado: "ok", mensaje,
      negociadasTexto: options.map((o) => `• ${o.compania} — ${o.precioTexto} por asegurado`).join("\n"),
      mejorCompania: best.compania, mejorPrecio: best.precio, mejorPrecioTexto: best.precioTexto,
      leadId,
    });
  } catch (err) {
    console.error("[manychat/salud-negociadas] fallo:", (err as Error).message);
    return respond({
      ok: false, estado: "error", error: (err as Error).message,
      mensaje: "Un asesor te va a preparar las opciones negociadas sin copagos y te las envía enseguida.",
      negociadasTexto: "", mejorCompania: "", mejorPrecio: null, mejorPrecioTexto: "", leadId,
    });
  }
}
