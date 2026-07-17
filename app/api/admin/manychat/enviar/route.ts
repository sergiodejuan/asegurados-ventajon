import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { createAuditLog } from "@/lib/store";
import { sendManychatWhatsAppText, manychatConfigured } from "@/lib/manychat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Envía el mensaje de seguimiento seleccionado en el modal de WhatsApp de
// /admin/presupuestos directamente por ManyChat (sin abrir ninguna
// ventana), y deja constancia en el log de auditoría del presupuesto.
export async function POST(request: Request) {
  const auth = await requireModule(request, "presupuestos");
  if (!auth.ok) return auth.response;

  let body: { telefono?: string; nombre?: string; texto?: string; presupuestoId?: string; plantilla?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const telefono = (body.telefono ?? "").trim();
  const texto = (body.texto ?? "").trim();
  if (!telefono || !texto) return NextResponse.json({ ok: false, error: "Falta el teléfono o el mensaje." }, { status: 400 });
  if (!manychatConfigured()) {
    return NextResponse.json({ ok: false, error: "ManyChat no está configurado (falta la variable MANYCHAT_API_TOKEN)." }, { status: 503 });
  }

  const result = await sendManychatWhatsAppText(telefono, body.nombre ?? "", texto);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error || "No se pudo enviar el mensaje por ManyChat." }, { status: 502 });
  }

  if (body.presupuestoId) {
    await createAuditLog({
      agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "comentar", modulo: "presupuestos",
      entidad: "presupuesto", entidadId: body.presupuestoId,
      resumen: `Envió un WhatsApp de seguimiento por ManyChat${body.plantilla ? ` (${body.plantilla})` : ""}.`,
    });
  }

  return NextResponse.json({ ok: true });
}
