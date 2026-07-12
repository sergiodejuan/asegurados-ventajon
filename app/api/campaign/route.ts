import { NextResponse } from "next/server";
import { getCampaignBanner } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const banner = await getCampaignBanner();
  return NextResponse.json({ ok: true, banner });
}
