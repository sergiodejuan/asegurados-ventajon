import { NextResponse } from "next/server";
import { adminAuthFail } from "@/lib/adminAuth";
import { getCampaignConfig, saveCampaignConfig } from "@/lib/store";
import type { CampaignConfig } from "@/lib/campaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Límite razonable por imagen en base64 (el cliente ya la comprime antes de
// subirla) para no abusar del almacén KV.
const MAX_IMAGE_LENGTH = 900_000;
const MAX_SLIDES = 8;

export async function GET(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const config = await getCampaignConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PATCH(request: Request) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: Partial<CampaignConfig>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (body.slides) {
    if (!Array.isArray(body.slides)) {
      return NextResponse.json({ ok: false, error: "Formato de diapositivas no válido." }, { status: 400 });
    }
    if (body.slides.length > MAX_SLIDES) {
      return NextResponse.json({ ok: false, error: `Máximo ${MAX_SLIDES} diapositivas.` }, { status: 400 });
    }
    for (const s of body.slides) {
      if (typeof s.imageDataUrl === "string" && s.imageDataUrl.length > MAX_IMAGE_LENGTH) {
        return NextResponse.json({ ok: false, error: "Una de las imágenes es demasiado grande." }, { status: 413 });
      }
    }
  }
  if (typeof body.intervalMs === "number" && (body.intervalMs < 2000 || body.intervalMs > 30000)) {
    return NextResponse.json({ ok: false, error: "El intervalo debe estar entre 2 y 30 segundos." }, { status: 400 });
  }

  const config = await saveCampaignConfig(body);
  return NextResponse.json({ ok: true, config });
}
