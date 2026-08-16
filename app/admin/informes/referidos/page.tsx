"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type EstadoKey = "cotizado" | "opt-in" | "contratado" | "pagado" | "cancelado";

type ReferralSummary = {
  totalReferidores: number;
  totalConvertidos: number;
  porEstado: Record<EstadoKey, number>;
  bonosReferidoPagados: number;
  bonosReferidorPagados: number;
  montoPagadoEstimado: number;
  montoPendienteReferidorEstimado: number;
  conErrorPago: number;
  topReferidores: { code: string; referidorLeadId: string; referidorNombre: string; totalConvertidos: number; contratados: number; pagados: number }[];
  atencion: { code: string; leadId: string; nombre: string; status: EstadoKey; ultimoErrorPago: string; lado: "referido" | "referidor" }[];
  detalle: {
    code: string; leadId: string; nombre: string; producto: string; status: EstadoKey;
    referidorLeadId: string; referidorNombre: string;
    cotizadoAt: string; contratadoAt: string; pagadoReferidoAt: string; pagadoReferidorAt: string;
  }[];
};

function fmt(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(iso)); }
  catch { return iso; }
}

const ESTADO_ORDER: EstadoKey[] = ["cotizado", "opt-in", "contratado", "pagado", "cancelado"];
const ESTADO_LABELS: Record<EstadoKey, string> = {
  cotizado: "Cotizado", "opt-in": "Opt-in confirmado", contratado: "Contratado", pagado: "Pagado", cancelado: "Cancelado",
};
// Mismo criterio de color que el resto del admin (STATUS_COLORS en
// app/admin/page.tsx): navy para "en curso", ámbar para "requiere espera",
// esmeralda para éxito, gris para neutro, rojo reservado para cancelado —
// nunca un color distinto por serie sin significado de estado.
const ESTADO_BAR_COLOR: Record<EstadoKey, string> = {
  cotizado: "bg-slate-300", "opt-in": "bg-navy", contratado: "bg-amber-400", pagado: "bg-emerald-500", cancelado: "bg-brand-red/60",
};
const ESTADO_PILL_COLOR: Record<EstadoKey, string> = {
  cotizado: "bg-slate-200 text-slate-600",
  "opt-in": "bg-navy/10 text-navy",
  contratado: "bg-amber-100 text-amber-700",
  pagado: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-brand-red/10 text-brand-red-deep",
};

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AdminReferralsInformesPage() {
  return (
    <AdminShell active="informes-referidos">
      <ReferralsDashboard />
    </AdminShell>
  );
}

