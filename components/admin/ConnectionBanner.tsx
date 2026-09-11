"use client";

export type ConnectionStatus = "ok" | "warn" | "off";

const STYLES: Record<ConnectionStatus, { wrap: string; dot: string; label: string }> = {
  ok: { wrap: "border-emerald-200 bg-emerald-50", dot: "bg-emerald-600", label: "text-emerald-800" },
  warn: { wrap: "border-amber-200 bg-amber-50", dot: "bg-amber-500", label: "text-amber-800" },
  off: { wrap: "border-brand-red/20 bg-brand-red/5", dot: "bg-brand-red", label: "text-brand-red-deep" },
};

// Aviso de conexión "real" (no lo que diga la documentación, sino lo que
// dicen las variables de entorno/almacén ahora mismo) que encabeza cada
// panel de /admin/integraciones.
export function ConnectionBanner({ status, title, detail }: { status: ConnectionStatus; title: string; detail?: string }) {
  const s = STYLES[status];
  return (
    <div className={`mt-4 flex items-start gap-3 rounded-card border p-3.5 ${s.wrap}`}>
      <span aria-hidden="true" className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
      <div className="min-w-0">
        <p className={`text-[14px] font-bold ${s.label}`}>{title}</p>
        {detail && <p className="mt-0.5 text-[13px] leading-relaxed text-slate2">{detail}</p>}
      </div>
    </div>
  );
}
