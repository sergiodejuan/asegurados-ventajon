import { NextResponse } from "next/server";
import { getTheme } from "@/lib/store";
import { dataUriToResponse } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mismo motivo que app/api/products/[id]/logo: el logo de marca se guarda
// como data: URI (subido desde /admin/diseno) y eso no se ve en un correo
// (Gmail y otros bloquean data: URI en HTML de email). Sirve el logo actual
// como una URL https real para usarlo en la cabecera del correo de
// comparativa (ver lib/comparativaEmail.ts).
export async function GET() {
  const theme = await getTheme();
  const logoUrl = theme.logoUrl;
  if (!logoUrl) return NextResponse.json({ ok: false, error: "Sin logo configurado." }, { status: 404 });

  if (!logoUrl.startsWith("data:")) {
    return NextResponse.redirect(logoUrl, { status: 302 });
  }

  const parsed = dataUriToResponse(logoUrl);
  if (!parsed) return NextResponse.json({ ok: false, error: "Logo no válido." }, { status: 404 });
  return new NextResponse(parsed.buffer, {
    headers: { "Content-Type": parsed.contentType, "Cache-Control": "public, max-age=3600" },
  });
}
