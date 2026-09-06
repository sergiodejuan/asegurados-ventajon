import { NextResponse } from "next/server";
import { manychatAuthFail } from "@/lib/manychatAuth";
import { rateLimitFail } from "@/lib/rateLimit";
import { findClientPresupuestos, getLead } from "@/lib/store";
import { edadDesdeFecha } from "@/lib/negociadasSalud";

export const runtime = "nodejs";
export const maxDuration = 15;
export const dynamic = "force-dynamic";

// POST /api/manychat/prefill-salud
//
// Primer paso del funnel de Tarifa Salud. Con el teléfono del contacto de
// WhatsApp (ManyChat ya lo conoce) busca si el usuario YA tarificó en la web
// y devuelve su perfil para prerellenar los CUFs y saltarse las preguntas.
// Así reconocemos también a quien vino de la comparativa web (no solo a quien
// usó el bot antes).
//
// El cruce es por teléfono: solo funciona si el lead de la web tiene teléfono
// que coincida con el de WhatsApp. `existe:false` = empieza el flujo normal.
//
// Body: { "telefono": "{{phone}}" }
// Autenticación: header `x-manychat-secret` (MANYCHAT_WEBHOOK_SECRET).

type Body = { telefono?: string };

// Booleano del lead → "sí"/"no"/"" (cómodo para pintar y para condiciones).
function siNo(v: boolean | null | undefined): "sí" | "no" | "" {
  return v === true ? "sí" : v === false ? "no" : "";
}

type ResponseShape = {
  ok: boolean;
  existe: boolean;
  // Perfil para mapear a CUFs (vacío si no existe).
  nombre: string;
  apellido1: string;
  apellido2: string;
  email: string;
  documento: string;
  documentoTipo: string;
  fechaNacimiento: string;
  sexo: string;
  codigoPostal: string;
  numAsegurados: number | null;
  coberturaDental: "sí" | "no" | "";
  fumador: "sí" | "no" | "";
  edad: number | null;
  // ¿Ya tiene una cotización de Codeoscopic anclada? Sirve para ofrecer
  // "ver tu última tarifa" sin recalcular.
  tieneTarifa: boolean;
  insuranceId: string;
  // Bloque de texto listo para el mensaje "estos son tus datos guardados".
  datosTexto: string;
  leadId: string;
  error?: string;
};

function vacia(extra?: Partial<ResponseShape>): ResponseShape {
  return {
    ok: true, existe: false,
    nombre: "", apellido1: "", apellido2: "", email: "", documento: "", documentoTipo: "",
    fechaNacimiento: "", sexo: "", codigoPostal: "", numAsegurados: null,
    coberturaDental: "", fumador: "", edad: null,
    tieneTarifa: false, insuranceId: "", datosTexto: "", leadId: "",
    ...extra,
  };
}

function respond(payload: ResponseShape, status = 200) {
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  const denied = manychatAuthFail(request);
  if (denied) return denied;

  const rl = await rateLimitFail(request, { bucket: "manychat-prefill-salud", limit: 60, windowSeconds: 3600 });
  if (rl) return rl;

  let body: Body;
  try { body = await request.json(); }
  catch { return respond(vacia({ ok: false, error: "Cuerpo no válido." }), 400); }

  const telefono = (body.telefono ?? "").toString().trim();
  if (!telefono) return respond(vacia({ ok: false, error: "Falta el teléfono." }), 400);

  const found = await findClientPresupuestos(telefono);
  if (!found) return respond(vacia()); // no lo conocemos → flujo normal

  const lead = await getLead(found.leadId);
  if (!lead) return respond(vacia());

  const edad = edadDesdeFecha(lead.fechaNacimiento);
  const coberturaDental = siNo(lead.coberturaDental);
  const fumador = siNo(lead.fumador);
  const nombreCompleto = [lead.nombre, lead.apellido1, lead.apellido2].map((s) => (s ?? "").trim()).filter(Boolean).join(" ");

  // Bloque para el mensaje "estos son los datos que tenemos guardados".
  const filas = [
    nombreCompleto ? `*Nombre:* ${nombreCompleto}` : "",
    lead.fechaNacimiento ? `*Fecha nac.:* ${lead.fechaNacimiento}` : "",
    lead.email ? `*Email:* ${lead.email}` : "",
    lead.numAsegurados != null ? `*Asegurados:* ${lead.numAsegurados}` : "",
    lead.codigoPostal ? `*Código postal:* ${lead.codigoPostal}` : "",
    coberturaDental ? `*Dental:* ${coberturaDental}` : "",
  ].filter(Boolean);
  const datosTexto = filas.join("\n");

  return respond({
    ok: true, existe: true, leadId: found.leadId,
    nombre: lead.nombre ?? "", apellido1: lead.apellido1 ?? "", apellido2: lead.apellido2 ?? "",
    email: lead.email ?? "", documento: lead.documento ?? "", documentoTipo: lead.documentoTipo ?? "",
    fechaNacimiento: lead.fechaNacimiento ?? "", sexo: lead.sexo ?? "",
    codigoPostal: lead.codigoPostal ?? "", numAsegurados: lead.numAsegurados,
    coberturaDental, fumador, edad,
    tieneTarifa: !!lead.codeoscopicInsuranceId, insuranceId: lead.codeoscopicInsuranceId ?? "",
    datosTexto,
  });
}
