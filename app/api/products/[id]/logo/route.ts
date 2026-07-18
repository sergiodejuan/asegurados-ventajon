import { NextResponse } from "next/server";
import { getProduct } from "@/lib/store";
import { dataUriToResponse } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El logo de un producto se sube desde /admin/productos como un data: URI
// (embebido en el propio JSON del producto). Eso funciona bien en la propia
// web, pero NO en un correo: Gmail y otros clientes bloquean las imágenes
// data: URI en HTML de email por seguridad. Este endpoint sirve ese mismo
// logo como una URL https "de verdad" (decodificando el data: URI al vuelo),
// para poder usarlo en lib/comparativaEmail.ts sin tocar cómo se guarda o se
// muestra en la web.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product?.logoUrl) return NextResponse.json({ ok: false, error: "Sin logo." }, { status: 404 });

  // Si en el futuro se permite pegar directamente una URL https en vez de
  // subir un archivo, ya sirve tal cual sin decodificar nada.
  if (!product.logoUrl.startsWith("data:")) {
    return NextResponse.redirect(product.logoUrl, { status: 302 });
  }

  const parsed = dataUriToResponse(product.logoUrl);
  if (!parsed) return NextResponse.json({ ok: false, error: "Logo no válido." }, { status: 404 });
  return new NextResponse(parsed.buffer, {
    headers: { "Content-Type": parsed.contentType, "Cache-Control": "public, max-age=3600" },
  });
}
