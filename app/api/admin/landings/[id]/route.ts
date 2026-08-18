import { NextResponse } from "next/server";
import { deleteLanding, getLanding, landingSlugTaken, updateLanding, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import { validateLandingContent, RESERVED_LANDING_SLUGS, PRODUCTOS_VALIDOS, type LandingDraft } from "@/lib/landings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;
  const landing = await getLanding(params.id);
  if (!landing) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true, landing });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  let body: LandingDraft;
  try { body = (await request.json()) as LandingDraft; }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (body.producto && !PRODUCTOS_VALIDOS.includes(body.producto)) {
    return NextResponse.json({ ok: false, error: "Selecciona un ramo válido." }, { status: 400 });
  }

  const contentError = validateLandingContent(body);
  if (contentError) return NextResponse.json({ ok: false, error: contentError }, { status: 400 });

  if (typeof body.slug === "string") {
    const slug = body.slug.trim().toLowerCase();
    if (!slug) return NextResponse.json({ ok: false, error: "El slug no puede estar vacío." }, { status: 400 });
    if (RESERVED_LANDING_SLUGS.includes(slug)) {
      return NextResponse.json({ ok: false, error: `"${slug}" es una palabra reservada, elige otro slug.` }, { status: 400 });
    }
    if (await landingSlugTaken(slug, params.id)) {
      return NextResponse.json({ ok: false, error: "Ya existe otra landing con ese slug." }, { status: 409 });
    }
    body = { ...body, slug };
  }

  const landing = await updateLanding(params.id, body);
  if (!landing) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "campana",
    entidad: "landing", entidadId: landing.id, resumen: `Actualizó la landing "/lp/${landing.slug}".`,
  });

  return NextResponse.json({ ok: true, landing });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;
  const removed = await deleteLanding(params.id);
  if (!removed) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "eliminar", modulo: "campana",
    entidad: "landing", entidadId: params.id, resumen: "Eliminó una landing.",
  });

  return NextResponse.json({ ok: true });
}
