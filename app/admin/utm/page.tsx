"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type Lead = {
  id: string;
  status: string;
  producto: string;
  utm: Record<string, string | undefined>;
};

const SIN_ATRIBUCION = "Directo / orgánico";

function num(n: number) {
  return n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
}

export default function AdminUtmPage() {
  return (
    <AdminShell active="utm">
      <UtmAdmin />
    </AdminShell>
  );
}

function UtmAdmin() {
  const { token } = useAdminToken();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/leads", { headers: { "x-admin-token": token } })
      .then((r) => r.json())
      .then((body) => { if (body.ok) setLeads(body.leads); })
      .finally(() => setLoaded(true));
  }, [token]);

  const conAtribucion = useMemo(() => leads.filter((l) => l.utm?.source || l.utm?.campaign), [leads]);
  const directos = leads.length - conAtribucion.length;
  const ganados = leads.filter((l) => l.status === "ganado");
  const winRate = leads.length ? Math.round((ganados.length / leads.length) * 100) : 0;

  const porMedio = useMemo(() => groupBy(leads.filter((l) => l.utm?.medium), (l) => l.utm!.medium!), [leads]);
  const porCampania = useMemo(() => groupBy(leads.filter((l) => l.utm?.campaign), (l) => l.utm!.campaign!), [leads]);
  const porLandingPage = useMemo(() => groupBy(leads.filter((l) => l.utm?.landingPage), (l) => l.utm!.landingPage!), [leads]);

  const tablaOrigenes = useMemo(() => {
    const keys = new Set(leads.map((l) => l.utm?.source || SIN_ATRIBUCION));
    return Array.from(keys)
      .map((key) => {
        const items = leads.filter((l) => (l.utm?.source || SIN_ATRIBUCION) === key);
        const won = items.filter((l) => l.status === "ganado").length;
        return { key, total: items.length, won, rate: items.length ? Math.round((won / items.length) * 100) : 0 };
      })
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  if (!loaded) {
    return <main className="mx-auto max-w-3xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-16">
      <h1 className="text-[22px] font-extrabold text-navy">UTM y CRO</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Atribución interna de todos los leads: de qué campaña, canal o página vienen, y cuántos de esos leads
        se han convertido en pólizas ganadas. Se calcula a partir de los parámetros utm_* y la página de
        aterrizaje registrados en cada lead.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-navy">{leads.length}</p>
          <p className="text-[11px] font-medium text-slate2">Leads totales</p>
        </div>
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-navy">{conAtribucion.length}</p>
          <p className="text-[11px] font-medium text-slate2">Con campaña (utm)</p>
        </div>
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-navy">{directos}</p>
          <p className="text-[11px] font-medium text-slate2">Directo / orgánico</p>
        </div>
        <div className="rounded-card border border-hair bg-white p-3">
          <p className="text-[20px] font-extrabold tnums text-emerald-700">{winRate}%</p>
          <p className="text-[11px] font-medium text-slate2">Tasa de conversión global</p>
        </div>
      </div>

      <ReportSection title="Leads y conversión por origen (utm_source)">
        {tablaOrigenes.length === 0 ? (
          <p className="text-[13px] text-slate2">Sin datos todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-hair text-left text-[11px] font-semibold uppercase tracking-wide text-slate2">
                  <th className="py-1.5 pr-3">Origen</th>
                  <th className="py-1.5 pr-3 text-right">Leads</th>
                  <th className="py-1.5 pr-3 text-right">Ganados</th>
                  <th className="py-1.5 text-right">Conversión</th>
                </tr>
              </thead>
              <tbody>
                {tablaOrigenes.map((r) => (
                  <tr key={r.key} className="border-b border-hair last:border-0">
                    <td className="py-2 pr-3 font-medium text-ink">{r.key}</td>
                    <td className="py-2 pr-3 text-right tnums text-ink">{r.total}</td>
                    <td className="py-2 pr-3 text-right tnums text-emerald-700">{r.won}</td>
                    <td className="py-2 text-right tnums font-semibold text-navy">{r.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>

      <ReportSection title="Leads por campaña (utm_campaign)">
        <BarList items={porCampania} />
      </ReportSection>

      <ReportSection title="Leads por medio (utm_medium)">
        <BarList items={porMedio} />
      </ReportSection>

      <ReportSection title="Páginas de aterrizaje (enlaces internos más efectivos)">
        <BarList items={porLandingPage} />
        <p className="mt-2 text-[11px] leading-relaxed text-slate2">
          La página de aterrizaje es la primera que visitó el lead en su sesión (o la página cuyo enlace ya
          incluía parámetros de campaña, como el CTA de una landing promocional).
        </p>
      </ReportSection>
    </main>
  );
}

function groupBy(items: Lead[], keyFn: (l: Lead) => string): { label: string; value: number }[] {
  const acc = new Map<string, number>();
  for (const it of items) {
    const key = keyFn(it);
    acc.set(key, (acc.get(key) ?? 0) + 1);
  }
  return Array.from(acc.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-[20px] border border-hair bg-white p-5">
      <h2 className="text-[14px] font-bold text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Lista de barras de magnitud, un único hue (navy) — cada barra ya está
// identificada por su etiqueta directa.
function BarList({ items }: { items: { label: string; value: number }[] }) {
  if (items.length === 0) return <p className="text-[13px] text-slate2">Sin datos todavía.</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => {
        const pct = Math.max(4, Math.round((it.value / max) * 100));
        return (
          <div key={it.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-medium text-ink" title={it.label}>{it.label}</span>
              <span className="shrink-0 text-[12px] font-semibold tnums text-slate2">{num(it.value)}</span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-mist">
              <div className="h-3 rounded-full bg-navy" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
