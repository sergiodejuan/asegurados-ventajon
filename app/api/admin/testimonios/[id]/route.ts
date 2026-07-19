import { NextResponse } from "next/server";
import { deleteTestimonio, getTestimonio, testimonioSlugTaken, updateTestimonio, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import type { TestimonioDraft } from "@/lib/testimonios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_LENGTH = 900_000;

function imagesTooLarge(body: TestimonioDraft): boolean {
  const urls = [body.fotoDestacada, ...(body.galeria ?? [])];
  return urls.some((u) => typeof u === "string" && u.startsWith("data:") && u.length > MAX_IMAGE_LENGTH);
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "testimonios");
  if (!auth.ok) return auth.response;
  const testimonio = await getTestimonio(params.id);
  if (!testimonio) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, testimonio });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "testimonios");
  if (!auth.ok) return auth.response;

  let body: TestimonioDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (imagesTooLarge(body)) {
    return NextResponse.json({ ok: false, error: "Alguna imagen es demasiado grande." }, { status: 413 });
  }
  if (typeof body.slug === "string") {
    const slug = body.slug.trim().toLowerCase();
    if (!slug) return NextResponse.json({ ok: false, error: "El slug no puede estar vacío." }, { status: 400 });
    if (await testimonioSlugTaken(slug, params.id)) {
      return NextResponse.json({ ok: false, error: "Ya existe otro testimonio con ese slug." }, { status: 409 });
    }
    body = { ...body, slug };
  }

  const testimonio = await updateTestimonio(params.id, body);
  if (!testimonio) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "testimonios",
    entidad: "testimonio", entidadId: testimonio.id, resumen: `Actualizó el testimonio de "${testimonio.nombre}".`,
  });

  return NextResponse.json({ ok: true, testimonio });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "testimonios");
  if (!auth.ok) return auth.response;
  const removed = await deleteTestimonio(params.id);
  if (!removed) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "eliminar", modulo: "testimonios",
    entidad: "testimonio", entidadId: params.id, resumen: "Eliminó un testimonio.",
  });

  return NextResponse.json({ ok: true });
}
