import { NextResponse } from "next/server";
import { z } from "zod";
import { requireModule } from "@/lib/agentAuth";
import {
  codeoscopicConfigured,
  getInsurance,
  reRateOffer,
  createInsuranceReport,
  codeoscopicDownload,
  CodeoscopicError,
} from "@/lib/codeoscopic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Genera el informe PDF de ofertas de Codeoscopic (con coberturas + IPID) y
// lo devuelve como application/pdf para que el agente lo abra o lo adjunte al
// presupuesto. Flujo:
//   1) Resolver el offerId a partir del quoteId (las ofertas empaquetan la
//      cotización principal). Si no existe todavía, se re-tarifica para crear
//      una (POST /offers).
//   2) POST /insurances/{id}/reports → devuelve una url del informe.
//   3) Descargar esa url con el token (codeoscopicDownload) y hacer de proxy:
//      el PDF requiere Authorization, así que el navegador nunca lo baja solo.
const bodySchema = z
  .object({
    insuranceId: z.string().trim().min(1),
    quoteId: z.string().trim().min(1),
  })
  .strict();

async function resolveOfferId(insuranceId: string, quoteId: string): Promise<string | number | null> {
  const insurance = await getInsurance(insuranceId);
  const offer = (insurance.offers ?? []).find(
    (o) => String(o.mainQuote?.id ?? "") === quoteId || (o.addonQuotes ?? []).some((a) => String(a?.id ?? "") === quoteId)
  );
  if (offer?.id != null) return offer.id;
  // Sin oferta pre-empaquetada: re-tarificar crea una y devuelve su id.
  const reRated = (await reRateOffer(insuranceId, { mainQuote: { id: quoteId } })) as { id?: string | number };
  return reRated.id ?? null;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "presupuestos");
  if (!auth.ok) return auth.response;
  void params.id;

  if (!codeoscopicConfigured()) return NextResponse.json({ ok: false, reason: "not_configured" });

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });

  try {
    const offerId = await resolveOfferId(parsed.data.insuranceId, parsed.data.quoteId);
    if (offerId == null) return NextResponse.json({ ok: false, reason: "offer_not_found" }, { status: 404 });

    const report = await createInsuranceReport(parsed.data.insuranceId, {
      type: "Offers",
      offerIds: [offerId],
      includeCoverages: true,
      includePremiumBreakdown: true,
      includeIpid: true,
    });
    if (!report.url) return NextResponse.json({ ok: false, reason: "report_sin_url" }, { status: 502 });

    const { bytes, contentType } = await codeoscopicDownload(report.url);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="informe-codeoscopic-${parsed.data.insuranceId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[leads/codeoscopic-report] Codeoscopic falló:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "codeoscopic_error", status }, { status: 502 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
