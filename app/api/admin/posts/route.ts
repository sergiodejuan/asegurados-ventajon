import { NextResponse } from "next/server";
import { createPost, listPosts, slugTaken } from "@/lib/store";
import { adminAuthFail } from "@/lib/adminAuth";
import { slugifyTitle, type PostDraft } from "@/lib/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El cliente ya comprime las imágenes antes de subirlas (ver /admin/blog).
const MAX_IMAGE_LENGTH = 900_000;

export async function GET(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const posts = await listPosts();
  return NextResponse.json({ ok: true, posts });
}

export async function POST(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: PostDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.title?.trim()) return NextResponse.json({ ok: false, error: "Falta el título." }, { status: 400 });
  if (typeof body.featuredImageUrl === "string" && body.featuredImageUrl.length > MAX_IMAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "La imagen destacada es demasiado grande." }, { status: 413 });
  }
  if (typeof body.headerImageUrl === "string" && body.headerImageUrl.length > MAX_IMAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "La imagen de cabecera es demasiado grande." }, { status: 413 });
  }

  const slug = (body.slug?.trim() || slugifyTitle(body.title)).toLowerCase();
  if (!slug) return NextResponse.json({ ok: false, error: "El slug no puede estar vacío." }, { status: 400 });
  if (await slugTaken(slug)) {
    return NextResponse.json({ ok: false, error: "Ya existe una entrada con ese slug." }, { status: 409 });
  }

  const post = await createPost({ ...body, slug });
  return NextResponse.json({ ok: true, post });
}
