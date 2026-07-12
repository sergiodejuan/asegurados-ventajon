import { NextResponse } from "next/server";
import { adminAuthFail } from "@/lib/adminAuth";
import { getCampaignBanner, saveCampaignBanner } from "@/lib/store";
import type { CampaignBanner } from "@/lib/campaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Límite razonable para la imagen en base64 (el cliente ya la comprime antes
// de subirla) para no abusar del almacén KV.
const MAX_IMAGE_LENGTH = 900_000;

export async function GET(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const banner = await getCampaignBanner();
  return NextResponse.json({ ok: true, banner });
}

export async function PATCH(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (typeof body.imageDataUrl === "string" && body.imageDataUrl.length > MAX_IMAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "La imagen es demasiado grande. Prueba con una más ligera." }, { status: 413 });
  }

  const patch: Partial<CampaignBanner> = {};
  if (typeof body.imageDataUrl === "string") patch.imageDataUrl = body.imageDataUrl;
  if (typeof body.price === "string") patch.price = body.price;
  if (typeof body.headline === "string") patch.headline = body.headline;
  if (typeof body.sub === "string") patch.sub = body.sub;
  if (typeof body.ctaLabel === "string") patch.ctaLabel = body.ctaLabel;
  if (typeof body.ctaHref === "string") patch.ctaHref = body.ctaHref;

  const banner = await saveCampaignBanner(patch);
  return NextResponse.json({ ok: true, banner });
}
