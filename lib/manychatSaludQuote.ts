// Lógica de la tarificación de salud por WhatsApp (ManyChat), paso único
// POST /api/manychat/salud-quote: arranca el cálculo en Codeoscopic y
// devuelve la mejor oferta firme que haya llegado dentro del presupuesto
// síncrono.
// ¿Por qué un presupuesto? ManyChat aborta cualquier "External Request" a
// los ~10 s (timeout de plataforma, NO configurable — el error que ve el
// usuario es "Operation timed out after 10002 milliseconds with 0 bytes
// received"). Codeoscopic, en cambio, tarda entre 3 y 40 s en tener firmes
// TODAS las compañías (Generali ~3-5 s; Adeslas/Asisa 15-30 s). No se puede
// esperar a todas dentro de la petición síncrona: respondemos rápido con la
// más barata que haya llegado y, si aún no hay ninguna, con "calculando".

import { codeoscopicFetch, type CodeoscopicInsurance } from "@/lib/codeoscopic";
import { summarizeInsurance } from "@/lib/codeoscopicSnapshot";
import type { CodeoscopicQuoteSummary } from "@/lib/store";
import { createQuoteAccessToken } from "@/lib/quoteTokens";
import { SITE_URL } from "@/lib/brand";
import { clasificaCopagoTexto, copagoChip, type CopagoModo } from "@/lib/catalog";

// ManyChat corta la External Request a los ~10 s. Dejamos un colchón amplio
// para el viaje de red y la serialización: la respuesta síncrona debe salir
// MUY por debajo de ese límite. 8,5 s desde que entra la petición (incluye el
// POST /insurances) es el techo seguro. Si a esa altura no hay oferta firme,
// se responde "calculando" y el follow-up humano cierra.
export const MANYCHAT_SYNC_BUDGET_MS = 8_500;

// Respuesta pensada para ManyChat: solo campos escalares y un mensaje ya
// formateado. Los arrays de ManyChat son incómodos de iterar en su UI.
export type ResponseShape = {
  ok: boolean;
  mensaje: string;
  leadId: string;
  insuranceId: string;
  quoteId: string;       // id de la cotización ganadora, para /coverages
  estado: "cotizado" | "calculando" | "faltan_datos" | "error";
  compania: string;
  producto: string;
  precio: number | null; // €/mes
  precioTexto: string;   // "23,45€/mes" o "" si no hay
  // Modalidad de copago DEDUCIDA del nombre de la modalidad de Codeoscopic
  // (ver clasificaCopagoTexto). Merge tags para el flow:
  // `copago`: "con" | "sin" | "ambas" | "" (vacío = no se pudo deducir).
  // `copagoEtiqueta`: chip listo para pintar ("Con copago"/"Sin copagos"/
  // "Con y sin copago") o "" si no consta.
  // Útil para contrastar con el siguiente mensaje (opciones negociadas de
  // Asegurados Ventajón, sin copagos).
  copago?: CopagoModo | "";
  copagoEtiqueta?: string;
  // URL firmada que puede enviarse por WhatsApp para abrir la comparativa
  // completa con los datos ya precargados (sin volver a pedir al usuario).
  // TTL 30 días. Sólo se rellena cuando hay `leadId`.
  urlComparativa: string;
  error?: string;
};

export function fmtEUR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return `${n.toFixed(2).replace(".", ",")}€/mes`;
}

// Construye el link firmado a /comparativa que el flow envía por WhatsApp.
// El token cifra el leadId; la comparativa lo intercambia por el `quote`
// hidratado — el usuario NO vuelve a introducir sus datos.
export function buildComparativaUrl(leadId: string): string {
  if (!leadId) return "";
  try {
    const token = createQuoteAccessToken(leadId);
    const base = SITE_URL.replace(/\/+$/, "");
    return `${base}/comparativa?producto=salud&token=${encodeURIComponent(token)}`;
  } catch (err) {
    // Sin QUOTE_TOKEN_SECRET en prod: no devolvemos URL — el asesor
    // toma el relevo. Nunca respondemos con un link sin firmar.
    console.error("[manychat/salud-quote] no se pudo firmar token:", (err as Error).message);
    return "";
  }
}

// De todas las ofertas del snapshot, quédate con la más barata firme
// (`estimate=false, premium>0`). Si no hay firmes, cae a la estimada más
// barata; si ni eso, devuelve null.
export function pickBestQuote(quotes: CodeoscopicQuoteSummary[]): CodeoscopicQuoteSummary | null {
  const firm = quotes.filter((q) => !q.estimate && typeof q.premium === "number" && q.premium! > 0);
  const bucket = firm.length ? firm : quotes.filter((q) => typeof q.premium === "number" && q.premium! > 0);
  if (!bucket.length) return null;
  return [...bucket].sort((a, b) => (a.premium ?? Infinity) - (b.premium ?? Infinity))[0];
}

