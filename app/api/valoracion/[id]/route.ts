import { NextResponse } from "next/server";
import { getLlamada, getPresupuesto, getNpsResponse, saveNpsResponse } from "@/lib/store";
import { rateLimitFail } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Encuesta de satisfacción pública: sin sesión ni login. El id de la llamada
// o del presupuesto (un UUID aleatorio) hace de token de acceso — igual que
// un enlace de encuesta por email, nunca se lista ni se puede adivinar.
async function resolveRef(id: string) {
  const llamada = await getLlamada(id);
  if (llamada) return { refType: "llamada" as const, leadId: llamada.leadId, producto: llamada.producto, nombre: llamada.nombre };
  const presupuesto = await getPresupuesto(id);
  if (presupuesto) return { refType: "presupuesto" as const, leadId: presupuesto.leadId, producto: presupuesto.producto, nombre: presupuesto.nombre };
  return null;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const limited = await rateLimitFail(request, { bucket: "valoracion", limit: 60, windowSeconds: 3600 });
  if (limited) return limited;

  const ref = await resolveRef(params.id);
  if (!ref) return NextResponse.json({ ok: false, error: "Encuesta no encontrada." }, { status: 404 });

  const existing = await getNpsResponse(params.id);
  return NextResponse.json({
    ok: true,
    refType: ref.refType,
    producto: ref.producto,
    nombre: ref.nombre,
    already: !!existing,
    response: existing ? { score: existing.score, comentario: existing.comentario } : null,
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const limited = await rateLimitFail(request, { bucket: "valoracion", limit: 60, windowSeconds: 3600 });
  if (limited) return limited;

  const ref = await resolveRef(params.id);
  if (!ref) return NextResponse.json({ ok: false, error: "Encuesta no encontrada." }, { status: 404 });

  const existing = await getNpsResponse(params.id);
  if (existing) return NextResponse.json({ ok: false, error: "Ya habías respondido a esta encuesta. ¡Gracias!" }, { status: 409 });

  let body: { score?: number; comentario?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (typeof body.score !== "number" || !Number.isFinite(body.score) || body.score < 0 || body.score > 10) {
    return NextResponse.json({ ok: false, error: "Puntuación no válida." }, { status: 400 });
  }

  const n = await saveNpsResponse({
    refId: params.id, refType: ref.refType, leadId: ref.leadId, producto: ref.producto,
    score: body.score, comentario: String(body.comentario ?? "").slice(0, 500),
  });

  return NextResponse.json({ ok: true, quiereResena: n.quiereResena });
}
