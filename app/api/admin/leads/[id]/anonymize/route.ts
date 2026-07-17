import { NextResponse } from "next/server";
import { anonymizeLead, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Derecho de supresión (RGPD art. 17): anonimiza los datos identificativos
// del lead y sus presupuestos, y borra los índices de búsqueda por
// teléfono/email. Conserva activity/consents como prueba de cumplimiento.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireModule(request, "rgpd");
  if (!auth.ok) return auth.response;

  const lead = await anonymizeLead(params.id, auth.agentNombre);
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "rgpd",
    entidad: "lead", entidadId: params.id, resumen: "Anonimizó el lead (derecho de supresión RGPD).",
  });

  return NextResponse.json({ ok: true, lead });
}
