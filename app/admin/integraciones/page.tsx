"use client";

import { useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { ArrowRight, Spinner } from "@/components/icons";
import { useIntegrationStatus } from "@/components/admin/useIntegrationStatus";
import type { ConnectionStatus } from "@/components/admin/ConnectionBanner";

const SECTIONS = [
  { href: "/admin/integraciones/codescopic", title: "Codescopic", description: "Motor de tarificación externo: documentación del payload, campos ya preparados y variables pendientes." },
  { href: "/admin/integraciones/api", title: "API propia de la web", description: "Todos los endpoints de asegurados-ventajon.com: tarificadores, área de cliente y panel de administración." },
  { href: "/admin/integraciones/webhooks", title: "Webhooks", description: "Notificaciones salientes de cada lead y los webhooks entrantes de Retell/Bland al terminar una llamada." },
];

const PILL: Record<ConnectionStatus, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  off: "bg-brand-red/10 text-brand-red-deep",
};

function Pill({ status, children }: { status: ConnectionStatus; children: React.ReactNode }) {
  return <span className={`rounded-pill px-2.5 py-1 text-[11px] font-bold ${PILL[status]}`}>{children}</span>;
}

export default function AdminIntegracionesPage() {
  return (
    <AdminShell active="integraciones">
      <IntegracionesIndex />
    </AdminShell>
  );
}

function IntegracionesIndex() {
  const { status, loading, error } = useIntegrationStatus();
  const { token } = useAdminToken();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function downloadPdf() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/admin/integraciones/pdf", { headers: { "x-admin-token": token } });
      if (!res.ok) { setDownloadError("No se pudo generar el PDF."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `integraciones-api-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Error de conexión al generar el PDF.");
    } finally {
      setDownloading(false);
    }
  }

  function badgeFor(href: string): { status: ConnectionStatus; label: string } | null {
    if (!status) return null;
    if (href.endsWith("/codescopic")) {
      return status.codescopic.configured ? { status: "ok", label: "Conectado" } : { status: "off", label: "Pendiente de credenciales" };
    }
    if (href.endsWith("/api")) {
      return status.apiPropia.storageMode === "kv"
        ? { status: "ok", label: "Activa (Redis)" }
        : { status: "warn", label: "Activa (memoria, sin persistencia)" };
    }
    if (href.endsWith("/webhooks")) {
      const n = [status.webhooks.saliente.configured, status.webhooks.retell.configured, status.webhooks.bland.configured].filter(Boolean).length;
      if (n === 0) return { status: "off", label: "Sin configurar" };
      if (n === 3) return { status: "ok", label: "Todos configurados" };
      return { status: "warn", label: `${n} de 3 configurados` };
    }
    return null;
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="text-[22px] font-extrabold text-navy">Integraciones</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Documentación técnica y estado real de cada integración de la web. El estado se lee en directo de las
        variables de entorno y el almacén — no es una casilla que se marca a mano.
      </p>
      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}

      <div className="mt-4">
        <button
          type="button" onClick={downloadPdf} disabled={downloading} aria-busy={downloading || undefined}
          className="flex items-center gap-2 rounded-card bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading && <Spinner />}
          {downloading ? "Generando…" : "Descargar PDF con toda la documentación"}
        </button>
        <p className="mt-1.5 text-[12px] text-slate2">Un único PDF con Codescopic, la API propia y los webhooks — listo para enviar al equipo.</p>
        {downloadError && <p role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{downloadError}</p>}
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {SECTIONS.map((s) => {
          const badge = badgeFor(s.href);
          return (
            <a key={s.href} href={s.href}
              className="flex items-center justify-between gap-3 rounded-card border border-hair bg-white px-4 py-3.5 transition-colors hover:bg-mist">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-ink">{s.title}</p>
                  {loading ? (
                    <span className="text-[11px] text-slate2">Comprobando…</span>
                  ) : badge ? (
                    <Pill status={badge.status}>{badge.label}</Pill>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-slate2">{s.description}</p>
              </div>
              <ArrowRight width={17} height={17} className="shrink-0 text-brand-red" />
            </a>
          );
        })}
      </div>
    </main>
  );
}
