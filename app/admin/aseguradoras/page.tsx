"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type Ramo = "salud" | "vida" | "auto" | "decesos";
type Brand = { name: string; key: string; hidden: boolean; imageUrl?: string; fuentes: string[] };

const RAMOS: { id: Ramo; label: string }[] = [
  { id: "salud", label: "Salud" },
  { id: "vida", label: "Vida" },
  { id: "auto", label: "Auto" },
  { id: "decesos", label: "Decesos" },
];

export default function AdminAseguradorasPage() {
  return (
    <AdminShell active="aseguradoras">
      <AseguradorasAdmin />
    </AdminShell>
  );
}

function AseguradorasAdmin() {
  const { token } = useAdminToken();
  const [ramo, setRamo] = useState<Ramo>("salud");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [vendorsError, setVendorsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/admin/aseguradoras?producto=${ramo}`, { headers: { "x-admin-token": token } })
      .then((r) => r.json())
      .then((body) => { if (alive && body.ok) { setBrands(body.brands); setVendorsError(body.vendorsError ?? null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [ramo, token]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(needle));
  }, [brands, q]);

  const visibles = brands.filter((b) => !b.hidden).length;

  async function toggle(b: Brand) {
    setBusy(b.key);
    // Optimista: reflejamos el cambio y revertimos si el POST falla.
    setBrands((prev) => prev.map((x) => x.key === b.key ? { ...x, hidden: !x.hidden } : x));
    try {
      const res = await fetch("/api/admin/aseguradoras", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ producto: ramo, brand: b.name, hidden: !b.hidden }),
      });
      const body = await res.json();
      if (!body.ok) throw new Error();
    } catch {
      setBrands((prev) => prev.map((x) => x.key === b.key ? { ...x, hidden: b.hidden } : x));
    } finally { setBusy(null); }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-[20px] font-extrabold text-navy">Aseguradoras en la comparativa</h1>
        <p className="text-[13px] leading-relaxed text-slate2">
          Elige qué marcas se muestran en la comparativa de cada ramo. El control es único: afecta tanto a los
          <span className="font-semibold text-ink"> precios reales de Codeoscopic</span> como al
          <span className="font-semibold text-ink"> catálogo manual</span>. Ocultar una marca la esconde de la web;
          en el back office se siguen viendo todas.
        </p>
      </div>

      {/* Ramos */}
      <div className="mt-4 flex flex-wrap gap-2">
        {RAMOS.map((r) => (
          <button key={r.id} type="button" onClick={() => { setRamo(r.id); setQ(""); }}
            className={`rounded-pill px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${ramo === r.id ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-[13px] text-slate2">Cargando aseguradoras…</p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar aseguradora…"
              className="w-full max-w-xs rounded-card border border-hair bg-white px-3 py-2 text-[13px]" />
            <span className="shrink-0 text-[12px] text-slate2">{visibles} visibles · {brands.length - visibles} ocultas</span>
          </div>

          {vendorsError && (
            <p className="mt-2 text-[12px] text-slate2">
              No se pudo cargar el listado de compañías de Codeoscopic ({vendorsError}). Se muestran las del catálogo manual; podrás ocultar el resto cuando aparezcan en precios reales.
            </p>
          )}

          {brands.length === 0 ? (
            <p className="mt-6 text-[13px] text-slate2">Aún no hay aseguradoras conocidas para este ramo. Aparecerán al añadir productos al catálogo o al recibir precios reales.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {filtered.map((b) => (
                <li key={b.key} className={`flex items-center justify-between gap-3 rounded-card border p-3 transition-colors ${b.hidden ? "border-hair bg-mist/40" : "border-hair bg-white"}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    {b.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={b.imageUrl} alt={b.name} className="h-7 max-w-[84px] w-auto shrink-0 object-contain" />
                      : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy/10 text-[12px] font-bold text-navy">{b.name.charAt(0).toUpperCase()}</span>}
                    <div className="flex min-w-0 flex-col">
                      <span className={`truncate text-[14px] font-semibold ${b.hidden ? "text-slate2" : "text-ink"}`}>{b.name}</span>
                      <span className="text-[11px] text-slate2">{b.fuentes.join(" · ")}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => toggle(b)} disabled={busy === b.key}
                    className={`shrink-0 rounded-pill px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${b.hidden ? "bg-navy text-white hover:bg-navy-deep" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
                    {busy === b.key ? "…" : b.hidden ? "Mostrar" : "Ocultar"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
