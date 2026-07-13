import { NextResponse } from "next/server";
import { getTheme } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pública: alimenta el layout raíz (colores, tipografías, logos, favicon)
// y las páginas con imagen de hero editable.
export async function GET() {
  const theme = await getTheme();
  return NextResponse.json({ ok: true, theme });
}
