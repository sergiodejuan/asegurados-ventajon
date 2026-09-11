// Lectura del informe "Leads ManyChat" desde la hoja de Google Sheets
// (BBDD_Asegurados_Ventajon_Leads_Maestro_V3), vía un Web App de Google Apps
// Script publicado en la propia hoja y protegido por un secreto compartido.
// El navegador NUNCA habla con Google: este módulo corre en el servidor
// (lo usa app/api/admin/informes/manychat), guarda el secreto en variables de
// entorno y sirve el resultado ya normalizado al panel admin. "Tiempo real" =
// se consulta al abrir el informe, con una caché corta en memoria y un botón
// de actualizar que la salta.
// Ver docs/informe-manychat-google-sheets.md para el código del Apps Script y
// cómo desplegarlo. Sin las variables SHEETS_WEBAPP_URL / SHEETS_WEBAPP_SECRET
// el informe simplemente muestra el estado "no configurado" (no rompe nada).

// Un bloque = una tabla del DASHBOARD (KPIs globales, por origen, por
// producto, por intención). Genérico a propósito: el Apps Script detecta cada
// sección por su título y devuelve cabeceras + filas tal cual, así que si se
// reordenan columnas en la hoja el informe se adapta sin tocar código.
export type SheetBlock = {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
};

export type ManychatReportOk = {
  ok: true;
  generatedAt: string;      // ISO, cuándo lo generó el Apps Script
  fetchedAt: string;        // ISO, cuándo lo leyó la web (para la caché)
  spreadsheetName?: string;
  blocks: SheetBlock[];
  cached: boolean;
};
export type ManychatReportErr = { ok: false; reason: string };
export type ManychatReport = ManychatReportOk | ManychatReportErr;

export function sheetsReportConfigured(): boolean {
  return !!(process.env.SHEETS_WEBAPP_URL && process.env.SHEETS_WEBAPP_SECRET);
}

const CACHE_TTL_MS = 60_000;
let cache: { at: number; data: Omit<ManychatReportOk, "cached"> } | null = null;

function coerceBlocks(raw: unknown): SheetBlock[] {
  if (!Array.isArray(raw)) return [];
  const blocks: SheetBlock[] = [];
  for (const b of raw) {
    if (!b || typeof b !== "object") continue;
    const o = b as Record<string, unknown>;
    const headers = Array.isArray(o.headers) ? o.headers.map((h) => String(h ?? "")) : [];
    const rows = Array.isArray(o.rows)
      ? o.rows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : []))
      : [];
    blocks.push({
      id: String(o.id ?? o.title ?? `block-${blocks.length}`),
      title: String(o.title ?? ""),
      headers,
      rows,
    });
  }
  return blocks;
}

/**
 * Lee el informe desde el Web App de Apps Script. `refresh` salta la caché.
 * Nunca lanza: devuelve { ok:false, reason } ante cualquier problema.
 */
export async function fetchManychatReport(opts: { refresh?: boolean } = {}): Promise<ManychatReport> {
  const url = process.env.SHEETS_WEBAPP_URL;
  const secret = process.env.SHEETS_WEBAPP_SECRET;
  if (!url || !secret) return { ok: false, reason: "not_configured" };

  if (!opts.refresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { ...cache.data, cached: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);
  try {
    const target = `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(secret)}`;
    const res = await fetch(target, {
      method: "GET",
      redirect: "follow", // Apps Script responde con un 302 a googleusercontent
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };

    const body = (await res.json()) as Record<string, unknown>;
    if (body.ok === false) return { ok: false, reason: String(body.reason ?? "sheet_error") };

    const data: Omit<ManychatReportOk, "cached"> = {
      ok: true,
      generatedAt: String(body.generatedAt ?? new Date().toISOString()),
      fetchedAt: new Date().toISOString(),
      spreadsheetName: body.spreadsheetName ? String(body.spreadsheetName) : undefined,
      blocks: coerceBlocks(body.blocks),
    };
    cache = { at: Date.now(), data };
    return { ...data, cached: false };
  } catch (e) {
    const reason = e instanceof Error && e.name === "AbortError" ? "timeout" : "fetch_error";
    return { ok: false, reason };
  } finally {
    clearTimeout(timeout);
  }
}
