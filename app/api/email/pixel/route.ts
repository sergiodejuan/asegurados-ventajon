import { NextResponse } from "next/server";
import { markEmailOpened } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Píxel de 1x1 incrustado al final de los correos transaccionales (ver
// lib/comparativaEmail.ts) para poder marcar "abierto" en la ficha del lead
// (ver lib/store.ts) — el mismo patrón que usa cualquier email marketing o
// transaccional. Responde siempre con la imagen, incluso si los parámetros
// no son válidos o el lead ya no existe: nunca debe romper la vista del
// correo en el cliente del usuario.
const PIXEL_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead") ?? "";
  const logId = searchParams.get("log") ?? "";
  if (leadId && logId) await markEmailOpened(leadId, logId).catch(() => {});

  return new NextResponse(PIXEL_GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
