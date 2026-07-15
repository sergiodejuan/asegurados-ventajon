"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { DEFAULT_THEME, type SiteTheme } from "@/lib/theme";

export default function AdminSeguimientoPage() {
  return (
    <AdminShell active="seguimiento">
      <SeguimientoAdmin />
    </AdminShell>
  );
}

function SeguimientoAdmin() {
  const { token } = useAdminToken();
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/theme", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setTheme(body.theme);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ gtmId: theme.gtmId }),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setTheme(body.theme);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      } else {
        setError(body.error ?? "No se pudo guardar.");
      }
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold text-navy">Seguimiento (Google Tag Manager)</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Conecta GA4 u otras etiquetas a través de un contenedor de Google Tag Manager.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">Google Tag Manager</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-slate2">
            Pega aquí el ID de tu contenedor de Google Tag Manager (formato GTM-XXXXXXX). Solo se carga
            para visitantes que hayan aceptado cookies analíticas o de marketing en el aviso de cookies.
          </p>
          <label className="mt-3 block">
            <span className="mb-1 block text-[13px] font-semibold text-ink">ID de contenedor GTM</span>
            <input
              value={theme.gtmId}
              onChange={(e) => setTheme((t) => ({ ...t, gtmId: e.target.value.trim() }))}
              placeholder="GTM-XXXXXXX"
              className="w-full max-w-xs rounded-card border border-hair bg-white px-4 py-3 text-[14px] tnums"
            />
          </label>
          <p className="mt-3 text-[12px] leading-relaxed text-slate2">
            El sitio ya envía eventos a <code className="rounded bg-mist px-1 py-0.5">dataLayer</code> listos para
            configurar en GTM/GA4: <code className="rounded bg-mist px-1 py-0.5">page_view</code> (navegación),{" "}
            <code className="rounded bg-mist px-1 py-0.5">generate_lead</code> (tarificador y &ldquo;quiero que me
            llamen&rdquo;) y <code className="rounded bg-mist px-1 py-0.5">whatsapp_click</code>. El{" "}
            <a href="/admin/utm" className="font-semibold text-navy underline">dashboard de UTM</a> del panel
            muestra la atribución interna (origen, campaña, página de aterrizaje) de cada lead.
          </p>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-end gap-3">
          <button onClick={save} disabled={saving || loading}
            className="flex items-center justify-center rounded-card bg-navy px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40">
            {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </main>
  );
}
