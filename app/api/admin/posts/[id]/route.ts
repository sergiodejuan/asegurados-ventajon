import { NextResponse } from "next/server";
import { deletePost, getPost, slugTaken, updatePost, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import type { PostDraft } from "@/lib/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_LENGTH = 900_000;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "blog");
  if (!auth.ok) return auth.response;
  const post = await getPost(params.id);
  if (!post) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, post });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "blog");
  if (!auth.ok) return auth.response;

  let body: PostDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (typeof body.featuredImageUrl === "string" && body.featuredImageUrl.length > MAX_IMAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "La imagen destacada es demasiado grande." }, { status: 413 });
  }
  if (typeof body.headerImageUrl === "string" && body.headerImageUrl.length > MAX_IMAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "La imagen de cabecera es demasiado grande." }, { status: 413 });
  }
  if (typeof body.slug === "string") {
    const slug = body.slug.trim().toLowerCase();
    if (!slug) return NextResponse.json({ ok: false, error: "El slug no puede estar vacío." }, { status: 400 });
    if (await slugTaken(slug, params.id)) {
      return NextResponse.json({ ok: false, error: "Ya existe otra entrada con ese slug." }, { status: 409 });
    }
    body = { ...body, slug };
  }

  const post = await updatePost(params.id, body);
  if (!post) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "blog",
    entidad: "post", entidadId: post.id, resumen: `Actualizó la entrada de blog "${post.title}".`,
  });

  return NextResponse.json({ ok: true, post });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "blog");
  if (!auth.ok) return auth.response;
  const removed = await deletePost(params.id);
  if (!removed) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "eliminar", modulo: "blog",
    entidad: "post", entidadId: params.id, resumen: "Eliminó una entrada de blog.",
  });

  return NextResponse.json({ ok: true });
}
