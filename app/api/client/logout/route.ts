import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CLIENT_SESSION_COOKIE } from "@/lib/clientSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  cookies().delete(CLIENT_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
