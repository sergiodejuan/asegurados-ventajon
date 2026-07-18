import { NextResponse } from "next/server";
import { createPromotion, listPromotions, promotionSlugTaken, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import { slugifyPromotionTitle, type PromotionDraft } from "@/lib/promotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El cliente ya comprime las imágenes antes de subirlas (ver /admin/promociones);
// un enlace externo en vez de archivo pesa unos pocos bytes.
const MAX_IMAGE_LENGTH = 900_000;

export async function GET(request: Request) {
  const auth = await requireModule(request, "promociones");
  if (!auth.ok) return auth.response;
  const promotions = await listPromotions();
  return NextResponse.json({ ok: true, promotions });
}

export async function POST(request: Request) {
  const auth = await requireModule(request, "promociones");
  if (!auth.ok) return auth.response;

  let body: PromotionDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.tituloTarjeta?.trim()) return NextResponse.json({ ok: false, error: "Falta el título." }, { status: 400 });
  if (typeof body.imagenUrl === "string" && body.imagenUrl.startsWith("data:") && body.imagenUrl.length > MAX_IMAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "La imagen es demasiado grande." }, { status: 413 });
  }

  const slug = (body.slug?.trim() || slugifyPromotionTitle(body.tituloTarjeta)).toLowerCase();
  if (!slug) return NextResponse.json({ ok: false, error: "El slug no puede estar vacío." }, { status: 400 });
  if (await promotionSlugTaken(slug)) {
    return NextResponse.json({ ok: false, error: "Ya existe una promoción con ese slug." }, { status: 409 });
  }

  const promotion = await createPromotion({ ...body, slug });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "crear", modulo: "promociones",
    entidad: "promocion", entidadId: promotion.id, resumen: `Creó la promoción "${promotion.tituloTarjeta}".`,
  });

  return NextResponse.json({ ok: true, promotion });
}
