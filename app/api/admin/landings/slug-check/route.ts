import { NextResponse } from "next/server";
import { landingSlugTaken } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import { RESERVED_LANDING_SLUGS } from "@/lib/landings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Solo para el hint de disponibilidad en el editor mientras se escribe el
// slug — la comprobación autoritativa (la que de verdad impide guardar dos
// landings con el mismo slug) sigue estando en POST/PATCH.
export async function GET(request: Request) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? "").trim().toLowerCase();
  const excludeId = searchParams.get("excludeId") ?? undefined;
  if (!slug) return NextResponse.json({ ok: true, available: false, reason: "empty" });
  if (RESERVED_LANDING_SLUGS.includes(slug)) return NextResponse.json({ ok: true, available: false, reason: "reserved" });

  const taken = await landingSlugTaken(slug, excludeId);
  return NextResponse.json({ ok: true, available: !taken, reason: taken ? "taken" : undefined });
}
