import { NextResponse } from "next/server";
import { listProducts } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pública: alimenta la página de comparativa con las ofertas activas.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const producto = searchParams.get("producto") ?? undefined;
  const products = await listProducts(producto, true);
  return NextResponse.json({ ok: true, products });
}
