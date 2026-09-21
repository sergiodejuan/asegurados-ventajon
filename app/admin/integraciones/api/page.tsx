"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { IntegracionesSectionHeader } from "@/components/admin/IntegracionesSectionHeader";
import { ConnectionBanner } from "@/components/admin/ConnectionBanner";
import { IntegrationTestButton } from "@/components/admin/IntegrationTestButton";
import { useIntegrationStatus } from "@/components/admin/useIntegrationStatus";
import { API_CATEGORIES } from "@/lib/integrationsCatalog";

export default function AdminIntegracionesApiPage() {
  return (
    <AdminShell active="integraciones-api">
      <ApiAdmin />
    </AdminShell>
  );
}

function ApiAdmin() {
  const { status, loading, error } = useIntegrationStatus();

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-16">
      <IntegracionesSectionHeader
        title="API propia de la web"
        description="Todos los endpoints de asegurados-ventajon.com, agrupados por para qué sirven."
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {!loading && status && (
        <>
          <ConnectionBanner
            status={status.apiPropia.storageMode === "kv" ? "ok" : "warn"}
            title={status.apiPropia.storageMode === "kv" ? "Activa — almacén Redis (KV) conectado" : "Activa — sin Redis conectado (memoria del proceso)"}
            detail={
              status.apiPropia.storageMode === "kv"
                ? "Los leads y el resto de datos persisten entre despliegues."
                : "Los datos NO sobreviven a un redeploy ni se comparten entre instancias — solo válido para desarrollo local. Conecta un Redis (KV_REST_API_URL/TOKEN o UPSTASH_*) antes de producción."
            }
          />
          <ConnectionBanner
            status={status.apiPropia.turnstileConfigured ? "ok" : "warn"}
            title={status.apiPropia.turnstileConfigured ? "Turnstile activo en los formularios públicos" : "Turnstile no configurado"}
            detail={status.apiPropia.turnstileConfigured ? undefined : "Los formularios siguen funcionando (la verificación se salta sin más), pero sin esta capa extra contra bots. Falta TURNSTILE_SECRET_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY."}
          />
          <ConnectionBanner
            status={status.apiPropia.adminTokenSet ? "ok" : "off"}
            title={status.apiPropia.adminTokenSet ? "ADMIN_TOKEN configurado" : "ADMIN_TOKEN no configurado"}
            detail={status.apiPropia.adminTokenSet ? undefined : "Sin esta variable, todas las rutas /api/admin/* (incluida esta) devuelven 503 salvo que entres siempre como agente con sesión propia."}
          />
        </>
      )}
      <IntegrationTestButton target="api-propia" label="Probar conexión con el almacén de datos" />

      {API_CATEGORIES.map((cat) => (
        <section key={cat.categoria} className="mt-6 rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">{cat.categoria}</h2>
          {cat.descripcion && <p className="mt-1 text-[13px] leading-relaxed text-slate2">{cat.descripcion}</p>}
          <div className="mt-3 flex flex-col gap-3">
            {cat.endpoints.map((e) => (
              <div key={`${e.method}-${e.path}`} className="rounded-card border border-hair p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-pill bg-navy px-2 py-0.5 font-mono text-[11px] font-bold text-white">{e.method}</span>
                  <span className="font-mono text-[12.5px] font-semibold text-ink">{e.path}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{e.resumen}</p>
                <dl className="mt-2 grid grid-cols-1 gap-1.5 text-[12px] text-slate2 sm:grid-cols-[80px_1fr]">
                  <dt className="font-semibold text-slate2">Auth</dt>
                  <dd>{e.auth}</dd>
                  {e.request !== "—" && (<><dt className="font-semibold text-slate2">Request</dt><dd className="break-words">{e.request}</dd></>)}
                  {e.response !== "—" && (<><dt className="font-semibold text-slate2">Response</dt><dd className="break-words font-mono">{e.response}</dd></>)}
                </dl>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
