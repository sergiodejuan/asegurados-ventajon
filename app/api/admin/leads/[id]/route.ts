import { NextResponse } from "next/server";
import { z } from "zod";
import { getLead, updateLead, listProducts, assignLead, createAuditLog, getReferralAsReferido, getReferralByLeadId } from "@/lib/store";
import { STATUSES, type Status, type LeadSubmission } from "@/lib/crm";
import { requireModule } from "@/lib/agentAuth";
import { saludPrice, vidaPrice } from "@/lib/quote";

// Schema estricto: rechaza cualquier campo no listado para bloquear
// mass-assignment de campos internos como submissions, createdAt, priceMatch,
// consentimientos u otros bloques sensibles.
const leadPatchSchema = z
  .object({
    status: z.string().max(60).optional(),
    nextStep: z.string().max(2000).optional(),
    note: z.string().max(4000).optional(),
    contact: z
      .object({
        channel: z.string().max(30).optional(),
        note: z.string().max(2000).optional(),
      })
      .strict()
      .optional(),
    agenteAsignadoId: z.string().max(80).optional(),
    agenteAsignadoNombre: z.string().max(120).optional(),
  })
  .strict();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Precio orientativo (mismo cálculo que la comparativa pública) para que el
// panel de presupuestos en admin muestre algo más útil que solo la fecha.
// Se basa en la compañía recomendada/destacada del catálogo, no en una
// cotización en firme.
async function estimatePrice(sub: LeadSubmission): Promise<number | null> {
  if (sub.producto !== "salud" && sub.producto !== "vida") return null;
  const products = await listProducts(sub.producto, true);
  if (!products.length) return null;
  const rec = products.find((p) => p.destacado) ?? products[0];
  const data = sub.data;
  if (sub.producto === "salud") {
    const price = saludPrice(
      { conCopago: rec.precioConCopago ?? 0, sinCopago: rec.precioSinCopago ?? 0 },
      { numAsegurados: Number(data.numAsegurados) || 1, coberturaDental: !!data.coberturaDental }
    );
    return Math.min(price.conCopago, price.sinCopago);
  }
  const price = vidaPrice({ precio: rec.precio ?? 0 }, { fumador: !!data.fumador });
  return price.precio;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireModule(request, "leads");
  if (!auth.ok) return auth.response;
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  const [submissions, referidoInfo, referidorDoc] = await Promise.all([
    Promise.all((lead.submissions ?? []).map(async (s) => ({ ...s, precioAprox: await estimatePrice(s) }))),
    getReferralAsReferido(lead.id),
    getReferralByLeadId(lead.id),
  ]);
  return NextResponse.json({
    ok: true,
    lead: { ...lead, submissions },
    // Programa referidos: si este lead entró como amigo de alguien
    // (referidoDe) y/o si él mismo ha generado su propio código para
    // referir a otros (comoReferidor) — ver PresupuestosPanel-equivalente
    // en la ficha de /admin. Ninguno de los dos es sensible (no expone
    // importes de terceros, solo el nombre/código del propio programa).
    referidoDe: referidoInfo
      ? {
          referidorLeadId: referidoInfo.doc.referidorLeadId,
          referidorNombre: referidoInfo.doc.referidorNombre,
          code: referidoInfo.doc.code,
          status: referidoInfo.convertido.status,
          cotizadoAt: referidoInfo.convertido.cotizadoAt,
          optInAt: referidoInfo.convertido.optInAt ?? "",
          contratadoAt: referidoInfo.convertido.contratadoAt ?? "",
          pagadoReferidoAt: referidoInfo.convertido.pagadoReferidoAt ?? "",
          pagadoReferidorAt: referidoInfo.convertido.pagadoReferidorAt ?? "",
          ultimoErrorPago: referidoInfo.convertido.ultimoErrorPago ?? "",
        }
      : null,
    comoReferidor: referidorDoc
      ? {
          code: referidorDoc.code,
          bloqueado: referidorDoc.bloqueado,
          totalConvertidos: referidorDoc.convertidos.length,
          contratados: referidorDoc.convertidos.filter((c) => c.status === "contratado" || c.status === "pagado").length,
          pagados: referidorDoc.convertidos.filter((c) => c.status === "pagado").length,
        }
      : null,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireModule(request, "leads");
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 });
  }
  const parsed = leadPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Campos no válidos." }, { status: 400 });
  }
  const body = parsed.data;

  const status =
    body.status && (STATUSES as readonly string[]).includes(body.status)
      ? (body.status as Status)
      : undefined;

  const contact =
    body.contact?.channel && ["llamada", "whatsapp", "email"].includes(body.contact.channel)
      ? { channel: body.contact.channel, note: body.contact.note }
      : undefined;

  if (body.agenteAsignadoId !== undefined) {
    const assigned = await assignLead(params.id, body.agenteAsignadoId, body.agenteAsignadoNombre ?? "");
    if (!assigned) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
    await createAuditLog({
      agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "asignar", modulo: "leads",
      entidad: "lead", entidadId: params.id,
      resumen: body.agenteAsignadoId ? `Asignó el lead a ${body.agenteAsignadoNombre}.` : "Quitó la asignación del lead.",
    });
  }

  const lead = await updateLead(params.id, {
    status,
    nextStep: typeof body.nextStep === "string" ? body.nextStep : undefined,
    note: body.note,
    contact,
    agente: auth.agentNombre,
  });
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  if (status || body.note || contact) {
    await createAuditLog({
      agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: body.note ? "comentar" : "actualizar", modulo: "leads",
      entidad: "lead", entidadId: params.id,
      resumen: [status && `Cambió el estado a "${status}".`, body.note && "Añadió una nota.", contact && `Registró contacto por ${contact.channel}.`].filter(Boolean).join(" "),
    });
  }

  return NextResponse.json({ ok: true, lead });
}
