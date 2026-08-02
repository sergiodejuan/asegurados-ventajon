"use client";

import { useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { Spinner } from "@/components/icons";
import { DevPortalGate, useDevToken } from "@/components/admin/DevPortalGate";
import { CODESCOPIC_FIELD_MAP, CODESCOPIC_ENV_VARS, CODESCOPIC_PAYLOAD_SAMPLE, API_CATEGORIES, WEBHOOKS } from "@/lib/integrationsCatalog";

export default function PortalDesarrolloClient() {
  return (
    <DevPortalGate>
      <PortalContent />
    </DevPortalGate>
  );
}

function PortalContent() {
  const { token } = useDevToken();
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

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 pb-24">
      <p className="text-[12px] font-bold uppercase tracking-wide text-brand-red">Onboarding técnico</p>
      <h1 className="mt-1 text-[28px] font-extrabold leading-tight text-navy">Documentación de APIs e integraciones</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-slate2">
        Bienvenido/a al equipo de desarrollo de {BRAND_NAME}. Esta página reúne todo lo que necesitas para empezar a
        trabajar con las integraciones del sitio: el motor de tarificación externo Codescopic, la API propia de la
        web y los webhooks salientes/entrantes. Es una página no enlazada desde ningún menú — guárdala en marcadores.
      </p>

      <div className="mt-5">
        <button
          type="button" onClick={downloadPdf} disabled={downloading} aria-busy={downloading || undefined}
          className="flex items-center gap-2 rounded-card bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading && <Spinner />}
          {downloading ? "Generando…" : "Descargar todo en PDF"}
        </button>
        {downloadError && <p role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{downloadError}</p>}
      </div>

      <nav aria-label="Contenido" className="mt-8 rounded-card border border-hair bg-white p-4">
        <p className="text-[12px] font-bold uppercase tracking-wide text-slate2">Contenido</p>
        <ul className="mt-2 flex flex-col gap-1 text-[13px] font-semibold text-navy">
          <li><a href="#codescopic" className="underline underline-offset-2">1. Codescopic</a></li>
          <li><a href="#api-propia" className="underline underline-offset-2">2. API propia de la web</a></li>
          <li><a href="#webhooks" className="underline underline-offset-2">3. Webhooks</a></li>
        </ul>
      </nav>

      <section id="codescopic" className="mt-10 scroll-mt-6">
        <h2 className="text-[20px] font-extrabold text-navy">1. Codescopic</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate2">
          Motor de tarificación externo, todavía no conectado. El tarificador de salud ya recoge todos los datos
          personales que pide su payload de referencia (ver abajo); falta la documentación de acceso de Codescopic
          (autenticación, URL base y catálogo de municipios para resolver el código postal a su <code className="rounded bg-mist px-1 py-0.5 text-[12px]">town.id</code>).
        </p>

        <h3 className="mt-5 text-[14px] font-bold text-navy">Variables de entorno previstas</h3>
        <div className="mt-2 flex flex-col gap-2">
          {CODESCOPIC_ENV_VARS.map((v) => (
            <div key={v.nombre} className="rounded-card border border-hair p-3">
              <p className="font-mono text-[13px] font-semibold text-ink">{v.nombre}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate2">{v.descripcion}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-5 text-[14px] font-bold text-navy">Mapeo de campos (ramo Salud)</h3>
        <div className="mt-2 overflow-x-auto">
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

        <h3 className="mt-5 text-[14px] font-bold text-navy">Payload de referencia (Salud)</h3>
        <pre className="mt-2 overflow-x-auto rounded-card bg-navy px-4 py-3.5 text-[12px] leading-relaxed text-white">
          <code>{CODESCOPIC_PAYLOAD_SAMPLE}</code>
        </pre>
      </section>

      <section id="api-propia" className="mt-10 scroll-mt-6">
        <h2 className="text-[20px] font-extrabold text-navy">2. API propia de la web</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate2">
          Todos los endpoints de asegurados-ventajon.com, agrupados por para qué sirven.
        </p>
        {API_CATEGORIES.map((cat) => (
          <div key={cat.categoria} className="mt-6">
            <h3 className="text-[14.5px] font-bold text-navy">{cat.categoria}</h3>
            {cat.descripcion && <p className="mt-1 text-[12.5px] leading-relaxed text-slate2">{cat.descripcion}</p>}
            <div className="mt-2.5 flex flex-col gap-2.5">
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
          </div>
        ))}
      </section>

      <section id="webhooks" className="mt-10 scroll-mt-6">
        <h2 className="text-[20px] font-extrabold text-navy">3. Webhooks</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate2">
          Un webhook saliente (avisa a un sistema externo de cada lead nuevo) y dos entrantes (Retell y Bland avisan
          del resultado de una llamada).
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {WEBHOOKS.map((w) => (
            <div key={w.nombre} className="rounded-card border border-hair p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-pill px-2.5 py-1 text-[11px] font-bold ${w.direccion === "saliente" ? "bg-navy/10 text-navy" : "bg-slate2/10 text-slate2"}`}>
                  {w.direccion === "saliente" ? "Saliente" : "Entrante"}
                </span>
                <p className="text-[14px] font-bold text-navy">{w.nombre}</p>
              </div>
              <p className="mt-1 font-mono text-[12.5px] text-ink">{w.endpoint}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate2">{w.resumen}</p>
              <div className="mt-2.5 grid grid-cols-1 gap-2 text-[12px] text-slate2">
                <div>
                  <p className="font-semibold text-slate2">Payload</p>
                  <pre className="mt-1 overflow-x-auto rounded-card bg-mist px-3 py-2 font-mono text-[11.5px] text-ink">{w.payload}</pre>
                </div>
                <div>
                  <p className="font-semibold text-slate2">Seguridad</p>
                  <p className="mt-0.5">{w.seguridad}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
