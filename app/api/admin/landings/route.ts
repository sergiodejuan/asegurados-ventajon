import { NextResponse } from "next/server";
import { listLandings, createLanding, landingSlugTaken, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import {
  slugifyLandingTitle, validateLandingContent, RESERVED_LANDING_SLUGS, PRODUCTOS_VALIDOS,
  type LandingDraft,
} from "@/lib/landings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;
  const landings = await listLandings();
  return NextResponse.json({ ok: true, landings });
}

export async function POST(request: Request) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  let body: LandingDraft;
  try { body = (await request.json()) as LandingDraft; }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Falta el contenido de la landing." }, { status: 400 });
  }
  if (!body.hero?.h1?.trim()) {
    return NextResponse.json({ ok: false, error: "Falta el titular (H1) del hero." }, { status: 400 });
  }
  if (!body.producto || !PRODUCTOS_VALIDOS.includes(body.producto)) {
    return NextResponse.json({ ok: false, error: "Selecciona un ramo válido." }, { status: 400 });
  }

  const contentError = validateLandingContent(body);
  if (contentError) return NextResponse.json({ ok: false, error: contentError }, { status: 400 });

  const slug = (body.slug?.trim() || slugifyLandingTitle(body.hero.h1)).toLowerCase();
  if (!slug) return NextResponse.json({ ok: false, error: "El slug no puede estar vacío." }, { status: 400 });
  if (RESERVED_LANDING_SLUGS.includes(slug)) {
    return NextResponse.json({ ok: false, error: `"${slug}" es una palabra reservada, elige otro slug.` }, { status: 400 });
  }
  if (await landingSlugTaken(slug)) {
    return NextResponse.json({ ok: false, error: "Ya existe una landing con ese slug." }, { status: 409 });
  }

  const landing = await createLanding({ ...body, slug });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "crear", modulo: "campana",
    entidad: "landing", entidadId: landing.id, resumen: `Creó la landing "/lp/${landing.slug}".`,
  });

  return NextResponse.json({ ok: true, landing });
}
