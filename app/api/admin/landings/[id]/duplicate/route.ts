import { NextResponse } from "next/server";
import { duplicateLanding, landingSlugTaken, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import { slugifyLandingTitle, RESERVED_LANDING_SLUGS } from "@/lib/landings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Duplicar es su propio endpoint (en vez de "leer en cliente y volver a
// crear") para que la unicidad de slug y el id/timestamps de la copia se
// generen de forma atómica en servidor, sin depender de que el cliente
// mande de vuelta datos que pudieran haber quedado desactualizados.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  let body: { newSlug?: string };
  try { body = (await request.json()) as { newSlug?: string }; }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const newSlug = (body.newSlug?.trim() ? slugifyLandingTitle(body.newSlug) : "").toLowerCase();
  if (!newSlug) return NextResponse.json({ ok: false, error: "Indica un slug para la copia." }, { status: 400 });
  if (RESERVED_LANDING_SLUGS.includes(newSlug)) {
    return NextResponse.json({ ok: false, error: `"${newSlug}" es una palabra reservada, elige otro slug.` }, { status: 400 });
  }
  if (await landingSlugTaken(newSlug)) {
    return NextResponse.json({ ok: false, error: "Ya existe una landing con ese slug." }, { status: 409 });
  }

  const copy = await duplicateLanding(params.id, newSlug);
  if (!copy) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "crear", modulo: "campana",
    entidad: "landing", entidadId: copy.id, resumen: `Duplicó una landing como "/lp/${copy.slug}".`,
  });

  return NextResponse.json({ ok: true, landing: copy });
}
