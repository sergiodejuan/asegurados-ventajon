"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import type { EmailTemplate } from "@/lib/leadEmailTemplates";

function fmt(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(iso)); }
  catch { return iso; }
}

export default function AdminEmailTemplatesPage() {
  return (
    <AdminShell active="plantillas-email">
      <EmailTemplatesAdmin />
    </AdminShell>
  );
}

function EmailTemplatesAdmin() {
  const { token } = useAdminToken();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/email-templates", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setTemplates(body.templates);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta plantilla? No se puede deshacer.")) return;
    const res = await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.ok) setTemplates((ts) => ts.filter((t) => t.id !== id));
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Plantillas de email</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Punto de partida para los correos que se envían a mano desde la ficha de un lead en /admin —
            con variables como {"{{nombre}}"} que se rellenan al enviar.
          </p>
        </div>
        <a href="/admin/configuracion/plantillas-email/nueva"
          className="shrink-0 rounded-card bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
          + Nueva plantilla
        </a>
      </div>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      <ul className="mt-5 flex flex-col gap-3">
        {templates.map((t) => (
          <li key={t.id} className="flex flex-col gap-3 rounded-card border border-hair bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-ink">{t.nombre || "(sin nombre)"}</p>
              <p className="mt-0.5 truncate text-[12px] text-slate2">{t.asunto || "Sin asunto"} · {fmt(t.updatedAt)}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <a href={`/admin/configuracion/plantillas-email/${t.id}`}
                className="rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
                Editar
              </a>
              <button onClick={() => remove(t.id)}
                className="rounded-pill px-3 py-1.5 text-[12px] font-semibold text-brand-red transition-colors hover:bg-brand-red/10">
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
