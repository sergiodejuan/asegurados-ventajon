import { NextResponse } from "next/server";
import { deletePromotion, getPromotion, promotionSlugTaken, updatePromotion, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import type { PromotionDraft } from "@/lib/promotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_LENGTH = 900_000;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "promociones");
  if (!auth.ok) return auth.response;
  const promotion = await getPromotion(params.id);
  if (!promotion) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true, promotion });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "promociones");
  if (!auth.ok) return auth.response;

  let body: PromotionDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (typeof body.imagenUrl === "string" && body.imagenUrl.startsWith("data:") && body.imagenUrl.length > MAX_IMAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "La imagen es demasiado grande." }, { status: 413 });
  }
  if (typeof body.slug === "string") {
    const slug = body.slug.trim().toLowerCase();
    if (!slug) return NextResponse.json({ ok: false, error: "El slug no puede estar vacío." }, { status: 400 });
    if (await promotionSlugTaken(slug, params.id)) {
      return NextResponse.json({ ok: false, error: "Ya existe otra promoción con ese slug." }, { status: 409 });
    }
    body = { ...body, slug };
  }

  const promotion = await updatePromotion(params.id, body);
  if (!promotion) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "promociones",
    entidad: "promocion", entidadId: promotion.id, resumen: `Actualizó la promoción "${promotion.tituloTarjeta}".`,
  });

  return NextResponse.json({ ok: true, promotion });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "promociones");
  if (!auth.ok) return auth.response;
  const removed = await deletePromotion(params.id);
  if (!removed) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "eliminar", modulo: "promociones",
    entidad: "promocion", entidadId: params.id, resumen: "Eliminó una promoción.",
  });

  return NextResponse.json({ ok: true });
}
