import { NextResponse } from "next/server";
import { manychatAuthFail } from "@/lib/manychatAuth";
import { rateLimitFail } from "@/lib/rateLimit";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError, getInsurance } from "@/lib/codeoscopic";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// POST /api/manychat/salud-coverages
// Devuelve el detalle de coberturas de la oferta ganadora ya formateado
// como texto listo para WhatsApp (sin markdown ni HTML, sólo saltos de
// línea, viñetas ASCII y emojis). ManyChat lo pinta directamente con un
// merge tag {{coberturas_texto}}.
// Body:
// { "insuranceId": "40307819", "quoteId": "..." }
// Autenticación: header `x-manychat-secret` (MANYCHAT_WEBHOOK_SECRET).

type Body = { insuranceId?: string; quoteId?: string };

type CoverageItem = {
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
type CoveragesResponse = CoverageItem[] | { items?: CoverageItem[]; coverages?: CoverageItem[] };

type ResponseShape = {
  ok: boolean;
  estado: "ok" | "no_encontrado" | "no_configurado" | "error";
  mensaje: string;
  totalCubiertas: number;
  totalNoCubiertas: number;
  error?: string;
};

function extractItems(body: CoveragesResponse): CoverageItem[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.coverages)) return body.coverages;
  return [];
}

// WhatsApp no soporta markdown ni tablas; sólo texto plano, negritas con
// *asterisco simple*, saltos de línea. Los emojis son universales. El
// límite duro de un mensaje WhatsApp por Cloud API es 4096 caracteres —
// truncamos a ~3800 para dejar margen de seguridad.
const MAX_LEN = 3800;

function formatCoveragesText(items: CoverageItem[]): { texto: string; cubiertas: number; noCubiertas: number } {
  // Agrupa por categoría para que salga ordenado en el mensaje.
  const buckets = new Map<string, CoverageItem[]>();
  for (const c of items) {
    const cat = c.category?.name?.trim() || c.group?.name?.trim() || "Otras coberturas";
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(c);
  }

  let cubiertas = 0, noCubiertas = 0;
  const lines: string[] = [];
  for (const [categoria, listItems] of buckets) {
    lines.push(`\n*${categoria}*`);
    for (const c of listItems) {
      const isCovered = c.covered !== undefined ? !!c.covered : c.included !== undefined ? !!c.included : true;
      isCovered ? cubiertas++ : noCubiertas++;
      const nombre = c.name?.trim() || "—";
      const limite = c.limit == null ? "" : typeof c.limit === "number" ? `${c.limit}€` : String(c.limit);
      const copagoRaw = c.coPayment ?? c.copayment;
      const copago = copagoRaw == null ? "" : typeof copagoRaw === "number" ? `${copagoRaw}€` : String(copagoRaw);
      const detalles: string[] = [];
      if (limite) detalles.push(`hasta ${limite}`);
      if (copago) detalles.push(`copago ${copago}`);
      const sufijo = detalles.length ? ` (${detalles.join(" · ")})` : "";
      lines.push(`${isCovered ? "✅" : "❌"} ${nombre}${sufijo}`);
    }
  }

  let texto = lines.join("\n").trim();
  if (texto.length > MAX_LEN) {
    texto = texto.slice(0, MAX_LEN - 60).trimEnd() +
      "\n\n… (lista completa disponible con un asesor)";
  }
  return { texto, cubiertas, noCubiertas };
}

function respond(payload: ResponseShape, status = 200) {
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  const denied = manychatAuthFail(request);
  if (denied) return denied;

  const rl = await rateLimitFail(request, { bucket: "manychat-salud-coverages", limit: 30, windowSeconds: 3600 });
  if (rl) return rl;

  let body: Body;
  try { body = await request.json(); }
  catch {
    return respond({
      ok: false, estado: "error", error: "Cuerpo no válido.",
      mensaje: "Ups, no pude cargar las coberturas. Un asesor te las envía enseguida.",
      totalCubiertas: 0, totalNoCubiertas: 0,
    }, 400);
  }

  const insuranceId = (body.insuranceId ?? "").toString().trim();
  const quoteId = (body.quoteId ?? "").toString().trim();
  if (!insuranceId || !quoteId) {
    return respond({
      ok: false, estado: "error", error: "Faltan insuranceId o quoteId.",
      mensaje: "No encuentro tu cotización. Escríbenos otra vez para calcularla.",
      totalCubiertas: 0, totalNoCubiertas: 0,
    }, 400);
  }

  if (!codeoscopicConfigured()) {
    return respond({
      ok: true, estado: "no_configurado",
      mensaje: "Un asesor te enviará el detalle completo de coberturas por aquí mismo en unos minutos.",
      totalCubiertas: 0, totalNoCubiertas: 0,
    });
  }

  try {
    // 1) Resolvemos el offerId a partir del insurance + quoteId (mismo
    // patrón que /api/quote/[id]/coverages para no divergir).
    const insurance = await getInsurance(insuranceId);
    const offer = (insurance.offers ?? []).find(
      (o) =>
        String(o.mainQuote?.id ?? "") === quoteId ||
        (o.addonQuotes ?? []).some((a) => String(a?.id ?? "") === quoteId)
    );
    if (!offer?.id) {
      return respond({
        ok: false, estado: "no_encontrado",
        mensaje: "No encuentro esa oferta. Un asesor te envía las coberturas ahora mismo.",
        totalCubiertas: 0, totalNoCubiertas: 0,
      }, 404);
    }

    // 2) Coberturas del offer.
    const coveragesRaw = await codeoscopicFetch<CoveragesResponse>(
      `/insurances/${encodeURIComponent(insuranceId)}/offers/${encodeURIComponent(String(offer.id))}/coverages`,
    );
    const items = extractItems(coveragesRaw);
    if (!items.length) {
      return respond({
        ok: true, estado: "no_encontrado",
        mensaje: "Todavía no están las coberturas disponibles. Un asesor te las envía en breve.",
        totalCubiertas: 0, totalNoCubiertas: 0,
      });
    }

    const { texto, cubiertas, noCubiertas } = formatCoveragesText(items);
    const mensaje =
      `📋 *Coberturas incluidas en tu tarifa* (${cubiertas} incluidas${noCubiertas ? `, ${noCubiertas} no incluidas` : ""})\n${texto}\n\n¿Quieres que un asesor te llame para explicarte alguna en detalle?`;

    return respond({
      ok: true, estado: "ok", mensaje,
      totalCubiertas: cubiertas, totalNoCubiertas: noCubiertas,
    });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[manychat/salud-coverages] Codeoscopic falló:", (err as Error).message, "status", status);
    return respond({
      ok: false, estado: "error", error: (err as Error).message,
      mensaje: "Ups, no puedo consultar las coberturas ahora mismo. Un asesor te las envía enseguida.",
      totalCubiertas: 0, totalNoCubiertas: 0,
    });
  }
}
