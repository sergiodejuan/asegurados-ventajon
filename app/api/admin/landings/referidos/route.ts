import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { getReferralLandingConfig, saveReferralLandingConfig } from "@/lib/store";
import type { ReferralLandingConfig } from "@/lib/referralLanding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cotas defensivas antes de aceptar el guardado.
const MAX_IMAGE_LENGTH = 900_000;
const MAX_BADGES = 8;
const MAX_STEPS = 10;
const MAX_TESTIMONIOS = 10;
const MAX_FAQ_ITEMS = 30;
const MAX_ENLACES = 10;
// Los importes máximos son un salvavidas contra typos del editor —
// nunca deberíamos pagar 5000€ por accidente. Ajustable si algún día se
// dispara una campaña especial (cross-sell aseguradora), pero por ahora
// 200€ es un tope razonable.
const MAX_MONTO_EUR = 200;
const MAX_CAP_ANUAL = 100;

export async function GET(request: Request) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;
  const config = await getReferralLandingConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PUT(request: Request) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  let body: ReferralLandingConfig;
  try { body = (await request.json()) as ReferralLandingConfig; }
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

  // Sanidad de importes — un editor con typo de teclado (2200 en vez de
  // 22) puede vaciar la caja de marketing en un mes. Bloqueamos por
  // encima del tope y por debajo de cero.
  const inc = body.incentivo;
  if (inc) {
    if (typeof inc.montoReferido !== "number" || inc.montoReferido < 0 || inc.montoReferido > MAX_MONTO_EUR) {
      return NextResponse.json({ ok: false, error: `El importe del referido debe ir entre 0 y ${MAX_MONTO_EUR} €.` }, { status: 400 });
    }
    if (typeof inc.montoReferidor !== "number" || inc.montoReferidor < 0 || inc.montoReferidor > MAX_MONTO_EUR) {
      return NextResponse.json({ ok: false, error: `El importe del referidor debe ir entre 0 y ${MAX_MONTO_EUR} €.` }, { status: 400 });
    }
    if (typeof inc.capAnualPorReferidor !== "number" || inc.capAnualPorReferidor < 1 || inc.capAnualPorReferidor > MAX_CAP_ANUAL) {
      return NextResponse.json({ ok: false, error: `El cap anual debe ir entre 1 y ${MAX_CAP_ANUAL}.` }, { status: 400 });
    }
    if (typeof inc.graciaContratacionDias !== "number" || inc.graciaContratacionDias < 0 || inc.graciaContratacionDias > 180) {
      return NextResponse.json({ ok: false, error: "El periodo de gracia debe ir entre 0 y 180 días." }, { status: 400 });
    }
  }

  const saved = await saveReferralLandingConfig(body);
  return NextResponse.json({ ok: true, config: saved });
}
