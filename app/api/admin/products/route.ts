import { NextResponse } from "next/server";
import { createProduct, listProducts, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import { makeProductId, type Product } from "@/lib/catalog";
import { isValidImageDataUri } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El cliente ya comprime el logo antes de subirlo (ver /admin/productos).
const MAX_LOGO_LENGTH = 400_000;

export async function GET(request: Request) {
  const auth = await requireModule(request, "productos");
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const producto = searchParams.get("producto") ?? undefined;
  const products = await listProducts(producto, false);
  return NextResponse.json({ ok: true, products });
}

export async function POST(request: Request) {
  const auth = await requireModule(request, "productos");
  if (!auth.ok) return auth.response;

  let body: Partial<Product>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.compania?.trim()) return NextResponse.json({ ok: false, error: "Falta el nombre de la compañía." }, { status: 400 });
  if (body.producto !== "salud" && body.producto !== "vida" && body.producto !== "auto" && body.producto !== "decesos") {
    return NextResponse.json({ ok: false, error: "Producto no válido." }, { status: 400 });
  }
  if (typeof body.logoUrl === "string") {
    if (body.logoUrl.length > MAX_LOGO_LENGTH) {
      return NextResponse.json({ ok: false, error: "El logo es demasiado grande. Prueba con uno más ligero." }, { status: 413 });
    }
    if (!isValidImageDataUri(body.logoUrl)) {
      return NextResponse.json({ ok: false, error: "El logo no es una imagen válida (PNG/JPEG/WebP/GIF)." }, { status: 400 });
    }
  }

  // ID ÚNICO por producto: antes era `${producto}-${slug(compania)}`, lo que
  // hacía que dos productos de la misma compañía (p.ej. dos "Mapfre" de salud,
  // uno con copago y otro sin) compartieran id y se pisaran los datos. Ahora
  // se añade un sufijo aleatorio para que cada producto creado sea independiente.
  const id = `${makeProductId(body.producto, body.compania)}-${crypto.randomUUID().slice(0, 8)}`;
  const product: Omit<Product, "updatedAt"> = {
    id,
    producto: body.producto,
    compania: body.compania.trim(),
    titulo: body.titulo,
    activo: body.activo ?? true,
    destacado: body.destacado ?? false,
    orden: body.orden ?? 99,
    logoUrl: body.logoUrl,
    precioConCopago: body.precioConCopago,
    precioSinCopago: body.precioSinCopago,
    modalidadCopago: body.modalidadCopago,
    dental: body.dental,
    precio: body.precio,
    condiciones: body.condiciones ?? "",
    servicios: body.servicios ?? [],
  };

  const created = await createProduct(product);

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "crear", modulo: "productos",
    entidad: "producto", entidadId: created.id, resumen: `Añadió el producto de ${created.compania} (${created.producto}).`,
  });

  return NextResponse.json({ ok: true, product: created });
}
