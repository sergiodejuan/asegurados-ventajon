import { NextResponse } from "next/server";
import { anonymizeLead } from "@/lib/store";
import { adminAuthFail } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Derecho de supresión (RGPD art. 17): anonimiza los datos identificativos
// del lead y sus presupuestos, y borra los índices de búsqueda por
// teléfono/email. Conserva activity/consents como prueba de cumplimiento.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: { agente?: string } = {};
  try { body = await request.json(); } catch { /* cuerpo opcional */ }

  const lead = await anonymizeLead(params.id, body.agente);
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}
