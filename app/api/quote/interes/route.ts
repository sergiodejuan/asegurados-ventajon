import { NextResponse } from "next/server";
import { z } from "zod";
import { getLead, createPresupuesto, setPresupuestoCodeoscopicSnapshot, updateLead } from "@/lib/store";
import { codeoscopicConfigured, codeoscopicFetch, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { summarizeInsurance } from "@/lib/codeoscopicSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

// "Mostrar interés": el usuario ha pulsado "Que te llamen gratis" sobre una
// opción concreta de la comparativa. ESTE es el momento en el que se crea el
// presupuesto (antes solo había un lead "que ha tarificado"). Guarda la
// aseguradora/precio elegidos y ancla la cotización de Codeoscopic; deja el
// insurance snapshot en el presupuesto para el back office.
const bodySchema = z
  .object({
    leadId: z.string().trim().min(1),
    insuranceId: z.string().trim().min(1).optional(),
    quoteId: z.string().trim().min(1).optional(),
    compania: z.string().trim().min(1).max(120),
    precio: z.number().nonnegative().max(100000).optional(),
    modalidad: z.string().trim().max(160).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });

  const lead = await getLead(parsed.data.leadId);
  if (!lead) return NextResponse.json({ ok: false, error: "Lead no encontrado." }, { status: 404 });

  const insuranceId = parsed.data.insuranceId || lead.codeoscopicInsuranceId || "";

  const presupuesto = await createPresupuesto({
    id: crypto.randomUUID(),
    leadId: lead.id,
    source: lead.source || "comparativa-interes",
    producto: "salud",
    data: {
      codigoPostal: lead.codigoPostal, inicio: lead.inicio, numAsegurados: lead.numAsegurados,
      fechaNacimiento: lead.fechaNacimiento, sexo: lead.sexo, coberturaDental: lead.coberturaDental,
      // Opción elegida por el usuario (el "interés"):
      codeoscopicInsuranceId: insuranceId || undefined,
      codeoscopicQuoteId: parsed.data.quoteId,
      companiaElegida: parsed.data.compania,
      modalidadElegida: parsed.data.modalidad,
      precioElegido: parsed.data.precio,
    },
    nombre: lead.nombre, telefono: lead.telefono, email: lead.email,
  }).catch((err) => { console.error("[quote/interes] presupuesto error", err); return null; });

  if (!presupuesto) return NextResponse.json({ ok: false, error: "No se pudo crear el presupuesto." }, { status: 502 });

  // Snapshot de Codeoscopic para el back office (best-effort).
  if (insuranceId && codeoscopicConfigured()) {
    try {
      const snap = await codeoscopicFetch<CodeoscopicInsurance>(`/insurances/${encodeURIComponent(insuranceId)}`);
      await setPresupuestoCodeoscopicSnapshot(presupuesto.id, summarizeInsurance(snap));
    } catch (err) {
      console.error("[quote/interes] snapshot error (no bloqueante):", (err as Error).message);
    }
  }

  // Deja constancia en la ficha del lead de que mostró interés en una opción.
  await updateLead(lead.id, { note: `Interés en ${parsed.data.compania}${parsed.data.precio != null ? ` (${parsed.data.precio} €/mes)` : ""} desde la comparativa` })
    .catch((err) => console.error("[quote/interes] updateLead error (no bloqueante):", (err as Error).message));

  return NextResponse.json({ ok: true, presupuestoId: presupuesto.id });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
