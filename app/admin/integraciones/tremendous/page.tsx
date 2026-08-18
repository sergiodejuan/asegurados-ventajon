"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { IntegracionesSectionHeader } from "@/components/admin/IntegracionesSectionHeader";
import { ConnectionBanner } from "@/components/admin/ConnectionBanner";
import { IntegrationTestButton } from "@/components/admin/IntegrationTestButton";
import { useIntegrationStatus } from "@/components/admin/useIntegrationStatus";
import { TREMENDOUS_ENV_VARS } from "@/lib/integrationsCatalog";

export default function AdminIntegracionesTremendousPage() {
  return (
    <AdminShell active="integraciones-tremendous">
      <TremendousAdmin />
    </AdminShell>
  );
}

function TremendousAdmin() {
  const { status, loading, error } = useIntegrationStatus();

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-16">
      <IntegracionesSectionHeader
        title="Tremendous"
        description="Motor de pago del programa de referidos «Amigos Ventajon»: envía el vale Amazon eGift de 20€ tanto al amigo referido como al cliente que lo trajo, sin intervención manual."
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {!loading && status && (
        status.tremendous.configured ? (
          <ConnectionBanner status="ok" title="Variables de entorno configuradas" detail="La prueba de conexión de abajo confirma en vivo que la API key es válida y que la fuente de fondos configurada existe en la cuenta." />
        ) : (
          <ConnectionBanner status="off" title="No conectado — modo degradado" detail={`Faltan: ${status.tremendous.missing.join(", ")}. Mientras tanto, los códigos y la landing siguen funcionando, pero los pagos fallan con "Tremendous no configurado" y quedan marcados para reintento manual desde el dashboard de referidos.`} />
        )
      )}
      <IntegrationTestButton target="tremendous" label="Probar conexión con Tremendous" />

      <section className="mt-6 rounded-[20px] border border-hair bg-white p-5">
        <h2 className="text-[15px] font-bold text-navy">Qué dispara cada pago</h2>
        <ul className="mt-2 flex flex-col gap-2 text-[13px] leading-relaxed text-slate2">
          <li><b className="text-ink">Bono al amigo (referido):</b> al confirmar el doble opt-in por email tras cotizar desde /r/[código] — ver <code className="rounded bg-mist px-1 py-0.5 text-[12px]">app/api/referral/opt-in</code>.</li>
          <li><b className="text-ink">Bono al cliente (referidor):</b> cuando el amigo contrata (el asesor marca el presupuesto como "ganado") y pasan los días de gracia configurados — lo procesa el cron diario <code className="rounded bg-mist px-1 py-0.5 text-[12px]">/api/referral/process-payouts</code>.</li>
          <li>Cada envío usa un <code className="rounded bg-mist px-1 py-0.5 text-[12px]">external_id</code> determinista para no pagar dos veces por accidente, y reintenta hasta 5 veces ante fallos transitorios antes de marcarlo para revisión manual.</li>
        </ul>
        <p className="mt-3 text-[13px] leading-relaxed text-slate2">
          El estado agregado de todos los pagos (embudo, importes, pagos pendientes de reintento) está en{" "}
          <a href="/admin/informes/referidos" className="font-semibold text-navy underline">Analítica → Referidos</a>. La
          configuración del incentivo (importes, textos, activar/pausar el programa) está en{" "}
          <a href="/admin/campanas/referidos" className="font-semibold text-navy underline">Programa referidos</a>.
        </p>
      </section>

      <section className="mt-4 rounded-[20px] border border-hair bg-white p-5">
        <h2 className="text-[15px] font-bold text-navy">Variables de entorno</h2>
        <div className="mt-3 flex flex-col gap-2">
          {TREMENDOUS_ENV_VARS.map((v) => (
            <div key={v.nombre} className="rounded-card border border-hair p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[13px] font-semibold text-ink">{v.nombre}</p>
                <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${v.obligatoria ? "bg-brand-red/10 text-brand-red-deep" : "bg-slate-200 text-slate-600"}`}>
                  {v.obligatoria ? "Obligatoria" : "Opcional"}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate2">{v.descripcion}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-slate2">Setup paso a paso (crear cuenta, cargar saldo, campaña Amazon.es) en <code className="rounded bg-mist px-1 py-0.5 text-[12px]">docs/referrals.md</code>.</p>
      </section>
    </main>
  );
}
