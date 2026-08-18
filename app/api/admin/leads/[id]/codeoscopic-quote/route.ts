import { NextResponse } from "next/server";
import { z } from "zod";
import { getLead } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { buildHealthPayload } from "@/lib/codeoscopicMap";
import { summarizeInsurance } from "@/lib/codeoscopicSnapshot";

// El documento del titular (DNI/NIE) es obligatorio para que Codeoscopic
// tarifique (ver lib/codeoscopicMap.ts). El tarificador público NO lo pide
// (se difiere a contratación), así que el lead casi nunca lo trae. Aquí el
// agente puede aportarlo a mano para obtener precios reales desde la ficha.
// Mismo formato/normalización que lib/schema.ts, sin persistirlo en el lead:
// se usa solo para esta cotización.
const bodySchema = z
  .object({
    documentoTipo: z.enum(["Dni", "Nie"]).optional(),
    documento: z
      .string()
      .transform((v) => v.trim().toUpperCase().replace(/[^0-9A-Z]/g, ""))
      .refine((v) => /^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(v), "Revisa el DNI o NIE (formato no válido).")
      .optional(),
    // Segundo apellido: Codeoscopic exige los dos. El lead puede no tenerlo
    // (leads antiguos o de otros flujos); el agente lo aporta aquí.
    apellido2: z.string().trim().min(2).max(60).optional(),
  })
  .strict();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pide una cotización real a Codeoscopic para un lead ANTES de que exista un
// presupuesto que la contenga — a diferencia de app/api/quote/create (que
// exige un presupuestoId ya creado, para el flujo público del tarificador),
// aquí un agente quiere ver precios reales primero y decidir qué
// compañía/precio guardar al crear el presupuesto manual desde /admin (ver
// components/admin/CreatePresupuestoModal.tsx). El payload sale del mismo
// mapper (lib/codeoscopicMap.ts), que solo lee del lead — nunca del
// presupuesto —, así que no hace falta que exista uno todavía. El polling
// posterior de esta cotización reutiliza GET /api/quote/[insuranceId] tal
// cual (ya acepta identidad de admin sin necesitar un presupuestoId).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "presupuestos");
  if (!auth.ok) return auth.response;

  if (!codeoscopicConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  // Documento aportado por el agente en esta petición (opcional). Si el lead
  // ya lo tiene, se respeta el suyo; si no, se usa el del body para poder
  // tarificar. No se persiste en el lead.
  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Documento no válido." }, { status: 400 });
  }
  const leadForQuote: typeof lead = {
    ...lead,
    documento: lead.documento || parsed.data.documento || "",
    documentoTipo: lead.documentoTipo || parsed.data.documentoTipo || "",
    apellido2: lead.apellido2 || parsed.data.apellido2 || "",
  };

  const mapped = await buildHealthPayload(leadForQuote, null);
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
    return NextResponse.json({ ok: true, insuranceId: created.id, summary });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[leads/codeoscopic-quote] Codeoscopic falló:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "codeoscopic_error", status }, { status: 502 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
