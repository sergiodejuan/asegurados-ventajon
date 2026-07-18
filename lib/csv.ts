// Escapado común para exportaciones CSV (leads, presupuestos…). Además de
// las comillas, neutraliza los caracteres que Excel/LibreOffice interpretan
// como inicio de fórmula (=, +, -, @, tab, retorno de carro) anteponiendo un
// apóstrofo — sin esto, un campo como nombre o email que llega de un
// formulario público (sin moderar) podría ejecutar una fórmula/macro en el
// equipo del agente que abra el CSV (CSV/Formula Injection, CWE-1236).
const FORMULA_LEADING_CHARS = ["=", "+", "-", "@", "\t", "\r"];

export function csvField(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (FORMULA_LEADING_CHARS.some((c) => s.startsWith(c))) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
