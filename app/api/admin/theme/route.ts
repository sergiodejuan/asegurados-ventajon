import { NextResponse } from "next/server";
import { adminAuthFail } from "@/lib/adminAuth";
import { getTheme, saveTheme } from "@/lib/store";
import type { SiteTheme } from "@/lib/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El cliente ya comprime las imágenes antes de subirlas.
const MAX_LOGO_LENGTH = 400_000;
const MAX_FAVICON_LENGTH = 150_000;
const MAX_HERO_LENGTH = 900_000;

export async function GET(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const theme = await getTheme();
  return NextResponse.json({ ok: true, theme });
}

export async function PATCH(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: Partial<SiteTheme>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (typeof body.logoUrl === "string" && body.logoUrl.length > MAX_LOGO_LENGTH) {
    return NextResponse.json({ ok: false, error: "El logo del navbar es demasiado grande." }, { status: 413 });
  }
  if (typeof body.minimalLogoUrl === "string" && body.minimalLogoUrl.length > MAX_LOGO_LENGTH) {
    return NextResponse.json({ ok: false, error: "El logo de páginas sin salida es demasiado grande." }, { status: 413 });
  }
  if (typeof body.faviconUrl === "string" && body.faviconUrl.length > MAX_FAVICON_LENGTH) {
    return NextResponse.json({ ok: false, error: "El favicon es demasiado grande." }, { status: 413 });
  }
  if (body.heroImages) {
    for (const [key, val] of Object.entries(body.heroImages)) {
      if (typeof val === "string" && val.length > MAX_HERO_LENGTH) {
        return NextResponse.json({ ok: false, error: `La foto de "${key}" es demasiado grande.` }, { status: 413 });
      }
    }
  }

  const theme = await saveTheme(body);
  return NextResponse.json({ ok: true, theme });
}
