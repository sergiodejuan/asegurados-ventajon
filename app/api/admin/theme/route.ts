import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { getTheme, saveTheme, createAuditLog } from "@/lib/store";
import type { SiteTheme } from "@/lib/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El cliente ya comprime las imágenes antes de subirlas.
const MAX_LOGO_LENGTH = 400_000;
const MAX_FAVICON_LENGTH = 150_000;
const MAX_HERO_LENGTH = 900_000;

// components/admin/ImageField.tsx solo produce data URIs png/jpeg (via
// canvas.toDataURL) — cualquier otro valor no puede venir de un uso normal
// del panel, así que se rechaza. Sin esto, una cuenta de agente con acceso a
// "configuración" podría guardar cualquier string en estos campos, que
// luego se renderiza como src de <img> en todo el sitio público.
const IMAGE_DATA_URI = /^data:image\/(png|jpeg);base64,/;
function isValidImageValue(v: string): boolean {
  return v === "" || IMAGE_DATA_URI.test(v);
}

export async function GET(request: Request) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;
  const theme = await getTheme();
  return NextResponse.json({ ok: true, theme });
}

export async function PATCH(request: Request) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;

  let body: Partial<SiteTheme>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (typeof body.logoUrl === "string") {
    if (body.logoUrl.length > MAX_LOGO_LENGTH) return NextResponse.json({ ok: false, error: "El logo del navbar es demasiado grande." }, { status: 413 });
    if (!isValidImageValue(body.logoUrl)) return NextResponse.json({ ok: false, error: "El logo del navbar no es una imagen válida." }, { status: 400 });
  }
  if (typeof body.minimalLogoUrl === "string") {
    if (body.minimalLogoUrl.length > MAX_LOGO_LENGTH) return NextResponse.json({ ok: false, error: "El logo de páginas sin salida es demasiado grande." }, { status: 413 });
    if (!isValidImageValue(body.minimalLogoUrl)) return NextResponse.json({ ok: false, error: "El logo de páginas sin salida no es una imagen válida." }, { status: 400 });
  }
  if (typeof body.faviconUrl === "string") {
    if (body.faviconUrl.length > MAX_FAVICON_LENGTH) return NextResponse.json({ ok: false, error: "El favicon es demasiado grande." }, { status: 413 });
    if (!isValidImageValue(body.faviconUrl)) return NextResponse.json({ ok: false, error: "El favicon no es una imagen válida." }, { status: 400 });
  }
  if (body.heroImages) {
    for (const [key, val] of Object.entries(body.heroImages)) {
      if (typeof val !== "string") continue;
      if (val.length > MAX_HERO_LENGTH) return NextResponse.json({ ok: false, error: `La foto de "${key}" es demasiado grande.` }, { status: 413 });
      if (!isValidImageValue(val)) return NextResponse.json({ ok: false, error: `La foto de "${key}" no es una imagen válida.` }, { status: 400 });
    }
  }
  if (body.partnerLogos) {
    for (const [key, val] of Object.entries(body.partnerLogos)) {
      if (typeof val !== "string") continue;
      if (val.length > MAX_LOGO_LENGTH) return NextResponse.json({ ok: false, error: `El logo de "${key}" es demasiado grande.` }, { status: 413 });
      if (!isValidImageValue(val)) return NextResponse.json({ ok: false, error: `El logo de "${key}" no es una imagen válida.` }, { status: 400 });
    }
  }
  if (body.cookieConsent?.body && body.cookieConsent.body.length > 5000) {
    return NextResponse.json({ ok: false, error: "El texto de cookies es demasiado largo." }, { status: 413 });
  }
  if (typeof body.gtmId === "string" && body.gtmId.length > 30) {
    return NextResponse.json({ ok: false, error: "El ID de Google Tag Manager no es válido." }, { status: 413 });
  }

  const theme = await saveTheme(body);

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "configuracion",
    entidad: "theme", entidadId: "config", resumen: "Actualizó el diseño/tema del sitio.",
  });

  return NextResponse.json({ ok: true, theme });
}
