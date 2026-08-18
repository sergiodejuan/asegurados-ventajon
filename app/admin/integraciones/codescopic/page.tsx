"use client";

import { useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { IntegracionesSectionHeader } from "@/components/admin/IntegracionesSectionHeader";
import { ConnectionBanner } from "@/components/admin/ConnectionBanner";
import { IntegrationTestButton } from "@/components/admin/IntegrationTestButton";
import { useIntegrationStatus } from "@/components/admin/useIntegrationStatus";
import { CODESCOPIC_FIELD_MAP, CODESCOPIC_ENV_VARS, CODESCOPIC_PAYLOAD_SAMPLE } from "@/lib/integrationsCatalog";

export default function AdminIntegracionesCodescopicPage() {
  return (
    <AdminShell active="integraciones-codescopic">
      <CodescopicAdmin />
    </AdminShell>
  );
}

function CodescopicAdmin() {
  const { status, loading, error } = useIntegrationStatus();

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-16">
      <IntegracionesSectionHeader
        title="Codeoscopic"
        description="Motor de tarificación externo (Avant2/Integra) para calcular precios reales de salud en vez de la estimación orientativa del catálogo."
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {!loading && status && (
        status.codescopic.configured ? (
          <ConnectionBanner status="ok" title="Variables de entorno configuradas" detail="La web ya cotiza salud en tiempo real (crear proyecto, sondear precios, coberturas y logos). Usa el catálogo de abajo para verificar qué líneas y compañías tienes activas en tu cuenta." />
        ) : (
          <ConnectionBanner status="off" title="No conectado — faltan credenciales" detail={`Faltan: ${status.codescopic.missing.join(", ")}. Sin estas variables, la comparativa cae al catálogo mock (no se llama a Codeoscopic).`} />
        )
      )}
      <IntegrationTestButton target="codescopic" label="Probar conexión con CODESCOPIC_BASE_URL" />

      {!loading && status?.codescopic.configured && <CatalogPanel />}

      <section className="mt-6 rounded-[20px] border border-hair bg-white p-5">
        <h2 className="text-[15px] font-bold text-navy">Cómo funciona la tarificación de salud</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-slate2">
          <li>El lead completa el tarificador y el gate de <code className="rounded bg-mist px-1 py-0.5 text-[12px]">/comparativa</code> (incl. DNI/NIE del titular, obligatorio para tarificar).</li>
          <li>La web crea el proyecto con <code className="rounded bg-mist px-1 py-0.5 text-[12px]">POST /insurances</code> y sondea precios con <code className="rounded bg-mist px-1 py-0.5 text-[12px]">GET /insurances/&#123;id&#125;</code>.</li>
          <li>Cada precio muestra logo, categoría, valoración y coberturas (<code className="rounded bg-mist px-1 py-0.5 text-[12px]">/offers/&#123;offerId&#125;/coverages</code>).</li>
          <li>Un agente puede afinar a precio firme y generar el informe PDF desde la ficha del lead.</li>
        </ol>
      </section>

      <section className="mt-4 rounded-[20px] border border-hair bg-white p-5">
        <h2 className="text-[15px] font-bold text-navy">Variables de entorno</h2>
        <div className="mt-3 flex flex-col gap-2">
          {CODESCOPIC_ENV_VARS.map((v) => (
            <div key={v.nombre} className="rounded-card border border-hair p-3">
              <p className="font-mono text-[13px] font-semibold text-ink">{v.nombre}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate2">{v.descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-[20px] border border-hair bg-white p-5">
        <h2 className="text-[15px] font-bold text-navy">Mapeo de campos (ramo Salud)</h2>
        <p className="mt-1 text-[13px] text-slate2">Contra el payload de referencia de Codeoscopic.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-hair text-left text-slate2">
                <th className="py-2 pr-3 font-semibold">Campo de Codeoscopic</th>
                <th className="py-2 pr-3 font-semibold">De dónde sale hoy en la web</th>
                <th className="py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {CODESCOPIC_FIELD_MAP.map((f) => (
                <tr key={f.campoCodescopic} className="border-b border-hair align-top last:border-0">
                  <td className="py-2 pr-3 font-mono text-[11.5px] text-ink">{f.campoCodescopic}</td>
                  <td className="py-2 pr-3 text-slate2">
                    {f.origenEnLaWeb}
                    {f.nota && <span className="mt-0.5 block text-[11px] italic text-slate2/80">{f.nota}</span>}
                  </td>
                  <td className="py-2">
                    <span className={`rounded-pill px-2 py-0.5 text-[11px] font-bold ${f.estado === "listo" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {f.estado === "listo" ? "Listo" : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 rounded-[20px] border border-hair bg-white p-5">
        <h2 className="text-[15px] font-bold text-navy">Payload de referencia (Salud)</h2>
        <pre className="mt-3 overflow-x-auto rounded-card bg-navy px-4 py-3.5 text-[12px] leading-relaxed text-white">
          <code>{CODESCOPIC_PAYLOAD_SAMPLE}</code>
        </pre>
      </section>
    </main>
  );
}

/* -------------------------------- Catálogo -------------------------------- */

type Line = { id: string; name?: string; active?: boolean; supports?: { rating?: boolean; policyApplication?: boolean } };
type Vendor = { id: string; name?: string; imageUrl?: string };
type HealthProduct = { id: number; name?: string; description?: string };
type CatalogResponse = {
  ok: boolean;
  reason?: string;
  lines: Line[] | null; linesError: string | null;
  vendors: Vendor[] | null; vendorsError: string | null;
  healthProducts: HealthProduct[] | null; healthProductsError: string | null;
};

function CatalogPanel() {
  const { token } = useAdminToken();
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/admin/integraciones/codescopic/catalog", { headers: { "x-admin-token": token } })
      .then((r) => r.json())
      .then((body: CatalogResponse) => { if (alive) { setData(body); setLoading(false); } })
      .catch(() => { if (alive) { setErr("No se pudo cargar el catálogo."); setLoading(false); } });
    return () => { alive = false; };
  }, [token]);

  if (loading) return <p className="mt-4 text-[13px] text-slate2">Cargando catálogo de tu cuenta…</p>;
  if (err) return <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{err}</p>;
  if (!data || data.reason === "not_configured") return null;

  const health = data.lines?.find((l) => l.id === "Health");

  return (
    <section className="mt-6 rounded-[20px] border border-hair bg-white p-5">
      <h2 className="text-[15px] font-bold text-navy">Catálogo de tu cuenta</h2>
      <p className="mt-1 text-[13px] text-slate2">En vivo desde Codeoscopic. Verifica que la línea de Salud está activa y qué compañías tienes disponibles.</p>

      {/* Salud: activa + qué soporta */}
      <div className="mt-4 rounded-card border border-hair p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-ink">Asistencia sanitaria (Health)</span>
          {health
            ? <span className={`rounded-pill px-2 py-0.5 text-[11px] font-bold ${health.active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{health.active ? "Activa" : "Inactiva"}</span>
            : <span className="rounded-pill bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">No listada</span>}
        </div>
        {health && (
          <p className="mt-1 text-[12px] text-slate2">
            Tarificación: {health.supports?.rating ? "sí" : "no"} · Contratación: {health.supports?.policyApplication ? "sí" : "no"}
          </p>
        )}
        {data.linesError && <p className="mt-1 text-[12px] text-brand-red-deep">Error al listar líneas: {data.linesError}</p>}
      </div>

      {/* Líneas activas */}
      {data.lines && (
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] font-semibold text-slate2">Líneas activas ({data.lines.filter((l) => l.active).length})</p>
          <div className="flex flex-wrap gap-1.5">
            {data.lines.filter((l) => l.active).map((l) => (
              <span key={l.id} className="rounded-pill border border-hair bg-mist px-2.5 py-1 text-[12px] text-ink">{l.name || l.id}</span>
            ))}
          </div>
        </div>
      )}

      {/* Vendors con logo */}
      {data.vendors && data.vendors.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-semibold text-slate2">Compañías disponibles ({data.vendors.length})</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {data.vendors.map((v) => (
              <div key={v.id} className="flex items-center gap-2 rounded-card border border-hair p-2">
                {v.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={v.imageUrl} alt={v.name || ""} className="h-6 max-w-[72px] w-auto shrink-0 object-contain" />
                  : null}
                <span className="min-w-0 truncate text-[12px] text-ink">{v.name || v.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.vendorsError && <p className="mt-2 text-[12px] text-brand-red-deep">Error al listar compañías: {data.vendorsError}</p>}

      {/* Productos de salud */}
      {data.healthProducts && data.healthProducts.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-semibold text-slate2">Productos de salud ({data.healthProducts.length})</p>
          <ul className="flex flex-col gap-1">
            {data.healthProducts.map((p) => (
              <li key={p.id} className="text-[12px] text-ink">· {p.name || `Producto ${p.id}`}</li>
            ))}
          </ul>
        </div>
      )}
      {data.healthProductsError && <p className="mt-2 text-[12px] text-slate2">Productos de salud: {data.healthProductsError} (puede requerir X-User-Email de tu organización).</p>}
    </section>
  );
}
