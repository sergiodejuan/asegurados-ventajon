"use client";

import { useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { Spinner } from "@/components/icons";
import { DevPortalGate, useDevToken } from "@/components/admin/DevPortalGate";
import { CODESCOPIC_FIELD_MAP, CODESCOPIC_ENV_VARS, CODESCOPIC_PAYLOAD_SAMPLE, API_CATEGORIES, WEBHOOKS } from "@/lib/integrationsCatalog";
import { SITE_STRUCTURE } from "@/lib/siteStructure";
import { SiteStructureDiagram } from "@/components/admin/SiteStructureDiagram";
import {
  SALUD_STEPS, SALUD_GATE, LP_SALUD_DIFFS, SALUD_FLOW, SALUD_PRICING,
  DATA_MODEL, DATA_MODEL_NOTES,
  SECURITY_POLICIES, ENDPOINT_AUTH_MATRIX, API_SECURITY_QA, SECURITY_RESIDUAL,
  FUNCTIONAL_REQUIREMENTS, INFO_FLOWS,
  ENV_GROUPS, PLATFORM_DEPS, RUNTIME_REQS, EXTERNAL_SERVICES, MIGRATION_CHECKLIST,
} from "@/lib/devPortalDocs";

export default function PortalDesarrolloClient() {
  return (
    <DevPortalGate>
      <PortalContent />
    </DevPortalGate>
  );
}

const TOC: { id: string; n: string; label: string }[] = [
  { id: "arquitectura", n: "1", label: "Arquitectura y stack" },
  { id: "estructura", n: "2", label: "Estructura de la web" },
  { id: "tarificador-salud", n: "3", label: "Tarificador de salud" },
  { id: "codeoscopic", n: "4", label: "Codeoscopic" },
  { id: "api-propia", n: "5", label: "API propia" },
  { id: "webhooks", n: "6", label: "Webhooks" },
  { id: "datos", n: "7", label: "Modelo de datos" },
  { id: "seguridad", n: "8", label: "Seguridad" },
  { id: "requisitos", n: "9", label: "Requisitos funcionales" },
  { id: "flujos", n: "10", label: "Flujos de información" },
  { id: "migracion", n: "11", label: "Migración a entorno propio" },
];

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
    <main className="mx-auto max-w-4xl px-5 py-10 pb-24">
      <p className="text-[12px] font-bold uppercase tracking-wide text-brand-red">Onboarding técnico · IT / Desarrollo · Confidencial</p>
      <h1 className="mt-1 text-[28px] font-extrabold leading-tight text-navy">Documentación técnica de {BRAND_NAME}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-slate2">
        Referencia para el equipo de IT, desarrollo y ciberseguridad: cómo está construido el sitio, la lógica del
        tarificador, el motor de tarificación de Codeoscopic, la API propia y sus webhooks, el <b className="text-ink">modelo de
        datos completo</b>, las <b className="text-ink">políticas y medidas de seguridad</b>, los requisitos funcionales y
        flujos de información, y todo lo necesario para <b className="text-ink">migrar el proyecto a los servidores propios de
        Ventajon</b> sin que nada se rompa. Página no enlazada desde ningún menú ni el sitemap — guárdala en marcadores.
      </p>

      <div className="mt-4 rounded-card border border-hair bg-mist/60 p-3 text-[12.5px] leading-relaxed text-slate2">
        <b className="text-ink">Stack:</b> Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zod ·
        almacén Redis (Upstash/Vercel KV) · runtime Node en toda la API (ninguna ruta Edge; solo el middleware corre
        en Edge en Vercel y funciona igual en Node al autohospedar).
      </div>

      <div className="mt-5">
        <button
          type="button" onClick={downloadPdf} disabled={downloading} aria-busy={downloading || undefined}
          className="flex items-center gap-2 rounded-card bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading && <Spinner />}
          {downloading ? "Generando…" : "Descargar referencia de API (PDF)"}
        </button>
        {downloadError && <p role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{downloadError}</p>}
      </div>

      {/* Índice */}
      <nav aria-label="Contenido" className="mt-8 rounded-card border border-hair bg-white p-4">
        <p className="text-[12px] font-bold uppercase tracking-wide text-slate2">Contenido</p>
        <ol className="mt-2 grid grid-cols-1 gap-1 text-[13px] font-semibold text-navy sm:grid-cols-2">
          {TOC.map((t) => (
            <li key={t.id}><a href={`#${t.id}`} className="underline underline-offset-2">{t.n}. {t.label}</a></li>
          ))}
        </ol>
      </nav>

      {/* 1. ARQUITECTURA */}
      <Section id="arquitectura" n="1" title="Arquitectura y stack">
        <p className="text-[13.5px] leading-relaxed text-slate2">
          Aplicación Next.js 14 (App Router) en TypeScript. El renderizado y toda la API viven en el mismo proyecto
          (rutas <code className="rounded bg-mist px-1 py-0.5 text-[12px]">app/api/*</code> con <code className="rounded bg-mist px-1 py-0.5 text-[12px]">runtime = &quot;nodejs&quot;</code>).
          No hay base de datos SQL: el estado se guarda en un almacén clave-valor sobre Redis (Upstash), con fallback a
          memoria del proceso solo en desarrollo. El contenido (tema, catálogo, landings, promociones, blog) es
          editable desde el panel <code className="rounded bg-mist px-1 py-0.5 text-[12px]">/admin</code> sin desplegar.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { k: "Frontend + API", v: "Next.js 14 App Router, React 18, TypeScript, Tailwind. Validación con Zod." },
            { k: "Almacén", v: "Redis (Upstash/Vercel KV) vía @upstash/redis (REST). Todo el CRM y la configuración." },
            { k: "Integraciones", v: "Codeoscopic, ManyChat, Retell/Bland, Meta CAPI, Resend, Tremendous, Turnstile, GTM/GA4." },
          ].map((x) => (
            <div key={x.k} className="rounded-card border border-hair p-3">
              <p className="text-[13px] font-bold text-navy">{x.k}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate2">{x.v}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 2. ESTRUCTURA */}
      <Section id="estructura" n="2" title="Estructura de la web">
        <p className="text-[13.5px] leading-relaxed text-slate2">
          Mapa de páginas padre, hijas, secciones y los 4 tipos de tarificador, con la función de cada caja. El sitio
          público y el panel de administración son las dos ramas principales; el propio portal de desarrollo es la tercera.
        </p>
        <div className="mt-4"><SiteStructureDiagram nodes={SITE_STRUCTURE} /></div>
      </Section>

      {/* 3. TARIFICADOR DE SALUD */}
      <Section id="tarificador-salud" n="3" title="Tarificador de salud — lógica y pasos">
        <p className="text-[13.5px] leading-relaxed text-slate2">
          Motor de pasos declarativo (<code className="rounded bg-mist px-1 py-0.5 text-[12px]">lib/forms.ts</code> + <code className="rounded bg-mist px-1 py-0.5 text-[12px]">components/StepForm.tsx</code>),
          3 fases: <b className="text-ink">Tu seguro → Tus datos → Tu precio</b>. La zona se deriva del CP (no hay paso
          «¿dónde vives?»); el DNI, apellidos y contacto se recogen en el <b className="text-ink">gate de la comparativa</b>,
          no en el tarificador (salud usa <code className="rounded bg-mist px-1 py-0.5 text-[12px]">skipContactStep</code>).
        </p>

        <h3 className="mt-5 text-[14px] font-bold text-navy">Pasos del tarificador general (/tarificador)</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-hair text-left text-slate2">
                <th className="py-2 pr-2 font-semibold">#</th>
                <th className="py-2 pr-2 font-semibold">key / control</th>
                <th className="py-2 pr-2 font-semibold">Campo</th>
                <th className="py-2 pr-2 font-semibold">Pregunta</th>
                <th className="py-2 pr-2 font-semibold">Fase</th>
                <th className="py-2 font-semibold">Validación / showIf</th>
              </tr>
            </thead>
            <tbody>
              {SALUD_STEPS.map((s) => (
                <tr key={s.n} className="border-b border-hair align-top last:border-0">
                  <td className="py-2 pr-2 font-mono text-ink">{s.n}</td>
                  <td className="py-2 pr-2"><span className="font-mono text-[11.5px] text-ink">{s.key}</span><span className="mt-0.5 block text-[11px] text-slate2">{s.control}</span></td>
                  <td className="py-2 pr-2 font-mono text-[11px] text-slate2">{s.campo}</td>
                  <td className="py-2 pr-2 text-ink">{s.pregunta}</td>
                  <td className="py-2 pr-2 text-slate2">{s.fase}</td>
                  <td className="py-2 text-slate2">{s.validacion}{s.showIf !== "—" && <span className="mt-0.5 block text-[11px] italic">showIf: {s.showIf}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-5 text-[14px] font-bold text-navy">Gate de la comparativa (crea el lead real)</h3>
        <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-relaxed text-slate2">
          {SALUD_GATE.map((g) => (<li key={g} className="flex gap-2"><span className="text-brand-red">·</span><span>{g}</span></li>))}
        </ul>

        <h3 className="mt-5 text-[14px] font-bold text-navy">Variante de landing de pago (/lp/[slug]/tarificador · PaidTarificadorSalud)</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-hair text-left text-slate2">
                <th className="py-2 pr-3 font-semibold">Aspecto</th>
                <th className="py-2 pr-3 font-semibold">General</th>
                <th className="py-2 font-semibold">LP salud</th>
              </tr>
            </thead>
            <tbody>
              {LP_SALUD_DIFFS.map((d) => (
                <tr key={d.aspecto} className="border-b border-hair align-top last:border-0">
                  <td className="py-2 pr-3 font-semibold text-ink">{d.aspecto}</td>
                  <td className="py-2 pr-3 text-slate2">{d.general}</td>
                  <td className="py-2 text-slate2">{d.lp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-5 text-[14px] font-bold text-navy">Flujo completo (endpoints reales)</h3>
        <ol className="mt-2 flex flex-col gap-2.5">
          {SALUD_FLOW.map((f) => (
            <li key={f.n} className="flex gap-3 rounded-card border border-hair p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy/10 text-[12px] font-bold text-navy">{f.n}</span>
              <div><p className="text-[13px] font-bold text-ink">{f.paso}</p><p className="mt-0.5 text-[12.5px] leading-relaxed text-slate2">{f.detalle}</p></div>
            </li>
          ))}
        </ol>

        <h3 className="mt-5 text-[14px] font-bold text-navy">Precio orientativo de las opciones negociadas (saludPriceAdvanced)</h3>
        <ol className="mt-2 list-decimal pl-5 text-[13px] leading-relaxed text-slate2">
          {SALUD_PRICING.map((p) => (<li key={p} className="mt-1">{p}</li>))}
        </ol>
      </Section>

      {/* 4. CODEOSCOPIC */}
      <Section id="codeoscopic" n="4" title="Codeoscopic">
        <p className="text-[13.5px] leading-relaxed text-slate2">
          Motor de tarificación real de las aseguradoras (Avant2 / API Integra), <b className="text-ink">ya integrado y cableado
          de punta a punta</b>: cliente OAuth2 en <code className="rounded bg-mist px-1 py-0.5 text-[12px]">lib/codeoscopic.ts</code>,
          mapeo en <code className="rounded bg-mist px-1 py-0.5 text-[12px]">lib/codeoscopicMap.ts</code> y resolución de CP a <code className="rounded bg-mist px-1 py-0.5 text-[12px]">town.id</code> en <code className="rounded bg-mist px-1 py-0.5 text-[12px]">lib/codeoscopicTowns.ts</code>.
          Lo único pendiente para producción son las credenciales reales; mientras tanto degrada en silencio al catálogo mock.
        </p>

        <h3 className="mt-5 text-[14px] font-bold text-navy">Variables de entorno</h3>
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
                <th className="py-2 pr-3 font-semibold">Campo de Codeoscopic</th>
                <th className="py-2 pr-3 font-semibold">De dónde sale en la web</th>
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
      </Section>

      {/* 5. API PROPIA */}
      <Section id="api-propia" n="5" title="API propia de la web">
        <p className="text-[13.5px] leading-relaxed text-slate2">
          Todos los endpoints de la web, agrupados por para qué sirven. La autenticación de cada uno se resume en la
          matriz de la sección de seguridad.
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
      </Section>

      {/* 6. WEBHOOKS */}
      <Section id="webhooks" n="6" title="Webhooks">
        <p className="text-[13.5px] leading-relaxed text-slate2">
          Dos salientes (aviso genérico de lead y sincronización a ManyChat) y tres entrantes (Retell, Bland y ManyChat).
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
      </Section>

      {/* 7. MODELO DE DATOS */}
      <Section id="datos" n="7" title="Modelo de datos — «tablas» del almacén (Redis)">
        <ul className="flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-slate2">
          {DATA_MODEL_NOTES.map((nnote) => (<li key={nnote} className="flex gap-2"><span className="text-brand-red">·</span><span>{nnote}</span></li>))}
        </ul>
        {DATA_MODEL.map((g) => (
          <div key={g.grupo} className="mt-6">
            <h3 className="text-[14px] font-bold text-navy">{g.grupo}</h3>
            {g.descripcion && <p className="mt-1 text-[12px] leading-relaxed text-slate2">{g.descripcion}</p>}
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-hair text-left text-slate2">
                    <th className="py-2 pr-3 font-semibold">Clave</th>
                    <th className="py-2 pr-3 font-semibold">Tipo</th>
                    <th className="py-2 pr-3 font-semibold">Forma / contenido</th>
                    <th className="py-2 pr-3 font-semibold">TTL</th>
                    <th className="py-2 font-semibold">Para qué</th>
                  </tr>
                </thead>
                <tbody>
                  {g.filas.map((r) => (
                    <tr key={r.clave} className="border-b border-hair align-top last:border-0">
                      <td className="py-2 pr-3 font-mono text-[11px] text-ink">{r.clave}</td>
                      <td className="py-2 pr-3 text-slate2">{r.tipo}</td>
                      <td className="py-2 pr-3 text-slate2">{r.forma}</td>
                      <td className="py-2 pr-3 text-slate2">{r.ttl}</td>
                      <td className="py-2 text-slate2">{r.para}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </Section>

      {/* 8. SEGURIDAD */}
      <Section id="seguridad" n="8" title="Seguridad y ciberseguridad">
        <p className="text-[13.5px] leading-relaxed text-slate2">
          Postura de seguridad por capas. Todas las medidas listadas están implementadas en el código; las que dependen
          de configuración de entorno se señalan en «Riesgos residuales».
        </p>

        {SECURITY_POLICIES.map((c) => (
          <div key={c.categoria} className="mt-5">
            <h3 className="text-[14px] font-bold text-navy">{c.categoria}</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              {c.medidas.map((m) => (
                <div key={m.titulo} className="rounded-card border border-hair p-3">
                  <p className="text-[13px] font-bold text-ink">{m.titulo}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate2">{m.detalle}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <h3 className="mt-7 text-[14px] font-bold text-navy">Matriz endpoint → autenticación</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-hair text-left text-slate2">
                <th className="py-2 pr-3 font-semibold">Categoría</th>
                <th className="py-2 pr-3 font-semibold">Ejemplos</th>
                <th className="py-2 pr-3 font-semibold">Autenticación / defensa</th>
                <th className="py-2 font-semibold">¿Escritura?</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINT_AUTH_MATRIX.map((r) => (
                <tr key={r.categoria} className="border-b border-hair align-top last:border-0">
                  <td className="py-2 pr-3 font-semibold text-ink">{r.categoria}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-slate2">{r.ejemplos}</td>
                  <td className="py-2 pr-3 text-slate2">{r.auth}</td>
                  <td className="py-2 text-slate2">{r.escritura}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-7 rounded-[16px] border border-navy/20 bg-navy/[0.03] p-5">
          <p className="text-[12px] font-bold uppercase tracking-wide text-brand-red">Pregunta frecuente (ciberseguridad)</p>
          <h3 className="mt-1 text-[15px] font-extrabold text-navy">{API_SECURITY_QA.pregunta}</h3>
          <p className="mt-2 text-[13.5px] font-semibold leading-relaxed text-ink">{API_SECURITY_QA.respuestaCorta}</p>
          <p className="mt-3 text-[13px] font-bold text-navy">Los endpoints públicos de captación (que aceptan escritura sin login):</p>
          <ul className="mt-1 flex flex-col gap-1 text-[12.5px] leading-relaxed text-slate2">
            {API_SECURITY_QA.publicos.map((p) => (<li key={p} className="flex gap-2"><span className="text-brand-red">·</span><span>{p}</span></li>))}
          </ul>
          <p className="mt-3 text-[13px] font-bold text-navy">Nunca accesibles sin credencial:</p>
          <ul className="mt-1 flex flex-col gap-1 text-[12.5px] leading-relaxed text-slate2">
            {API_SECURITY_QA.jamas.map((p) => (<li key={p} className="flex gap-2"><span className="text-emerald-600">✓</span><span>{p}</span></li>))}
          </ul>
        </div>

        <h3 className="mt-7 text-[14px] font-bold text-navy">Riesgos residuales / a asegurar en operación</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-slate2">Son puntos de configuración de entorno, no defectos de diseño del código.</p>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          {SECURITY_RESIDUAL.map((r) => (
            <div key={r.titulo} className="rounded-card border border-amber-200 bg-amber-50 p-3">
              <p className="text-[13px] font-bold text-amber-900">{r.titulo}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-amber-800">{r.detalle}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 9. REQUISITOS FUNCIONALES */}
      <Section id="requisitos" n="9" title="Requisitos funcionales">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FUNCTIONAL_REQUIREMENTS.map((g) => (
            <div key={g.grupo} className="rounded-card border border-hair p-4">
              <p className="text-[13.5px] font-bold text-navy">{g.grupo}</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-slate2">
                {g.items.map((it) => (<li key={it} className="flex gap-2"><span className="text-brand-red">·</span><span>{it}</span></li>))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* 10. FLUJOS DE INFORMACIÓN */}
      <Section id="flujos" n="10" title="Flujos de información">
        <div className="flex flex-col gap-3">
          {INFO_FLOWS.map((f) => (
            <div key={f.titulo} className="rounded-card border border-hair p-4">
              <p className="text-[13.5px] font-bold text-navy">{f.titulo}</p>
              <ol className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-slate2">
                {f.pasos.map((p, i) => (
                  <li key={p} className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy/10 text-[11px] font-bold text-navy">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      {/* 11. MIGRACIÓN */}
      <Section id="migracion" n="11" title="Migración al entorno propio de Ventajon">
        <p className="text-[13.5px] leading-relaxed text-slate2">
          Todo lo necesario para llevar el proyecto de Vercel a servidores propios sin que nada se rompa. El código no
          valida las variables al arrancar: los secretos que «fallan cerrado» lanzan en la primera petición que usan ese
          subsistema, así que a efectos de migración se tratan como obligatorios.
        </p>

        <h3 className="mt-5 text-[14px] font-bold text-navy">Variables de entorno</h3>
        {ENV_GROUPS.map((g) => (
          <div key={g.grupo} className="mt-3">
            <p className="text-[13px] font-bold text-navy">{g.grupo}</p>
            {g.nota && <p className="mt-0.5 text-[12px] leading-relaxed text-slate2">{g.nota}</p>}
            <div className="mt-2 flex flex-col gap-1.5">
              {g.vars.map((v) => (
                <div key={v.nombre} className="rounded-card border border-hair p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12px] font-semibold text-ink">{v.nombre}</span>
                    <span className={`rounded-pill px-2 py-0.5 text-[10.5px] font-bold ${v.obligatoria.startsWith("Sí") ? "bg-brand-red/10 text-brand-red" : "bg-slate2/10 text-slate2"}`}>{v.obligatoria}</span>
                    {v.secreta && <span className="rounded-pill bg-navy/10 px-2 py-0.5 text-[10.5px] font-bold text-navy">secreta</span>}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate2">{v.para}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <h3 className="mt-6 text-[14px] font-bold text-navy">Dependencias de plataforma Vercel a sustituir</h3>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {PLATFORM_DEPS.map((d) => (
            <div key={d.titulo} className="rounded-card border border-hair p-3">
              <p className="text-[13px] font-bold text-ink">{d.titulo}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate2">{d.detalle}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-6 text-[14px] font-bold text-navy">Requisitos de runtime</h3>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          {RUNTIME_REQS.map((d) => (
            <div key={d.titulo} className="rounded-card border border-hair p-3">
              <p className="text-[13px] font-bold text-ink">{d.titulo}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate2">{d.detalle}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-6 text-[14px] font-bold text-navy">Servicios externos (siguen siendo dependencia tras migrar)</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-hair text-left text-slate2">
                <th className="py-2 pr-3 font-semibold">Servicio</th>
                <th className="py-2 pr-3 font-semibold">Para qué</th>
                <th className="py-2 font-semibold">Credencial</th>
              </tr>
            </thead>
            <tbody>
              {EXTERNAL_SERVICES.map((s) => (
                <tr key={s.servicio} className="border-b border-hair align-top last:border-0">
                  <td className="py-2 pr-3 font-semibold text-ink">{s.servicio}</td>
                  <td className="py-2 pr-3 text-slate2">{s.para}</td>
                  <td className="py-2 text-slate2">{s.credencial}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-[14px] font-bold text-navy">Checklist de migración</h3>
        <ol className="mt-2 flex flex-col gap-2.5">
          {MIGRATION_CHECKLIST.map((c) => (
            <li key={c.fase} className="rounded-card border border-hair p-3">
              <p className="text-[13px] font-bold text-navy">{c.fase}</p>
              <ul className="mt-1.5 flex flex-col gap-1 text-[12.5px] leading-relaxed text-slate2">
                {c.items.map((it) => (<li key={it} className="flex gap-2"><span className="text-brand-red">☐</span><span>{it}</span></li>))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>
    </main>
  );
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <h2 className="text-[20px] font-extrabold text-navy">{n}. {title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
