import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { getTheme, saveTheme, createAuditLog } from "@/lib/store";
import type { SiteTheme } from "@/lib/theme";
import { isSafeHref } from "@/lib/safeHref";

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
  if (typeof body.gtmId === "string") {
    if (body.gtmId.length > 30) return NextResponse.json({ ok: false, error: "El ID de Google Tag Manager no es válido." }, { status: 413 });
    if (body.gtmId && !/^GTM-[A-Z0-9]+$/.test(body.gtmId)) return NextResponse.json({ ok: false, error: "El ID de Google Tag Manager debe tener el formato GTM-XXXXXXX." }, { status: 400 });
  }
  if (typeof body.ga4?.measurementId === "string") {
    if (body.ga4.measurementId.length > 20) return NextResponse.json({ ok: false, error: "El ID de medición de GA4 no es válido." }, { status: 413 });
    if (body.ga4.measurementId && !/^G-[A-Z0-9]+$/.test(body.ga4.measurementId)) return NextResponse.json({ ok: false, error: "El ID de medición de GA4 debe tener el formato G-XXXXXXXXXX." }, { status: 400 });
  }
  if (typeof body.metaPixel?.pixelId === "string") {
    if (body.metaPixel.pixelId.length > 30) return NextResponse.json({ ok: false, error: "El ID del píxel de Meta no es válido." }, { status: 413 });
    if (body.metaPixel.pixelId && !/^\d+$/.test(body.metaPixel.pixelId)) return NextResponse.json({ ok: false, error: "El ID del píxel de Meta debe ser solo números." }, { status: 400 });
  }
  if (typeof body.pageTransitionLoader?.imageUrl === "string") {
    if (body.pageTransitionLoader.imageUrl.length > MAX_HERO_LENGTH) return NextResponse.json({ ok: false, error: "La imagen del loader entre páginas es demasiado grande." }, { status: 413 });
    if (!isValidImageValue(body.pageTransitionLoader.imageUrl)) return NextResponse.json({ ok: false, error: "La imagen del loader entre páginas no es una imagen válida." }, { status: 400 });
  }
  if (typeof body.pageTransitionLoader?.defaultSubtitle === "string" && body.pageTransitionLoader.defaultSubtitle.length > 200) {
    return NextResponse.json({ ok: false, error: "El subtítulo por defecto del loader es demasiado largo." }, { status: 413 });
  }
  if (body.pageTransitionLoader?.subtitles) {
    for (const [key, val] of Object.entries(body.pageTransitionLoader.subtitles)) {
      if (typeof val !== "string") continue;
      if (val.length > 200) return NextResponse.json({ ok: false, error: `El subtítulo de "${key}" es demasiado largo.` }, { status: 413 });
    }
  }
  if (Array.isArray(body.pageTransitionLoader?.tips)) {
    if (body.pageTransitionLoader.tips.length > 20) return NextResponse.json({ ok: false, error: "Demasiados datos en la sección \"¿Sabías que…?\"." }, { status: 413 });
    for (const tip of body.pageTransitionLoader.tips) {
      if (typeof tip !== "string") return NextResponse.json({ ok: false, error: "La sección \"¿Sabías que…?\" no es válida." }, { status: 400 });
      if (tip.length > 300) return NextResponse.json({ ok: false, error: "Un dato de \"¿Sabías que…?\" es demasiado largo." }, { status: 413 });
    }
  }
  if (body.autoWidget) {
    const { delaySeconds, title, ctaLabel, ctaHref, icon } = body.autoWidget;
    if (delaySeconds !== undefined && (typeof delaySeconds !== "number" || !Number.isFinite(delaySeconds) || delaySeconds < 0 || delaySeconds > 120)) {
      return NextResponse.json({ ok: false, error: "El retraso del widget de auto debe ser un número entre 0 y 120 segundos." }, { status: 400 });
    }
    if (typeof title === "string" && title.length > 140) return NextResponse.json({ ok: false, error: "El texto del widget de auto es demasiado largo." }, { status: 413 });
    if (typeof ctaLabel === "string" && ctaLabel.length > 40) return NextResponse.json({ ok: false, error: "El texto del botón del widget de auto es demasiado largo." }, { status: 413 });
    if (typeof ctaHref === "string" && ctaHref.length > 300) return NextResponse.json({ ok: false, error: "El enlace del widget de auto es demasiado largo." }, { status: 413 });
    if (typeof ctaHref === "string" && !isSafeHref(ctaHref)) return NextResponse.json({ ok: false, error: "El enlace del widget de auto no es válido (solo se permiten rutas del sitio o URLs http/https/mailto/tel)." }, { status: 400 });
    if (typeof icon === "string" && icon.length > 40) return NextResponse.json({ ok: false, error: "El icono del widget de auto no es válido." }, { status: 400 });
  }
  if (body.homeHero) {
    const { eyebrow, headline, subheadline, ctaPrimaryLabel, ctaPrimaryHref, ctaSecondaryLabel, ctaSecondaryHref } = body.homeHero;
    if (typeof eyebrow === "string" && eyebrow.length > 60) return NextResponse.json({ ok: false, error: "La etiqueta del hero es demasiado larga." }, { status: 413 });
    if (typeof headline === "string" && headline.length > 140) return NextResponse.json({ ok: false, error: "El titular del hero es demasiado largo." }, { status: 413 });
    if (typeof subheadline === "string" && subheadline.length > 400) return NextResponse.json({ ok: false, error: "El subtítulo del hero es demasiado largo." }, { status: 413 });
    if (typeof ctaPrimaryLabel === "string" && ctaPrimaryLabel.length > 40) return NextResponse.json({ ok: false, error: "El texto del botón principal es demasiado largo." }, { status: 413 });
    if (typeof ctaPrimaryHref === "string" && ctaPrimaryHref.length > 300) return NextResponse.json({ ok: false, error: "El enlace del botón principal es demasiado largo." }, { status: 413 });
    if (typeof ctaPrimaryHref === "string" && !isSafeHref(ctaPrimaryHref)) return NextResponse.json({ ok: false, error: "El enlace del botón principal no es válido." }, { status: 400 });
    if (typeof ctaSecondaryLabel === "string" && ctaSecondaryLabel.length > 40) return NextResponse.json({ ok: false, error: "El texto del botón secundario es demasiado largo." }, { status: 413 });
    if (typeof ctaSecondaryHref === "string" && ctaSecondaryHref.length > 300) return NextResponse.json({ ok: false, error: "El enlace del botón secundario es demasiado largo." }, { status: 413 });
    if (typeof ctaSecondaryHref === "string" && !isSafeHref(ctaSecondaryHref)) return NextResponse.json({ ok: false, error: "El enlace del botón secundario no es válido." }, { status: 400 });
  }

  const theme = await saveTheme(body);

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "configuracion",
    entidad: "theme", entidadId: "config", resumen: "Actualizó el diseño/tema del sitio.",
  });

  return NextResponse.json({ ok: true, theme });
}
