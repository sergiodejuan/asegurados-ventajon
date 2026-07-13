import { NextResponse } from "next/server";
import { getCampaignConfig } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getCampaignConfig();
  return NextResponse.json({ ok: true, config });
}
