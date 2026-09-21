import { NextResponse } from "next/server";
import { deleteProduct, getProduct, saveProduct, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import type { ProductDraft } from "@/lib/catalog";
import { isValidImageDataUri } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LOGO_LENGTH = 400_000;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "productos");
  if (!auth.ok) return auth.response;
  const product = await getProduct(params.id);
  if (!product) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, product });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "productos");
  if (!auth.ok) return auth.response;

  let body: ProductDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (typeof body.logoUrl === "string") {
    if (body.logoUrl.length > MAX_LOGO_LENGTH) {
      return NextResponse.json({ ok: false, error: "El logo es demasiado grande. Prueba con uno más ligero." }, { status: 413 });
    }
    // Validar MIME real: solo data:image/(png|jpeg|webp|gif). Sin esto, un
    // admin con permiso "productos" podría guardar data:text/html o
    // data:image/svg+xml con <script> y provocar XSS same-origin al servir
    // el logo (ver auditoría, hallazgo X-02). Vacío también es válido (quitar el logo).
    if (!isValidImageDataUri(body.logoUrl)) {
      return NextResponse.json({ ok: false, error: "El logo no es una imagen válida (PNG/JPEG/WebP/GIF)." }, { status: 400 });
    }
  }

  const product = await saveProduct(params.id, body);
  if (!product) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "productos",
    entidad: "producto", entidadId: product.id, resumen: `Actualizó el producto de ${product.compania}.`,
  });

  return NextResponse.json({ ok: true, product });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "productos");
  if (!auth.ok) return auth.response;
  const removed = await deleteProduct(params.id);
  if (!removed) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "eliminar", modulo: "productos",
    entidad: "producto", entidadId: params.id, resumen: "Eliminó un producto del catálogo.",
  });

  return NextResponse.json({ ok: true });
}
