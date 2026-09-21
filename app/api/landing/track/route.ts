import { NextResponse } from "next/server";
import { trackLandingEvent, type LandingEventKind } from "@/lib/store";
import { deviceFromUserAgent, daypartNow } from "@/lib/landings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_KINDS: LandingEventKind[] = ["view", "cta_calcular", "cta_llamar"];

// Beacon público de solo-escritura (sin auth, igual nivel de confianza que
// los eventos que ya se mandan a GTM vía pushDataLayerEvent) que alimenta el
// dashboard interno de comparación de landings — ver
// app/admin/campanas/landings/comparar. Contador diario por landing, tipo de
// evento, dispositivo y franja horaria — no un log por evento: ver
// lib/store.ts trackLandingEvent. El dispositivo y la franja horaria se
// clasifican aquí, en el servidor (User-Agent + reloj del servidor), no los
// manda el cliente — así el payload del beacon se queda en {slug, kind}.
export async function POST(request: Request) {
  let body: { slug?: unknown; kind?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!slug || slug.length > 80 || !VALID_KINDS.includes(kind as LandingEventKind)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const device = deviceFromUserAgent(request.headers.get("user-agent") ?? "");
  const daypart = daypartNow();
  await trackLandingEvent(slug, kind as LandingEventKind, device, daypart);
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
