import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { getPriceMatchLandingConfig, savePriceMatchLandingConfig } from "@/lib/store";
import type { PriceMatchLandingConfig } from "@/lib/priceMatchLanding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cotas defensivas antes de aceptar el guardado — evita que un formulario
// mal escrito llene el KV.
const MAX_IMAGE_LENGTH = 900_000;
const MAX_BADGES = 8;
const MAX_STEPS = 10;
const MAX_TESTIMONIOS = 10;
const MAX_FAQ_ITEMS = 30;
const MAX_ENLACES = 10;

export async function GET(request: Request) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;
  const config = await getPriceMatchLandingConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PUT(request: Request) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  let body: PriceMatchLandingConfig;
  try { body = (await request.json()) as PriceMatchLandingConfig; }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Falta la configuración." }, { status: 400 });
  }
  if (typeof body.hero?.imageUrl === "string" && body.hero.imageUrl.length > MAX_IMAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "La imagen del hero es demasiado grande." }, { status: 413 });
  }
  const badges = Array.isArray(body.compromisoBadges) ? body.compromisoBadges : [];
  if (badges.length > MAX_BADGES) return NextResponse.json({ ok: false, error: `Máximo ${MAX_BADGES} badges.` }, { status: 400 });
  const steps = Array.isArray(body.comoFunciona?.steps) ? body.comoFunciona.steps : [];
  if (steps.length > MAX_STEPS) return NextResponse.json({ ok: false, error: `Máximo ${MAX_STEPS} pasos.` }, { status: 400 });
  const testimonios = Array.isArray(body.socialProof?.testimonios) ? body.socialProof.testimonios : [];
  if (testimonios.length > MAX_TESTIMONIOS) return NextResponse.json({ ok: false, error: `Máximo ${MAX_TESTIMONIOS} testimonios.` }, { status: 400 });
  const faq = Array.isArray(body.faq?.items) ? body.faq.items : [];
  if (faq.length > MAX_FAQ_ITEMS) return NextResponse.json({ ok: false, error: `Máximo ${MAX_FAQ_ITEMS} preguntas frecuentes.` }, { status: 400 });
  const enlaces = Array.isArray(body.footer?.enlaces) ? body.footer.enlaces : [];
  if (enlaces.length > MAX_ENLACES) return NextResponse.json({ ok: false, error: `Máximo ${MAX_ENLACES} enlaces en footer.` }, { status: 400 });

  const saved = await savePriceMatchLandingConfig(body);
  return NextResponse.json({ ok: true, config: saved });
}