function ReferralsDashboard() {
  const { token } = useAdminToken();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [programaActivo, setProgramaActivo] = useState(true);
  const [tremendousOk, setTremendousOk] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryMsg, setRetryMsg] = useState<Record<string, string>>({});
  const [detalleSearch, setDetalleSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/informes/referidos", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setSummary(body.summary);
      setProgramaActivo(body.programaActivo);
      setTremendousOk(body.tremendousConfigured);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function retry(item: ReferralSummary["atencion"][number]) {
    const key = `${item.code}:${item.leadId}:${item.lado}`;
    setRetrying(key);
    try {
      const res = await fetch(`/api/admin/referral/${encodeURIComponent(item.code)}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ leadId: item.leadId, lado: item.lado }),
      });
      const body = await res.json();
      setRetryMsg((m) => ({ ...m, [key]: body.ok ? "Pagado ✓" : (body.result?.error ?? body.error ?? "No se pudo reintentar.") }));
      if (body.ok) load();
    } catch {
      setRetryMsg((m) => ({ ...m, [key]: "Error de conexión." }));
    }
    setRetrying(null);
  }

  const filteredDetalle = useMemo(() => {
    const all = summary?.detalle ?? [];
    const q = detalleSearch.trim().toLowerCase();
    if (!q) return all;
    return all.filter((d) => `${d.nombre} ${d.referidorNombre} ${d.code}`.toLowerCase().includes(q));
  }, [summary, detalleSearch]);

  if (loading && !summary) return <main className="mx-auto max-w-5xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;
  if (error) return <main className="mx-auto max-w-5xl px-5 py-10 text-center text-[14px] font-medium text-brand-red">{error}</main>;
  if (!summary) return null;

  const maxEstado = Math.max(1, ...ESTADO_ORDER.map((k) => summary.porEstado[k] ?? 0));
  const tasaConversion = summary.totalConvertidos > 0
    ? ((summary.porEstado.contratado + summary.porEstado.pagado) / summary.totalConvertidos) * 100
    : 0;

  return (
    <main className="mx-auto max-w-5xl px-5 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold text-navy">Programa de referidos</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Resumen del embudo "Amigos Ventajon" (cotizado → opt-in → contratado → pagado) y de los bonos Amazon
        gestionados por Tremendous. Edita textos e incentivo en{" "}
        <a href="/admin/campanas/referidos" className="font-semibold text-navy underline">Programa referidos</a>.
      </p>

      {!programaActivo && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          El programa está pausado — la landing y el modal de invitación no generan códigos nuevos.
        </p>
      )}
      {!tremendousOk && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          Tremendous no está configurado — los bonos no se envían automáticamente. Ver docs/referrals.md.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatBox label="Referidores activos" value={summary.totalReferidores} />
        <StatBox label="Amigos referidos" value={summary.totalConvertidos} />
        <StatBox label="Tasa de conversión" value={`${tasaConversion.toFixed(0)}%`} />
        <StatBox label="€ pagado (estimado)" value={`${euros(summary.montoPagadoEstimado)} €`} />
        <StatBox label="€ pendiente referidor" value={`${euros(summary.montoPendienteReferidorEstimado)} €`} />
        <StatBox label="Pagos con error" value={summary.conErrorPago} alert={summary.conErrorPago > 0} />
      </div>

      <section className="mt-6">
        <h2 className="text-[15px] font-bold text-navy">Embudo de conversión</h2>
        <div className="mt-3 flex flex-col gap-2 rounded-card border border-hair bg-white p-4">
          {ESTADO_ORDER.map((k) => {
            const v = summary.porEstado[k] ?? 0;
            return (
              <div key={k} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-[12px] font-medium text-ink">{ESTADO_LABELS[k]}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-mist">
                  <div className={`h-full rounded-full ${ESTADO_BAR_COLOR[k]}`} style={{ width: `${(v / maxEstado) * 100}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right tnums text-[13px] font-semibold text-ink">{v}</span>
              </div>
            );
          })}
        </div>
      </section>

      {summary.atencion.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[15px] font-bold text-navy">Necesitan atención</h2>
          <p className="mt-1 text-[12px] text-slate2">Bonos que fallaron al pagar automáticamente — el cron ya no reintenta tras 5 intentos.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {summary.atencion.map((a) => {
              const key = `${a.code}:${a.leadId}:${a.lado}`;
              return (
                <li key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hair bg-white p-3.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">
                      {a.nombre || "Sin nombre"} <span className="font-normal text-slate2">· bono {a.lado} · {a.code}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-brand-red-deep" title={a.ultimoErrorPago}>{a.ultimoErrorPago}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a href={`/admin?lead=${a.leadId}`} className="text-[12px] font-semibold text-navy underline">Ver ficha</a>
                    <button type="button" onClick={() => retry(a)} disabled={retrying === key}
                      className="rounded-pill border border-navy px-3 py-1 text-[12px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
                      {retrying === key ? "Reintentando…" : "Reintentar pago"}
                    </button>
                  </div>
                  {retryMsg[key] && <p className="w-full text-[12px] text-slate2">{retryMsg[key]}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-navy">Detalle de amigos referidos</h2>
          <input
            value={detalleSearch} onChange={(e) => setDetalleSearch(e.target.value)}
            placeholder="Buscar por nombre, referidor o código…"
            className="w-full max-w-xs rounded-card border border-hair bg-white px-3 py-1.5 text-[13px]"
          />
        </div>
        <p className="mt-1 text-[12px] text-slate2">{filteredDetalle.length} de {summary.detalle.length} amigos referidos.</p>
        {filteredDetalle.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate2">Ningún amigo referido todavía.</p>
        ) : (
          <div className="mt-3 max-h-[480px] overflow-auto rounded-card border border-hair bg-white">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead className="sticky top-0 bg-mist text-[11px] font-bold uppercase tracking-wide text-slate2">
                <tr>
                  <th className="px-4 py-3">Amigo</th>
                  <th className="px-4 py-3">Referidor</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Cotizado</th>
                  <th className="px-4 py-3">Bono amigo</th>
                  <th className="px-4 py-3">Bono referidor</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetalle.map((d) => (
                  <tr key={`${d.code}:${d.leadId}`} className="border-t border-hair">
                    <td className="px-4 py-3">
                      <a href={`/admin?lead=${d.leadId}`} className="font-semibold text-navy hover:underline">{d.nombre || "Sin nombre"}</a>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/admin?lead=${d.referidorLeadId}`} className="text-navy hover:underline">{d.referidorNombre || "Sin nombre"}</a>
                      <p className="tnums text-[11px] text-slate2">{d.code}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-ink">{d.producto || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-pill px-2 py-0.5 text-[11px] font-bold ${ESTADO_PILL_COLOR[d.status]}`}>{ESTADO_LABELS[d.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-slate2">{fmt(d.cotizadoAt)}</td>
                    <td className="px-4 py-3">
                      {d.pagadoReferidoAt ? <span className="font-semibold text-emerald-700">{fmt(d.pagadoReferidoAt)}</span> : <span className="text-slate2">pendiente</span>}
                    </td>
                    <td className="px-4 py-3">
                      {d.pagadoReferidorAt
                        ? <span className="font-semibold text-emerald-700">{fmt(d.pagadoReferidorAt)}</span>
                        : d.contratadoAt ? <span className="text-amber-700">en gracia</span> : <span className="text-slate2">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-[15px] font-bold text-navy">Top referidores</h2>
        {summary.topReferidores.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate2">Todavía no hay ningún código generado.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-card border border-hair bg-white">
            <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
              <thead className="bg-mist text-[11px] font-bold uppercase tracking-wide text-slate2">
                <tr>
                  <th className="px-4 py-3">Referidor</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3 text-right">Amigos</th>
                  <th className="px-4 py-3 text-right">Contratados</th>
                  <th className="px-4 py-3 text-right">Pagados</th>
                </tr>
              </thead>
              <tbody>
                {summary.topReferidores.map((r) => (
                  <tr key={r.code} className="border-t border-hair">
                    <td className="px-4 py-3">
                      <a href={`/admin?lead=${r.referidorLeadId}`} className="font-semibold text-navy hover:underline">{r.referidorNombre || "Sin nombre"}</a>
                    </td>
                    <td className="px-4 py-3 tnums text-ink">{r.code}</td>
                    <td className="px-4 py-3 text-right tnums text-ink">{r.totalConvertidos}</td>
                    <td className="px-4 py-3 text-right tnums text-ink">{r.contratados}</td>
                    <td className="px-4 py-3 text-right tnums font-semibold text-emerald-700">{r.pagados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatBox({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`rounded-card border p-3 ${alert ? "border-brand-red/40 bg-brand-red/5" : "border-hair bg-white"}`}>
      <p className={`text-[20px] font-extrabold tnums ${alert ? "text-brand-red-deep" : "text-navy"}`}>{value}</p>
      <p className="truncate text-[11px] font-medium text-slate2">{label}</p>
    </div>
  );
}
