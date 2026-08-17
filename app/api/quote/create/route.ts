import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLead, setLeadCodeoscopicInsuranceId, setLeadSaludTarificacion, getHiddenBrands } from "@/lib/store";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { buildHealthPayload } from "@/lib/codeoscopicMap";
import { summarizeInsurance, filterInsuranceByHiddenBrands } from "@/lib/codeoscopicSnapshot";

// Endpoint que la comparativa llama al montarse para pedir cotizaciones
// reales a Codeoscopic. Flujo:
//   1) Recibe presupuestoId (pid) que viene en la URL de /comparativa.
//   2) Lee el presupuesto y su lead del almacén server-side.
//   3) Construye el payload de POST /insurances con los datos ya validados.
//   4) Persiste el insuranceId devuelto en el propio presupuesto para el
//      polling posterior desde el frontend.
//
// Fail-open documentado: si Codeoscopic no está configurado (falta alguna
// env) o el mapper no puede construir el payload (por ejemplo si es un lead
// antiguo sin documento), respondemos con { ok: false, reason } y la
// comparativa muestra el catálogo mock sin romperse.
//
// Vercel Hobby permite hoy hasta 60s por función serverless. El POST
// /insurances puede tardar más, pero en la mayoría de casos responde dentro
// de ese margen con lo que ya tienen listas las aseguradoras y las demás
// llegan por polling posterior con estimate=true. Si tu comparativa se
// queda corta con 60s, subir a Pro y cambiar este maxDuration.
export const maxDuration = 60;

// Ancla en el LEAD, no en un presupuesto: un lead que solo tarifica no genera
// presupuesto (ver /api/lead y /api/quote/interes). Se acepta presupuestoId
// como alias heredado (algún enlace antiguo), pero el flujo normal manda leadId.
const bodySchema = z.object({
  leadId: z.string().trim().min(1).optional(),
  presupuestoId: z.string().trim().min(1).optional(),
  // Recálculo desde "Editar y recalcular" en la comparativa: persiste los
  // datos de salud editados (nº de asegurados, dental) y fuerza una cotización
  // NUEVA en Codeoscopic (no se reutiliza la cacheada), para que la tarifa
  // refleje los cambios.
  recalcular: z.boolean().optional(),
  numAsegurados: z.number().int().min(1).max(9).optional(),
  coberturaDental: z.boolean().optional(),
}).refine((d) => d.leadId || d.presupuestoId, { message: "leadId requerido" });

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  if (!codeoscopicConfigured()) {
    // Modo fallback silencioso: la comparativa detecta esto y sigue con el
    // catálogo mock — sin mensajes de error al usuario.
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const leadId = parsed.data.leadId || parsed.data.presupuestoId!;
  const lead = await getLead(leadId);
  if (!lead) return NextResponse.json({ ok: false, reason: "lead_not_found" }, { status: 404 });

  // Solo Salud está soportado en Codeoscopic desde esta web.
  if (lead.producto !== "salud") {
    return NextResponse.json({ ok: false, reason: "producto_no_soportado" });
  }

  // Recálculo: persistimos los datos de salud editados en la comparativa antes
  // de construir el payload, para que la nueva cotización los refleje. No
  // reutilizamos la cotización cacheada (más abajo se salta ese atajo).
  if (parsed.data.recalcular) {
    await setLeadSaludTarificacion(leadId, {
      numAsegurados: parsed.data.numAsegurados,
      coberturaDental: parsed.data.coberturaDental,
    }).catch((err) => console.error("[quote/create] recalc patch falló:", (err as Error).message));
    // Releemos el lead ya actualizado para que buildHealthPayload use los
    // valores nuevos.
    const fresh = await getLead(leadId);
    if (fresh) Object.assign(lead, fresh);
  }

  // Si ya hicimos un POST previo (p.ej. porque el usuario refrescó la
  // comparativa o volvió de "Más información"), reutilizamos el insurance en
  // vez de crear otro. Evita llenar Codeoscopic de proyectos duplicados. En un
  // recálculo explícito NO se reutiliza: queremos una tarifa nueva.
  if (lead.codeoscopicInsuranceId && !parsed.data.recalcular) {
    try {
      const snapshot = await codeoscopicFetch<CodeoscopicInsurance>(`/insurances/${encodeURIComponent(lead.codeoscopicInsuranceId)}`);
      const summary = summarizeInsurance(snapshot);
      const hidden = await getHiddenBrands("salud");
      return NextResponse.json({ ok: true, insuranceId: lead.codeoscopicInsuranceId, snapshot: filterInsuranceByHiddenBrands(snapshot, hidden), summary });
    } catch (err) {
      // Si Codeoscopic ya no reconoce el id (raro, p.ej. tras rotar
      // credenciales entre entornos), creamos uno nuevo abajo.
      console.error("[quote/create] snapshot existente falló, creo otro:", (err as Error).message);
    }
  }

  const mapped = await buildHealthPayload(lead, null);
  if (!mapped.ok) return NextResponse.json({ ok: false, reason: mapped.reason });

  try {
    const created = await codeoscopicFetch<CodeoscopicInsurance>("/insurances", {
      method: "POST",
      body: mapped.payload,
    });
    if (!created?.id) {
      return NextResponse.json({ ok: false, reason: "codeoscopic_sin_id" }, { status: 502 });
    }
    const summary = summarizeInsurance(created);
    await setLeadCodeoscopicInsuranceId(leadId, created.id);
    const hidden = await getHiddenBrands("salud");
    return NextResponse.json({ ok: true, insuranceId: created.id, snapshot: filterInsuranceByHiddenBrands(created, hidden), summary });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[quote/create] Codeoscopic falló:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "codeoscopic_error", status }, { status: 502 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, reason: "method_not_allowed" }, { status: 405 });
}
