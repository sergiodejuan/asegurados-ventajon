import { NextResponse } from "next/server";
import { createTestimonio, listTestimonios, testimonioSlugTaken, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import { slugifyTestimonioTitle, type TestimonioDraft } from "@/lib/testimonios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El cliente ya comprime las imágenes antes de subirlas (ver /admin/testimonios).
const MAX_IMAGE_LENGTH = 900_000;

function imagesTooLarge(body: TestimonioDraft): boolean {
  const urls = [body.fotoDestacada, ...(body.galeria ?? [])];
  return urls.some((u) => typeof u === "string" && u.startsWith("data:") && u.length > MAX_IMAGE_LENGTH);
}

export async function GET(request: Request) {
  const auth = await requireModule(request, "testimonios");
  if (!auth.ok) return auth.response;
  const testimonios = await listTestimonios();
  return NextResponse.json({ ok: true, testimonios });
}

export async function POST(request: Request) {
  const auth = await requireModule(request, "testimonios");
  if (!auth.ok) return auth.response;

  let body: TestimonioDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.nombre?.trim()) return NextResponse.json({ ok: false, error: "Falta el nombre de la familia/persona protagonista." }, { status: 400 });
  if (imagesTooLarge(body)) {
    return NextResponse.json({ ok: false, error: "Alguna imagen es demasiado grande." }, { status: 413 });
  }

  const slug = (body.slug?.trim() || slugifyTestimonioTitle(body.nombre)).toLowerCase();
  if (!slug) return NextResponse.json({ ok: false, error: "El slug no puede estar vacío." }, { status: 400 });
  if (await testimonioSlugTaken(slug)) {
    return NextResponse.json({ ok: false, error: "Ya existe un testimonio con ese slug." }, { status: 409 });
  }

  const testimonio = await createTestimonio({ ...body, slug });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "crear", modulo: "testimonios",
    entidad: "testimonio", entidadId: testimonio.id, resumen: `Creó el testimonio de "${testimonio.nombre}".`,
  });

  return NextResponse.json({ ok: true, testimonio });
}
