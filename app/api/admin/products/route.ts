import { NextResponse } from "next/server";
import { createProduct, listProducts } from "@/lib/store";
import { adminAuthFail } from "@/lib/adminAuth";
import { makeProductId, type Product } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const producto = searchParams.get("producto") ?? undefined;
  const products = await listProducts(producto, false);
  return NextResponse.json({ ok: true, products });
}

export async function POST(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: Partial<Product>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.compania?.trim()) return NextResponse.json({ ok: false, error: "Falta el nombre de la compañía." }, { status: 400 });
  if (body.producto !== "salud" && body.producto !== "vida") {
    return NextResponse.json({ ok: false, error: "Producto no válido." }, { status: 400 });
  }

  const id = makeProductId(body.producto, body.compania);
  const product: Omit<Product, "updatedAt"> = {
    id,
    producto: body.producto,
    compania: body.compania.trim(),
    activo: body.activo ?? true,
    destacado: body.destacado ?? false,
    orden: body.orden ?? 99,
    precioConCopago: body.precioConCopago,
    precioSinCopago: body.precioSinCopago,
    precio: body.precio,
    condiciones: body.condiciones ?? "",
    servicios: body.servicios ?? [],
  };

  const created = await createProduct(product);
  return NextResponse.json({ ok: true, product: created });
}
