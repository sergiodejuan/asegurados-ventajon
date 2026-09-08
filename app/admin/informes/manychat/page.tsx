"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type Kpi = { label: string; value: string; hint?: string };
type Section = { title: string; columns: string[]; rows: string[][] };
type Report = { generatedAt: string; kpis: Kpi[]; sections: Section[] };

function fmtWhen(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminManychatInformePage() {
  return (
    <AdminShell active="informes-manychat">
      <ManychatDashboard />
    </AdminShell>
  );
}

function ManychatDashboard() {
  const { token } = useAdminToken();
  const [report, setReport] = useState<Report | null>(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/informes/manychat${refresh ? "?refresh=1" : ""}`, {
          headers: { "x-admin-token": token },
        });
        const body = await res.json();
        if (!res.ok || !body.ok) {
          setConfigured(body.configured !== false);
          setError(body.error ?? "No se pudo cargar el informe.");
          setLoading(false);
          return;
        }
        setConfigured(body.configured !== false);
        setReport(body.configured === false ? null : (body.report as Report));
      } catch {
        setError("Error de conexión.");
      }
      setLoading(false);
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-6 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Leads ManyChat</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate2">
            Dashboard de trazabilidad en vivo desde la hoja maestra de Google Sheets. Los datos se calculan en la propia
            hoja; aquí se leen de solo lectura, sin exponer las pestañas con datos personales.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading}
          className="shrink-0 rounded-pill border border-navy px-4 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {report && (
        <p className="mt-2 text-[11px] text-slate2">Actualizado: {fmtWhen(report.generatedAt)}</p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-brand-red/5 px-4 py-3 text-[13px] font-medium text-brand-red-deep">{error}</p>
      )}

      {!configured && <ConnectCard />}

      {loading && !report && configured && (
        <p className="mt-6 text-center text-[14px] text-slate2">Cargando…</p>
      )}

      {report && (
        <>
          {report.kpis.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {report.kpis.map((k, i) => (
                <div key={`${k.label}:${i}`} className="rounded-card border border-hair bg-white p-3">
                  <p className="text-[20px] font-extrabold tnums text-navy">{k.value || "—"}</p>
                  <p className="truncate text-[11px] font-medium text-slate2" title={k.label}>
                    {k.label}
                  </p>
                  {k.hint && <p className="mt-0.5 truncate text-[10px] text-slate2/80" title={k.hint}>{k.hint}</p>}
                </div>
              ))}
            </div>
          )}

          {report.sections.map((s, i) => (
            <section key={`${s.title}:${i}`} className="mt-6">
              {s.title && <h2 className="text-[15px] font-bold text-navy">{s.title}</h2>}
              {s.rows.length === 0 ? (
                <p className="mt-2 text-[13px] text-slate2">Sin datos.</p>
              ) : (
                <div className="mt-3 max-h-[480px] overflow-auto rounded-card border border-hair bg-white">
                  <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
                    {s.columns.length > 0 && (
                      <thead className="sticky top-0 bg-mist text-[11px] font-bold uppercase tracking-wide text-slate2">
                        <tr>
                          {s.columns.map((c, ci) => (
                            <th key={ci} className="px-4 py-3">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {s.rows.map((r, ri) => (
                        <tr key={ri} className="border-t border-hair">
                          {r.map((cell, ci) => (
                            <td key={ci} className="px-4 py-3 text-ink">
                              {cell || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          {report.kpis.length === 0 && report.sections.length === 0 && (
            <p className="mt-6 text-[13px] text-slate2">
              El Web App respondió correctamente pero la hoja no devolvió KPIs ni tablas. Revisa la pestaña DASHBOARD y
              el rango que publica el script.
            </p>
          )}
        </>
      )}
    </main>
  );
}

function ConnectCard() {
  return (
    <section className="mt-5 rounded-card border border-hair bg-white p-5">
      <h2 className="text-[15px] font-bold text-navy">Conecta la hoja de Google Sheets</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Este informe lee en vivo el DASHBOARD de la hoja maestra a través de un Web App de Google Apps Script, protegido
        por un secreto compartido. Pasos:
      </p>
      <ol className="mt-3 flex flex-col gap-3 text-[13px] leading-relaxed text-ink">
        <li className="flex gap-2">
          <span className="font-bold text-navy">1.</span>
          <span>
            En la hoja: <strong>Extensiones → Apps Script</strong>, pega el script de{" "}
            <code className="rounded bg-mist px-1 py-0.5 text-[12px]">docs/informe-manychat-google-sheets.md</code> y fija
            un <code className="rounded bg-mist px-1 py-0.5 text-[12px]">SECRET</code> en Propiedades del script.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-navy">2.</span>
          <span>
            <strong>Implementar → Nueva implementación → Aplicación web</strong>, ejecutar como tú, acceso «Cualquiera».
            Copia la URL <code className="rounded bg-mist px-1 py-0.5 text-[12px]">/exec</code>.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-navy">3.</span>
          <span>
            En las variables de entorno del proyecto añade{" "}
            <code className="rounded bg-mist px-1 py-0.5 text-[12px]">SHEETS_WEBAPP_URL</code> (la URL) y{" "}
            <code className="rounded bg-mist px-1 py-0.5 text-[12px]">SHEETS_WEBAPP_SECRET</code> (el mismo secreto).
            Redespliega y pulsa «Actualizar».
          </span>
        </li>
      </ol>
    </section>
  );
}
