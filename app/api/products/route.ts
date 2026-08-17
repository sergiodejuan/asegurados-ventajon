import { NextResponse } from "next/server";
import { listProducts, getHiddenBrands } from "@/lib/store";
import { isBrandVisible, type Ramo } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RAMOS: Ramo[] = ["salud", "vida", "auto", "decesos"];

// Pública: alimenta la página de comparativa con las ofertas activas. Además
// del flag por producto (activo), se respeta el catálogo de aseguradoras por
// ramo: las marcas ocultas en admin no se muestran (mismo control que filtra
// los precios reales de Codeoscopic).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const producto = searchParams.get("producto") ?? undefined;
  const products = await listProducts(producto, true);

  const ramo = RAMOS.includes(producto as Ramo) ? (producto as Ramo) : null;
  if (ramo) {
    const hidden = await getHiddenBrands(ramo);
    if (hidden.length) {
      return NextResponse.json({ ok: true, products: products.filter((p) => isBrandVisible(p.compania, hidden)) });
    }
  }
  return NextResponse.json({ ok: true, products });
}
