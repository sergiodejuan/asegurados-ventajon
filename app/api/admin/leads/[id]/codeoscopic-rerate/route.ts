import { NextResponse } from "next/server";
import { z } from "zod";
import { requireModule } from "@/lib/agentAuth";
import { codeoscopicConfigured, reRateOffer, CodeoscopicError } from "@/lib/codeoscopic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Re-tarifica una cotización para pasar del precio ESTIMADO al FIRME
// (POST /insurances/{id}/offers). Codeoscopic sólo necesita el id de la
// cotización principal; devuelve una oferta con el precio ya en firme
// (estimate:false). Lo usa el agente desde "Crear presupuesto" para afinar
// el precio antes de guardarlo. Puede tardar >30s (llama a la aseguradora),
// por eso maxDuration=60.
const bodySchema = z
  .object({
    insuranceId: z.string().trim().min(1),
    quoteId: z.string().trim().min(1),
  })
  .strict();

type ReRatedOffer = {
  id?: string | number;
  totalPremium?: number;
  totalDownPayment?: number;
  mainQuote?: { premium?: number; downPayment?: number; estimate?: boolean };
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "presupuestos");
  if (!auth.ok) return auth.response;
  void params.id; // el re-rate va contra el insurance, no contra el lead; el id queda por trazabilidad de ruta

  if (!codeoscopicConfigured()) return NextResponse.json({ ok: false, reason: "not_configured" });

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });

  try {
    const offer = (await reRateOffer(parsed.data.insuranceId, { mainQuote: { id: parsed.data.quoteId } })) as ReRatedOffer;
    const premium = typeof offer.totalPremium === "number" ? offer.totalPremium
      : typeof offer.mainQuote?.premium === "number" ? offer.mainQuote.premium : null;
    const downPayment = typeof offer.totalDownPayment === "number" ? offer.totalDownPayment
      : typeof offer.mainQuote?.downPayment === "number" ? offer.mainQuote.downPayment : null;
    return NextResponse.json({
      ok: true,
      offerId: offer.id ?? null,
      premium,
      downPayment,
      estimate: offer.mainQuote?.estimate ?? false,
    });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[leads/codeoscopic-rerate] Codeoscopic falló:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "codeoscopic_error", status }, { status: 502 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
