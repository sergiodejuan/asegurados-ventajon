"use client";

import { AdminShell } from "@/components/admin/AdminShell";
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
        title="Codescopic"
        description="Motor de tarificación externo para calcular precios reales en vez de la estimación orientativa actual."
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {!loading && status && (
        status.codescopic.configured ? (
          <ConnectionBanner status="ok" title="Variables de entorno configuradas" detail="Aún así, la prueba de conexión de abajo solo comprueba que el host responde: no hay documentación de los endpoints de cotización de Codescopic para probar una cotización real." />
        ) : (
          <ConnectionBanner status="off" title="No conectado — pendiente de credenciales" detail={`Faltan: ${status.codescopic.missing.join(", ")}. La integración de cotización real no puede empezar hasta tener acceso (URL base, mecanismo de autenticación) de Codescopic.`} />
        )
      )}
      <IntegrationTestButton target="codescopic" label="Probar conexión con CODESCOPIC_BASE_URL" />

      <section className="mt-6 rounded-[20px] border border-hair bg-white p-5">
        <h2 className="text-[15px] font-bold text-navy">Qué falta para conectar de verdad</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate2">
          El tarificador de salud ya recoge todos los datos personales que pide el payload de referencia (ver tabla
          abajo). Lo que falta no es del lado de la web, sino de Codescopic: su documentación de acceso
          (autenticación, URL base, catálogo de municipios para <code className="rounded bg-mist px-1 py-0.5 text-[12px]">town.id</code>,
          y el id exacto de <code className="rounded bg-mist px-1 py-0.5 text-[12px]">insuranceLine</code> para cada
          ramo). En cuanto llegue esa documentación, el trabajo pendiente es escribir un cliente HTTP en{" "}
          <code className="rounded bg-mist px-1 py-0.5 text-[12px]">lib/codescopic.ts</code> (mismo patrón que{" "}
          <code className="rounded bg-mist px-1 py-0.5 text-[12px]">lib/retell.ts</code>) y llamarlo desde{" "}
          <code className="rounded bg-mist px-1 py-0.5 text-[12px]">app/api/lead/route.ts</code> para sustituir el
          precio orientativo por el real.
        </p>
      </section>

      <section className="mt-4 rounded-[20px] border border-hair bg-white p-5">
        <h2 className="text-[15px] font-bold text-navy">Variables de entorno previstas</h2>
        <p className="mt-1 text-[13px] text-slate2">A confirmar/ajustar en cuanto Codescopic comparta su documentación de acceso.</p>
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
        <p className="mt-1 text-[13px] text-slate2">Contra el payload de referencia que compartió Sergio.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-hair text-left text-slate2">
                <th className="py-2 pr-3 font-semibold">Campo de Codescopic</th>
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
        <p className="mt-1 text-[13px] text-slate2">Tal y como lo compartió Sergio, con datos de ejemplo.</p>
        <pre className="mt-3 overflow-x-auto rounded-card bg-navy px-4 py-3.5 text-[12px] leading-relaxed text-white">
          <code>{CODESCOPIC_PAYLOAD_SAMPLE}</code>
        </pre>
      </section>
    </main>
  );
}
