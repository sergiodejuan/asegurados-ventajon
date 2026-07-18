import { NextResponse } from "next/server";
import { getExitIntentConfig } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pública: alimenta el exit-intent de la web general (ver
// components/GeneralExitIntentModal.tsx). Solo devuelve las campañas
// activas — las ocultas desde /admin/exit-intents ni se envían al cliente.
export async function GET() {
  const config = await getExitIntentConfig();
  return NextResponse.json({ ok: true, campaigns: config.campaigns.filter((c) => c.activo) });
}
