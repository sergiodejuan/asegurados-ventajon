import { NextResponse } from "next/server";
import { clearAgentSessionCookie } from "@/lib/agentAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  clearAgentSessionCookie();
  return NextResponse.json({ ok: true });
}
