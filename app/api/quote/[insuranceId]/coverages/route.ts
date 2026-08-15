import { NextRequest, NextResponse } from "next/server";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError } from "@/lib/codeoscopic";
import { rateLimitFail } from "@/lib/rateLimit";

// Endpoint público (rate-limited): dado un insuranceId y un quoteId,
// resuelve el offerId correspondiente y devuelve el detalle normalizado
// de coberturas. La comparativa lo consume desde el modal "Ver coberturas"
// de cada tarjeta real.
//
// Codeoscopic requiere dos llamadas: primero listar /insurances/{id}/offers
// para encontrar el offer que agrupa la cotización pedida (los offers son
// combinaciones "cotización principal + complementarios"), luego llamar a
// /insurances/{id}/offers/{offerId}/coverages con el offer resuelto.
// Encapsulando esto en un solo endpoint server-side ahorramos una petición
// desde el navegador y evitamos exponer el mapping interno a la vista.
export const maxDuration = 20;

type CodeoscopicOffer = {
  id: string;
  mainQuote?: { id?: string };
  addonQuotes?: { id?: string }[];
};

type CodeoscopicCoverageItem = {
  name?: string;
  description?: string;
  covered?: boolean;
  included?: boolean;
  limit?: number | string;
  coPayment?: number | string;
  copayment?: number | string;
  category?: { name?: string };
  group?: { name?: string };
};

type CodeoscopicCoveragesResponse = CodeoscopicCoverageItem[] | { items?: CodeoscopicCoverageItem[]; coverages?: CodeoscopicCoverageItem[] };

// Shape normalizado que consume el frontend — agrupado por categoría para
// pintar acordeón/secciones en el modal.
export type CoverageGroup = {
  categoria: string;
  items: {
    concepto: string;
    descripcion: string;
    cubierto: boolean;
    limite: string;
    copago: string;
  }[];
};

function extractItems(body: CodeoscopicCoveragesResponse): CodeoscopicCoverageItem[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.coverages)) return body.coverages;
  return [];
}

function normalizeGroups(raw: CodeoscopicCoverageItem[]): CoverageGroup[] {
  const buckets = new Map<string, CoverageGroup>();
  for (const c of raw) {
    const categoria = c.category?.name?.trim() || c.group?.name?.trim() || "Coberturas";
    const cubierto = c.covered !== undefined ? !!c.covered : c.included !== undefined ? !!c.included : true;
    const limite = c.limit == null ? "" : typeof c.limit === "number" ? `${c.limit} €` : String(c.limit);
    const copagoRaw = c.coPayment ?? c.copayment;
    const copago = copagoRaw == null ? "" : typeof copagoRaw === "number" ? `${copagoRaw} €` : String(copagoRaw);
    const g = buckets.get(categoria) ?? { categoria, items: [] };
    g.items.push({
      concepto: c.name?.trim() || "—",
      descripcion: c.description?.trim() || "",
      cubierto,
      limite,
      copago,
    });
    buckets.set(categoria, g);
  }
  return Array.from(buckets.values());
}

export async function GET(req: NextRequest, ctx: { params: { insuranceId: string } }) {
  const { insuranceId } = ctx.params;
  const quoteId = req.nextUrl.searchParams.get("quoteId") ?? "";
  if (!insuranceId || !quoteId) {
    return NextResponse.json({ ok: false, reason: "missing_ids" }, { status: 400 });
  }
  if (!codeoscopicConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }
  const limited = await rateLimitFail(req, { bucket: "quote-coverages", limit: 30, windowSeconds: 60 });
  if (limited) return limited;

  try {
    // 1) offers del insurance
    const offersRaw = await codeoscopicFetch<CodeoscopicOffer[] | { items?: CodeoscopicOffer[] }>(
      `/insurances/${encodeURIComponent(insuranceId)}/offers`
    );
    const offers: CodeoscopicOffer[] = Array.isArray(offersRaw) ? offersRaw : Array.isArray(offersRaw.items) ? offersRaw.items : [];
    const offer = offers.find(
      (o) => o.mainQuote?.id === quoteId || (o.addonQuotes ?? []).some((a) => a?.id === quoteId)
    );
    if (!offer?.id) {
      return NextResponse.json({ ok: false, reason: "offer_not_found" }, { status: 404 });
    }

    // 2) coberturas del offer
    const coveragesRaw = await codeoscopicFetch<CodeoscopicCoveragesResponse>(
      `/insurances/${encodeURIComponent(insuranceId)}/offers/${encodeURIComponent(offer.id)}/coverages`
    );
    const grupos = normalizeGroups(extractItems(coveragesRaw));
    return NextResponse.json({ ok: true, insuranceId, quoteId, offerId: offer.id, grupos });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[quote/coverages] Codeoscopic falló:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "codeoscopic_error", status }, { status: 502 });
  }
}
