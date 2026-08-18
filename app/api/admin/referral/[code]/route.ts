import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { getReferralByCode, setReferralBlocked, updateReferralConvertidoStatus } from "@/lib/store";
import { getOrderStatus } from "@/lib/tremendous";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/referral/[code]
// Devuelve el ReferralDoc completo + estado actualizado en Tremendous de
// cada order asociada. Sirve para el panel admin del programa referidos.
export async function GET(request: Request, { params }: { params: { code: string } }) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  const doc = await getReferralByCode(decodeURIComponent(params.code));
  if (!doc) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  // Enriquecemos con estado Tremendous en vivo (best-effort, ignora errores).
  const convertidos = await Promise.all(doc.convertidos.map(async (c) => {
    const [estadoRef, estadoReferidor] = await Promise.all([
      c.tremendousOrderIdReferido ? getOrderStatus(c.tremendousOrderIdReferido).catch(() => null) : null,
      c.tremendousOrderIdReferidor ? getOrderStatus(c.tremendousOrderIdReferidor).catch(() => null) : null,
    ]);
    return { ...c, tremendousReferido: estadoRef, tremendousReferidor: estadoReferidor };
  }));

  return NextResponse.json({ ok: true, doc: { ...doc, convertidos } });
}

// PATCH /api/admin/referral/[code]
// Bloquear/desbloquear el código, o marcar un convertido como cancelado
// (por ejemplo si la póliza se cae en periodo de gracia — el bono
// referidor no se abonará ni siquiera aunque pase el tiempo).
export async function PATCH(request: Request, { params }: { params: { code: string } }) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  let body: { bloqueado?: boolean; cancelConvertido?: { leadId: string; motivo?: string } };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const code = decodeURIComponent(params.code);
  const doc = await getReferralByCode(code);
  if (!doc) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  if (typeof body.bloqueado === "boolean" && body.bloqueado !== doc.bloqueado) {
    await setReferralBlocked(code, body.bloqueado);
  }
  if (body.cancelConvertido?.leadId) {
    await updateReferralConvertidoStatus(code, body.cancelConvertido.leadId, {
      status: "cancelado",
      ultimoErrorPago: body.cancelConvertido.motivo ?? "Cancelado por admin",
    });
  }

  const updated = await getReferralByCode(code);
  return NextResponse.json({ ok: true, doc: updated });
}
