"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { IntegracionesSectionHeader } from "@/components/admin/IntegracionesSectionHeader";
import { ConnectionBanner } from "@/components/admin/ConnectionBanner";
import { IntegrationTestButton } from "@/components/admin/IntegrationTestButton";
import { useIntegrationStatus } from "@/components/admin/useIntegrationStatus";
import { WEBHOOKS } from "@/lib/integrationsCatalog";

export default function AdminIntegracionesWebhooksPage() {
  return (
    <AdminShell active="integraciones-webhooks">
      <WebhooksAdmin />
    </AdminShell>
  );
}

function WebhooksAdmin() {
  const { status, loading, error } = useIntegrationStatus();

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-16">
      <IntegracionesSectionHeader
        title="Webhooks"
        description="Un webhook saliente (avisa a un sistema externo de cada lead nuevo) y dos entrantes (Retell y Bland avisan del resultado de una llamada)."
      />
      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}

      {WEBHOOKS.map((w) => {
        const configured =
          w.nombre.startsWith("Retell") ? status?.webhooks.retell.configured
          : w.nombre.startsWith("Bland") ? status?.webhooks.bland.configured
          : status?.webhooks.saliente.configured;
        const target =
          w.nombre.startsWith("Retell") ? "webhook-retell"
          : w.nombre.startsWith("Bland") ? "webhook-bland"
          : "webhook-saliente";
        return (
          <section key={w.nombre} className="mt-4 rounded-[20px] border border-hair bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-pill px-2.5 py-1 text-[11px] font-bold ${w.direccion === "saliente" ? "bg-navy/10 text-navy" : "bg-slate2/10 text-slate2"}`}>
                {w.direccion === "saliente" ? "Saliente" : "Entrante"}
              </span>
              <h2 className="text-[15px] font-bold text-navy">{w.nombre}</h2>
            </div>
            <p className="mt-1 font-mono text-[12.5px] text-ink">{w.endpoint}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate2">{w.resumen}</p>

            {!loading && (
              <ConnectionBanner
                status={configured ? "ok" : "off"}
                title={configured ? "Configurado" : "No configurado"}
                detail={
                  configured
                    ? undefined
                    : w.direccion === "saliente"
                      ? "Falta la variable de entorno LEAD_WEBHOOK_URL — sin ella, este aviso simplemente no se envía (el alta del lead sigue funcionando igual)."
                      : "Falta la variable de entorno de firma — las llamadas entrantes a este endpoint se van a rechazar por firma no válida (o no se podrán verificar)."
                }
              />
            )}
            <IntegrationTestButton
              target={target}
              label={w.direccion === "saliente" ? "Enviar un POST de prueba" : "Comprobar que el endpoint está desplegado"}
              confirmMessage={w.direccion === "saliente" ? "Esto envía un POST real (marcado con \"test\": true) a la URL configurada en LEAD_WEBHOOK_URL. ¿Continuar?" : undefined}
            />

            <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] text-slate2">
              <div>
                <p className="font-semibold text-slate2">Payload</p>
                <pre className="mt-1 overflow-x-auto rounded-card bg-mist px-3 py-2 font-mono text-[11.5px] text-ink">{w.payload}</pre>
              </div>
              <div>
                <p className="font-semibold text-slate2">Seguridad</p>
                <p className="mt-0.5">{w.seguridad}</p>
              </div>
            </div>
          </section>
        );
      })}
    </main>
  );
}
