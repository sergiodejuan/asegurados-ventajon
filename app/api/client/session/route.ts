import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLead, listPresupuestosByLead, listLlamadasByLead } from "@/lib/store";
import { presupuestoToClientQuote, llamadaToClientView } from "@/lib/clientQuote";
import { CLIENT_SESSION_COOKIE, verifySessionToken } from "@/lib/clientSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Restaura la sesión del área de cliente a partir de la cookie (si existe y
// es válida), devolviendo sus datos de contacto y todos sus presupuestos
// directamente desde la base de datos — no hay caché local que consultar.
export async function GET() {
  const token = cookies().get(CLIENT_SESSION_COOKIE)?.value;
  const leadId = verifySessionToken(token);
  if (!leadId) return NextResponse.json({ ok: false });

  const lead = await getLead(leadId);
  if (!lead) return NextResponse.json({ ok: false });

  const [presupuestos, llamadas] = await Promise.all([
    listPresupuestosByLead(leadId),
    listLlamadasByLead(leadId),
  ]);
  return NextResponse.json({
    ok: true,
    profile: { nombre: lead.nombre, telefono: lead.telefono, email: lead.email, diaLlamada: lead.diaLlamada, turnoLlamada: lead.turnoLlamada },
    presupuestos: presupuestos.map(presupuestoToClientQuote),
    llamadas: llamadas.map(llamadaToClientView),
  });
}
