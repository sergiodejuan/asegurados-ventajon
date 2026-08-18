import { NextResponse } from "next/server";
import { z } from "zod";
import { getPresupuesto, updatePresupuesto, getLead, getNpsResponse, createAuditLog } from "@/lib/store";
import { PRESUPUESTO_STATUSES, type PresupuestoStatus } from "@/lib/crm";
import { requireModule } from "@/lib/agentAuth";
import { sendPushToLead } from "@/lib/webPush";
import { BRAND_NAME } from "@/lib/brand";

// Schema estricto: solo status + note. Cualquier otro campo (leadId,
// data.codeoscopicInsuranceId, tarifas...) se rechaza — esos se cambian por
// flujos internos, no por PATCH del admin.
const presupuestoPatchSchema = z
  .object({
    status: z.string().max(60).optional(),
    note: z.string().max(4000).optional(),
  })
  .strict();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireModule(request, "presupuestos");
  if (!auth.ok) return auth.response;
  const presupuesto = await getPresupuesto(params.id);
  if (!presupuesto) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  const [lead, nps] = await Promise.all([getLead(presupuesto.leadId), getNpsResponse(params.id)]);
  return NextResponse.json({
    ok: true,
    presupuesto,
    lead: lead ? { id: lead.id, nombre: lead.nombre, telefono: lead.telefono, email: lead.email, status: lead.status } : null,
    nps,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireModule(request, "presupuestos");
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 });
  }
  const parsed = presupuestoPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Campos no válidos." }, { status: 400 });
  }
  const body = parsed.data;

  const status =
    body.status && (PRESUPUESTO_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as PresupuestoStatus)
      : undefined;

  const result = await updatePresupuesto(params.id, { status, note: body.note, agente: auth.agentNombre });
  if (!result) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  if (result.notifyText) {
    sendPushToLead(result.presupuesto.leadId, { title: BRAND_NAME, body: result.notifyText, url: result.notifyUrl || "/area-cliente" })
      .catch((err) => console.error("[presupuestos] push error", err));
  }

  if (status || body.note) {
    await createAuditLog({
      agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: body.note ? "comentar" : "actualizar", modulo: "presupuestos",
      entidad: "presupuesto", entidadId: params.id,
      resumen: [status && `Cambió el estado a "${status}".`, body.note && "Añadió una nota."].filter(Boolean).join(" "),
    });
  }

  return NextResponse.json({ ok: true, presupuesto: result.presupuesto });
}
