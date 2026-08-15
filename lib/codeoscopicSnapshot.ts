// Extrae del payload crudo de Codeoscopic (POST /insurances y
// GET /insurances/{id}) el snapshot mínimo que consumen el frontend de la
// comparativa y el back office. Vive en su propio módulo para no duplicar
// el parseo en app/api/quote/create y app/api/quote/[insuranceId], y para
// que la UI cliente pueda leer el mismo tipo desde el store.
//
// La forma completa que devuelve Codeoscopic es amplia y con opcionales;
// aquí colapsamos a lo que la web realmente pinta: compañía, producto,
// modalidad, premium, downPayment, frecuencia y flag estimate.

import type { CodeoscopicInsurance, CodeoscopicQuote } from "./codeoscopic";
import type { CodeoscopicQuoteSummary } from "./store";

export type CodeoscopicSnapshotSummary = {
  insuranceId: string;
  done: boolean;
  quotes: CodeoscopicQuoteSummary[];
};

function summarizeQuote(q: CodeoscopicQuote): CodeoscopicQuoteSummary | null {
  if (!q?.id) return null;
  const compania = q.product?.vendor?.name?.trim() || "";
  const modalidad = q.product?.modality?.name?.trim() || "";
  return {
    id: q.id,
    compania: compania || q.product?.name?.trim() || "Compañía",
    producto: q.product?.name?.trim() || "",
    modalidad,
    premium: typeof q.premium === "number" ? q.premium : null,
    downPayment: typeof q.downPayment === "number" ? q.downPayment : null,
    frequency: q.paymentFrequency?.id ?? "",
    estimate: !!q.estimate,
  };
}

export function summarizeInsurance(snapshot: CodeoscopicInsurance): CodeoscopicSnapshotSummary {
  const raw = [...(snapshot.mainQuotes ?? []), ...(snapshot.addonQuotes ?? [])];
  const quotes: CodeoscopicQuoteSummary[] = [];
  for (const q of raw) {
    const s = summarizeQuote(q);
    if (s) quotes.push(s);
  }
  const done = quotes.length > 0 && quotes.every((q) => q.premium != null && !q.estimate);
  return { insuranceId: snapshot.id, quotes, done };
}