function countFirm(quotes: CodeoscopicQuoteSummary[]): number {
  return quotes.filter((q) => !q.estimate && typeof q.premium === "number" && q.premium! > 0).length;
}

// Codeoscopic va devolviendo cada aseguradora en momentos distintos
// (Generali suele responder la primera, ~3-5s; Adeslas/Asisa pueden
// tardar 15-30s). Devolver la primera firme que aparece sesgaría siempre
// el resultado a Generali. Estrategia:
// 1) Poll cada `pollMs` hasta que summary.done === true (todas firmes), o
// 2) mínimo `minWaitMs` de espera aunque ya haya alguna firme, para
// dar tiempo a que lleguen las otras compañías, o
// 3) ya llegaron `minFirmQuotes` compañías firmes.
// Luego devuelve la MÁS BARATA entre todas las firmes que hayan llegado.
// Timeout duro en `deadlineMs`: pasado ese punto, devolvemos lo que
// tengamos (o null si no llegó ninguna). El `deadlineMs` lo fija quien
// llama para no pasarse del presupuesto de ManyChat (ver MANYCHAT_SYNC_BUDGET_MS).
export async function waitForBestQuote(
  insuranceId: string,
  deadlineMs: number,
  opts: { minWaitMs?: number; minFirmQuotes?: number; pollMs?: number } = {},
): Promise<CodeoscopicQuoteSummary | null> {
  const minWaitMs = opts.minWaitMs ?? 5_000;     // margen para 2-3 aseguradoras dentro del presupuesto síncrono
  const minFirmQuotes = opts.minFirmQuotes ?? 3; // 3 firmes = suficiente para elegir barata sin agotar el tiempo
  const pollMs = opts.pollMs ?? 1_500;
  const started = Date.now();
  let best: CodeoscopicQuoteSummary | null = null;

  while (Date.now() < deadlineMs) {
    try {
      const snap = await codeoscopicFetch<CodeoscopicInsurance>(`/insurances/${encodeURIComponent(insuranceId)}`);
      const summary = summarizeInsurance(snap);
      const current = pickBestQuote(summary.quotes);
      if (current) best = current;
      const firmCount = countFirm(summary.quotes);
      const elapsed = Date.now() - started;
      const okToReturn = summary.done || firmCount >= minFirmQuotes || (best && elapsed >= minWaitMs);
      if (okToReturn && best) return best;
    } catch (err) {
      console.error("[manychat/salud-quote] poll fallo:", (err as Error).message);
    }
    // No duermas más allá del deadline: evita un ciclo entero de espera
    // que haría a ManyChat cortar la conexión antes de que respondamos.
    if (Date.now() + pollMs >= deadlineMs) break;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return best;
}

export function buildQuoteResponse(leadId: string, insuranceId: string, best: CodeoscopicQuoteSummary): ResponseShape {
  const precio = typeof best.premium === "number" ? best.premium : null;
  const precioTexto = fmtEUR(precio);
  const compania = best.compania || "";
  const producto = best.producto || "";

  // Copago deducido del nombre de la modalidad/producto/categoría. Puede ser
  // null si Codeoscopic no lo declara en el texto — en ese caso no lo pintamos.
  const modo = clasificaCopagoTexto(`${best.producto} ${best.modalidad} ${best.categoria ?? ""}`);
  const copagoEtiqueta = modo ? copagoChip(modo) : "";
  // Línea de copago para el mensaje: destacamos "con copago" (es la palanca
  // para presentar luego las opciones negociadas SIN copagos) y confirmamos
  // "sin copagos" cuando ya lo es.
  const copagoLinea = modo === "con"
    ? "\n• ⚠️ Modalidad *con copago* (pagas una parte por cada visita o prueba)"
    : modo === "sin"
      ? "\n• ✅ Modalidad *sin copagos* (no pagas por cada visita)"
      : modo === "ambas"
        ? "\n• Disponible *con y sin copago*"
        : "";

  const mensaje = precio != null
    ? `Tu mejor tarifa ahora mismo:\n\n• ${compania}${producto ? ` — ${producto}` : ""}\n• Desde ${precioTexto}${copagoLinea}\n\n¿Quieres que un asesor te cierre la póliza con esta compañía?`
    : `Tenemos oferta de ${compania}${producto ? ` (${producto})` : ""} pero necesito confirmar el precio. Un asesor te lo envía enseguida.`;
  const urlComparativa = buildComparativaUrl(leadId);
  const mensajeConLink = urlComparativa
    ? `${mensaje}\n\n🔗 Ver todas las opciones y coberturas: ${urlComparativa}`
    : mensaje;
  return {
    ok: true, estado: "cotizado", leadId, insuranceId,
    compania, producto, precio, precioTexto, mensaje: mensajeConLink,
    copago: modo ?? "", copagoEtiqueta,
    quoteId: String(best.id ?? ""),
    urlComparativa,
  };
}
