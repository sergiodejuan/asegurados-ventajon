"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import type { SheetBlock } from "@/lib/sheetsReport";

type ReportOk = {
  ok: true; generatedAt: string; fetchedAt: string; spreadsheetName?: string; blocks: SheetBlock[]; cached: boolean;
};
type ApiResponse = {
  ok: boolean;
  configured: boolean;
  report: ReportOk | { ok: false; reason: string };
};

const REASON_LABELS: Record<string, string> = {
  not_configured: "La conexión con Google Sheets no está configurada todavía.",
  timeout: "La hoja tardó demasiado en responder. Inténtalo de nuevo.",
  fetch_error: "No se pudo contactar con el Web App de la hoja.",
  sheet_error: "El Web App de la hoja devolvió un error.",
};

export default function AdminInformesManychatPage() {
  return (
    <AdminShell active="informes-manychat">
      <ManychatReport />
    </AdminShell>
  );
}

function ManychatReport() {
  const { token } = useAdminToken();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/informes/manychat${refresh ? "?refresh=1" : ""}`, {
        headers: { "x-admin-token": token },
      });
      const body = (await res.json()) as ApiResponse;
      if (!res.ok) { setError("No se pudo cargar el informe."); return; }
      setData(body);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(false); }, [load]);

  const report = data?.report;
  const configured = data?.configured ?? false;

  return (
    <main className="mx-auto max-w-4xl px-5 py-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Leads ManyChat</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Dashboard de trazabilidad en vivo desde la hoja maestra de Google Sheets
            {report && report.ok && report.spreadsheetName ? ` (${report.spreadsheetName})` : ""}. Los datos se
            calculan en la propia hoja; aquí se leen de solo lectura, sin exponer las pestañas con datos personales.
          </p>
        </div>
        <button
          type="button" onClick={() => load(true)} disabled={loading}
          className="shrink-0 rounded-card border border-hair bg-white px-4 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-mist disabled:opacity-60"
        >
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {report && report.ok && (
        <p className="mt-2 text-[11px] text-slate2">
          Generado en la hoja: {fmt(report.generatedAt)} · Leído: {fmt(report.fetchedAt)}
          {report.cached ? " · desde caché (máx. 60 s)" : ""}
        </p>
      )}

      {loading && !data && <p className="mt-6 text-[14px] text-slate2">Cargando…</p>}
      {error && <p role="alert" className="mt-6 text-[13px] font-medium text-brand-red">{error}</p>}

      {data && !configured && <NotConfigured />}

      {data && configured && report && !report.ok && (
        <div className="mt-6 rounded-[20px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-[14px] font-bold text-amber-900">No se pudieron leer los datos</p>
          <p className="mt-1 text-[13px] leading-relaxed text-amber-800">
            {REASON_LABELS[report.reason] ?? `Motivo: ${report.reason}.`} Comprueba que el Web App de la hoja está
            publicado y que las variables SHEETS_WEBAPP_URL / SHEETS_WEBAPP_SECRET son correctas.
          </p>
        </div>
      )}

      {data && configured && report && report.ok && (
        <div className="mt-4 flex flex-col gap-6">
          {report.blocks.length === 0 && (
            <p className="text-[13px] text-slate2">La hoja respondió, pero no se encontró ninguna sección del dashboard.</p>
          )}
          {report.blocks.map((b) => (
            b.rows.length === 1
              ? <KpiBlock key={b.id} block={b} />
              : <TableBlock key={b.id} block={b} />
          ))}
        </div>
      )}
    </main>
  );
}

function KpiBlock({ block }: { block: SheetBlock }) {
  const row = block.rows[0] ?? [];
  return (
    <section className="rounded-[20px] border border-hair bg-white p-5">
      <h2 className="text-[14px] font-bold text-navy">{block.title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {block.headers.map((h, i) => (
          <div key={`${h}-${i}`} className="rounded-card border border-hair bg-mist/40 p-3">
            <p className="text-[19px] font-extrabold tnums text-navy">{row[i] || "—"}</p>
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate2">{h}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TableBlock({ block }: { block: SheetBlock }) {
  return (
    <section className="rounded-[20px] border border-hair bg-white p-5">
      <h2 className="text-[14px] font-bold text-navy">{block.title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-hair text-left">
              {block.headers.map((h, i) => (
                <th key={`${h}-${i}`} className={`py-2 pr-3 font-semibold text-slate2 ${i === 0 ? "" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, ri) => (
              <tr key={ri} className="border-b border-hair last:border-0">
                {block.headers.map((_, ci) => (
                  <td key={ci} className={`py-2 pr-3 align-top ${ci === 0 ? "font-medium text-ink" : "text-right tnums text-slate2"}`}>
                    {r[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NotConfigured() {
  return (
    <div className="mt-6 rounded-[20px] border border-hair bg-white p-6">
      <h2 className="text-[15px] font-extrabold text-navy">Conecta la hoja de Google Sheets</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-slate2">
        Este informe lee en vivo el DASHBOARD de la hoja maestra a través de un Web App de Google Apps Script,
        protegido por un secreto compartido. Pasos:
      </p>
      <ol className="mt-3 flex flex-col gap-2 text-[13px] leading-relaxed text-slate2">
        <li className="flex gap-2"><span className="font-bold text-navy">1.</span><span>En la hoja: <b className="text-ink">Extensiones → Apps Script</b>, pega el script de <code className="rounded bg-mist px-1 py-0.5 text-[12px]">docs/informe-manychat-google-sheets.md</code> y fija un <code className="rounded bg-mist px-1 py-0.5 text-[12px]">SECRET</code> en Propiedades del script.</span></li>
        <li className="flex gap-2"><span className="font-bold text-navy">2.</span><span><b className="text-ink">Implementar → Nueva implementación → Aplicación web</b>, ejecutar como tú, acceso «Cualquiera». Copia la URL <code className="rounded bg-mist px-1 py-0.5 text-[12px]">/exec</code>.</span></li>
        <li className="flex gap-2"><span className="font-bold text-navy">3.</span><span>En las variables de entorno del proyecto añade <code className="rounded bg-mist px-1 py-0.5 text-[12px]">SHEETS_WEBAPP_URL</code> (la URL) y <code className="rounded bg-mist px-1 py-0.5 text-[12px]">SHEETS_WEBAPP_SECRET</code> (el mismo secreto). Redespliega y pulsa «Actualizar».</span></li>
      </ol>
    </div>
  );
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}
