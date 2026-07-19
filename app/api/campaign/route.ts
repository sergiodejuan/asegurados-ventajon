import { NextResponse } from "next/server";
import { getCampaignConfig, listPromotions } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getCampaignConfig();
  // Además de los banners de campaña "a mano", el carrusel de la Home
  // también puede incluir promociones del módulo /admin/promociones que el
  // admin haya marcado explícitamente para aparecer ahí.
  const promotions = await listPromotions({ onlyPublished: true });
  const homePromotions = promotions.filter((p) => p.mostrarEnHome);
  return NextResponse.json({ ok: true, config, homePromotions });
}
