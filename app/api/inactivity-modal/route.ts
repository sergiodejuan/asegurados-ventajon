import { NextResponse } from "next/server";
import { getInactivityModalConfig } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pública: alimenta el modal de inactividad de la comparativa
// (components/InactivityModal.tsx). Devuelve la config tal cual; el cliente
// decide si mostrarlo según `activo` y el nº de veces ya visto en la sesión.
export async function GET() {
  const config = await getInactivityModalConfig();
  return NextResponse.json({ ok: true, config });
}
