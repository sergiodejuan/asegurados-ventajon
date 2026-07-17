import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Público (sin autenticación): el selector de fecha en los formularios de
// llamada necesita saber qué días/turnos hay hueco antes de que el usuario
// se identifique. No expone nada sensible, solo qué franjas están libres.
export async function GET() {
  const slots = await getAvailability(3);
  return NextResponse.json({ ok: true, slots });
}
