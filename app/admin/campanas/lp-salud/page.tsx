"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { SaveBar } from "@/components/admin/SaveBar";
import { ImageField } from "@/components/admin/ImageField";
import {
  DEFAULT_PAID_LANDING_SALUD, buildTarificadorHref,
  type PaidLandingSaludConfig, type PaidLandingProduct, type PaidLandingBenefit,
  type PaidLandingPartner, type PaidLandingComparativaRow,
} from "@/lib/paidLandingSalud";

// Editor de la landing PAID de salud (/lp/salud). Todas las secciones caben
// en una sola página para que el equipo de paid no tenga que saltar entre
// pantallas — como es una landing "de una tirada", editarla también debe
// serlo. Ver components/landings/PaidLandingSalud.tsx para el render final.

const ICON_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Sin icono" },
  { value: "shield", label: "Escudo" },
  { value: "life", label: "Corazón" },
  { value: "flower", label: "Flor / salud" },
  { value: "home", label: "Hogar" },
  { value: "car", label: "Coche" },
  { value: "compare", label: "Comparar" },
  { value: "doc", label: "Documento" },
  { value: "pin", label: "Ubicación" },
];

export default function AdminLpSaludPage() {
  return (
    <AdminShell active="lp-salud">
      <Editor />
    </AdminShell>
  );
}

function Editor() {
  const { token } = useAdminToken();
  const [config, setConfig] = useState<PaidLandingSaludConfig>(DEFAULT_PAID_LANDING_SALUD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/landings/lp-salud", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo cargar."); setLoading(false); return; }
      setConfig(body.config);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch("/api/admin/landings/lp-salud", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(config),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo guardar."); setSaving(false); return; }
      setConfig(body.config);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  const patchHero = (patch: Partial<PaidLandingSaludConfig["hero"]>) =>
    setConfig((c) => ({ ...c, hero: { ...c.hero, ...patch } }));
  const patchPorQue = (patch: Partial<PaidLandingSaludConfig["porQueElegir"]>) =>
    setConfig((c) => ({ ...c, porQueElegir: { ...c.porQueElegir, ...patch } }));
  const patchBanner = (patch: Partial<PaidLandingSaludConfig["bannerIntermedio"]>) =>
    setConfig((c) => ({ ...c, bannerIntermedio: { ...c.bannerIntermedio, ...patch } }));
  const patchProductosMeta = (patch: Partial<Omit<PaidLandingSaludConfig["productos"], "items">>) =>
    setConfig((c) => ({ ...c, productos: { ...c.productos, ...patch } }));
  const patchContrataTelefono = (patch: Partial<PaidLandingSaludConfig["contrataTelefono"]>) =>
    setConfig((c) => ({ ...c, contrataTelefono: { ...c.contrataTelefono, ...patch } }));
  const patchComparativa = (patch: Partial<PaidLandingSaludConfig["comparativa"]>) =>
    setConfig((c) => ({ ...c, comparativa: { ...c.comparativa, ...patch } }));
  const patchBeneficios = (patch: Partial<PaidLandingSaludConfig["beneficios"]>) =>
    setConfig((c) => ({ ...c, beneficios: { ...c.beneficios, ...patch } }));
  const patchRating = (patch: Partial<PaidLandingSaludConfig["rating"]>) =>
    setConfig((c) => ({ ...c, rating: { ...c.rating, ...patch } }));
  const patchFooter = (patch: Partial<PaidLandingSaludConfig["footer"]>) =>
    setConfig((c) => ({ ...c, footer: { ...c.footer, ...patch } }));
  const patchUtm = (patch: Partial<PaidLandingSaludConfig["utm"]>) =>
    setConfig((c) => ({ ...c, utm: { ...c.utm, ...patch } }));

  if (loading) return <main className="mx-auto max-w-3xl px-5 py-6"><p className="text-[13px] text-slate2">Cargando…</p></main>;

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-navy">Landing paid — salud</h1>
        <a href="/lp/salud" target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-navy underline">
          Ver landing en producción ↗
        </a>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Edita la landing servida en <code className="rounded bg-mist px-1.5 py-0.5 text-[12px]">/lp/salud</code>.
        Va con <strong>noindex</strong> — pensada para pegar directa como URL destino de anuncios en Google/Meta Ads.
      </p>
      {error && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{error}</p>}

      {/* ---------------------- Metadatos y teléfono ---------------------- */}
      <Section title="Metadatos y contacto general">
        <Field label="Meta title (etiqueta <title>)" value={config.metaTitle} onChange={(v) => setConfig((c) => ({ ...c, metaTitle: v }))} />
        <Field label="Meta description" value={config.metaDescription} onChange={(v) => setConfig((c) => ({ ...c, metaDescription: v }))} textarea />
        <Field label="Teléfono comercial (aparece en top bar y bottom bar)" value={config.phone} onChange={(v) => setConfig((c) => ({ ...c, phone: v }))} />
      </Section>

      {/* ---------------------- Hero ---------------------- */}
      <Section title="Hero (arriba del todo)">
        <Field label="Kicker (opcional)" value={config.hero.kicker} onChange={(v) => patchHero({ kicker: v })} />
        <Field label="Titular (H1)" value={config.hero.h1} onChange={(v) => patchHero({ h1: v })} />
        <Field
          label={`Resaltar en rojo dentro del H1 (por defecto "Seguro de Salud")`}
          value={config.hero.h1Highlight}
          onChange={(v) => patchHero({ h1Highlight: v })}
        />
        <Field label="Precio destacado" value={config.hero.priceHighlight} onChange={(v) => patchHero({ priceHighlight: v })} />
        <Field label="Frase de prueba social" value={config.hero.socialProof} onChange={(v) => patchHero({ socialProof: v })} />
        <ImageOrUrlField label="Imagen del hero" value={config.hero.imageUrl} onChange={(v) => patchHero({ imageUrl: v })} preview="h-24 w-32" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Texto CTA calcular" value={config.hero.ctaCalcularLabel} onChange={(v) => patchHero({ ctaCalcularLabel: v })} />
          <Field label="Texto CTA llamar" value={config.hero.ctaLlamarLabel} onChange={(v) => patchHero({ ctaLlamarLabel: v })} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate2">
          El logo del navbar se toma automáticamente de <a className="underline" href="/admin/diseno/logos">Diseño → Logos</a>.
        </p>
      </Section>

      {/* ---------------------- Partners / hospitales ---------------------- */}
      <Section title="¿Por qué elegirnos? — logos de partners">
        <Field label="Titular de la sección" value={config.porQueElegir.title} onChange={(v) => patchPorQue({ title: v })} />
        <Field label="Subtítulo" value={config.porQueElegir.subtitle} onChange={(v) => patchPorQue({ subtitle: v })} textarea />
        <div className="mt-3 space-y-3">
          {config.porQueElegir.partners.map((p, i) => (
            <div key={i} className="rounded-card border border-hair p-3">
              <div className="flex items-center gap-2">
                <input value={p.name} placeholder="Nombre del partner"
                  onChange={(e) => {
                    const next = [...config.porQueElegir.partners]; next[i] = { ...p, name: e.target.value };
                    patchPorQue({ partners: next });
                  }}
                  className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                <button type="button" onClick={() => {
                  const next = config.porQueElegir.partners.filter((_, j) => j !== i);
                  patchPorQue({ partners: next });
                }} className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
              <ImageOrUrlField label="Logo" value={p.imageUrl} onChange={(v) => {
                const next = [...config.porQueElegir.partners]; next[i] = { ...p, imageUrl: v };
                patchPorQue({ partners: next });
              }} preview="h-10 w-20" />
            </div>
          ))}
          <button type="button" onClick={() => patchPorQue({ partners: [...config.porQueElegir.partners, { name: "", imageUrl: "" } as PaidLandingPartner] })}
            className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
            + Añadir partner
          </button>
        </div>
      </Section>

      {/* ---------------------- Beneficios ---------------------- */}
      <Section title="Beneficios (lista con iconos)">
        <Field label="Titular" value={config.beneficios.title} onChange={(v) => patchBeneficios({ title: v })} />
        <div className="mt-3 space-y-2">
          {config.beneficios.items.map((b, i) => (
            <div key={i} className="flex gap-2">
              <select value={b.icon}
                onChange={(e) => {
                  const next = [...config.beneficios.items]; next[i] = { ...b, icon: e.target.value };
                  patchBeneficios({ items: next });
                }}
                className="w-32 shrink-0 rounded border border-hair bg-white px-2 py-1.5 text-[12px]">
                {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={b.text}
                onChange={(e) => {
                  const next = [...config.beneficios.items]; next[i] = { ...b, text: e.target.value };
                  patchBeneficios({ items: next });
                }}
                className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
              <button type="button" onClick={() => {
                const next = config.beneficios.items.filter((_, j) => j !== i);
                patchBeneficios({ items: next });
              }} className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
            </div>
          ))}
          <button type="button" onClick={() => patchBeneficios({ items: [...config.beneficios.items, { icon: "shield", text: "" } as PaidLandingBenefit] })}
            className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
            + Añadir beneficio
          </button>
        </div>
      </Section>

      {/* ---------------------- Banner intermedio ---------------------- */}
      <Section title="Banner intermedio (CTA a media página)">
        <Field label="Titular" value={config.bannerIntermedio.title} onChange={(v) => patchBanner({ title: v })} />
        <Field label="Subtítulo" value={config.bannerIntermedio.subtitle} onChange={(v) => patchBanner({ subtitle: v })} textarea />
        <ImageOrUrlField label="Imagen del banner" value={config.bannerIntermedio.imageUrl} onChange={(v) => patchBanner({ imageUrl: v })} preview="h-24 w-32" />
      </Section>

      {/* ---------------------- Productos ---------------------- */}
      <Section title="Tipos de seguros (tarjetas)">
        <Field label="Titular" value={config.productos.title} onChange={(v) => patchProductosMeta({ title: v })} />
        <Field label="Introducción" value={config.productos.intro} onChange={(v) => patchProductosMeta({ intro: v })} textarea />
        <div className="mt-3 space-y-3">
          {config.productos.items.map((p, i) => (
            <div key={i} className="rounded-card border border-hair p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-slate2">Tarjeta #{i + 1}</p>
                <button type="button" onClick={() => setConfig((c) => ({ ...c, productos: { ...c.productos, items: c.productos.items.filter((_, j) => j !== i) } }))}
                  className="text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                <FieldCompact label="ID (utm_content)" value={p.id} onChange={(v) => updateProducto(i, { id: v })} />
                <FieldCompact label="Título" value={p.title} onChange={(v) => updateProducto(i, { title: v })} />
                <FieldCompact label="Etiqueta de precio (Desde / Por)" value={p.priceLabel} onChange={(v) => updateProducto(i, { priceLabel: v })} />
                <FieldCompact label="Precio (texto libre)" value={p.price} onChange={(v) => updateProducto(i, { price: v })} />
                <FieldCompact label="CTA texto" value={p.ctaLabel} onChange={(v) => updateProducto(i, { ctaLabel: v })} />
                <label className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-slate2">CTA acción</span>
                  <select value={p.ctaAction} onChange={(e) => updateProducto(i, { ctaAction: e.target.value as PaidLandingProduct["ctaAction"] })}
                    className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]">
                    <option value="calcular">Calcula tu seguro (→ tarificador)</option>
                    <option value="llamar">Te llamamos (→ modal)</option>
                  </select>
                </label>
              </div>
              <FieldCompact label="Descripción" value={p.description} onChange={(v) => updateProducto(i, { description: v })} textarea />
              <ImageOrUrlField
                label="Imagen de fondo de la tarjeta (opcional)"
                value={p.imageUrl}
                onChange={(v) => updateProducto(i, { imageUrl: v })}
                preview="h-16 w-24"
              />
              {p.ctaAction === "calcular" && (
                <p className="mt-2 break-all text-[11px] text-slate2">
                  URL final del botón: <code className="rounded bg-mist px-1 py-0.5">{buildTarificadorHref(config, p.id)}</code>
                </p>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setConfig((c) => ({ ...c, productos: { ...c.productos, items: [...c.productos.items, { id: `producto-${c.productos.items.length + 1}`, title: "", priceLabel: "Desde", price: "", description: "", ctaLabel: "Calcula tu seguro", ctaAction: "calcular", imageUrl: "" } as PaidLandingProduct] } }))}
            className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
            + Añadir tarjeta de producto
          </button>
        </div>
      </Section>

      {/* ---------------------- Contrata por teléfono ---------------------- */}
      <Section title="Bloque «Contrata por teléfono»">
        <Field label="Titular" value={config.contrataTelefono.title} onChange={(v) => patchContrataTelefono({ title: v })} />
        <Field label="Texto del botón" value={config.contrataTelefono.ctaLabel} onChange={(v) => patchContrataTelefono({ ctaLabel: v })} />
      </Section>

      {/* ---------------------- Comparativa ---------------------- */}
      <Section title="Tabla comparativa">
        <Field label="Titular" value={config.comparativa.title} onChange={(v) => patchComparativa({ title: v })} />
        <Field label="Subtítulo (opcional)" value={config.comparativa.subtitle} onChange={(v) => patchComparativa({ subtitle: v })} textarea />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <FieldCompact label="Filas visibles al inicio (0 = todas)" value={String(config.comparativa.initialVisibleRows)} onChange={(v) => patchComparativa({ initialVisibleRows: Math.max(0, Number(v) || 0) })} />
          <FieldCompact label="Texto «Ver más»" value={config.comparativa.verMasLabel} onChange={(v) => patchComparativa({ verMasLabel: v })} />
          <FieldCompact label="Texto «Ver menos»" value={config.comparativa.verMenosLabel} onChange={(v) => patchComparativa({ verMenosLabel: v })} />
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-semibold text-slate2">Columnas (productos comparados)</p>
          <div className="space-y-1.5">
            {config.comparativa.columns.map((col, i) => (
              <div key={i} className="flex gap-2">
                <input value={col} onChange={(e) => {
                  const next = [...config.comparativa.columns]; next[i] = e.target.value;
                  patchComparativa({ columns: next });
                }} className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                <button type="button" onClick={() => {
                  const nextCols = config.comparativa.columns.filter((_, j) => j !== i);
                  const nextRows = config.comparativa.rows.map((r) => ({ ...r, incluidoEn: r.incluidoEn.filter((_, j) => j !== i) }));
                  patchComparativa({ columns: nextCols, rows: nextRows });
                }} className="text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
            ))}
            <button type="button" onClick={() => {
              const nextCols = [...config.comparativa.columns, "Nueva columna"];
              const nextRows = config.comparativa.rows.map((r) => ({ ...r, incluidoEn: [...r.incluidoEn, false] }));
              patchComparativa({ columns: nextCols, rows: nextRows });
            }} className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
              + Añadir columna
            </button>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-semibold text-slate2">Filas</p>
          <div className="space-y-1.5">
            {config.comparativa.rows.map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-card border border-hair p-2">
                <input value={row.label} placeholder="Concepto" onChange={(e) => {
                  const next = [...config.comparativa.rows]; next[i] = { ...row, label: e.target.value };
                  patchComparativa({ rows: next });
                }} className="min-w-[180px] flex-1 rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                {config.comparativa.columns.map((_col, j) => (
                  <label key={j} className="inline-flex items-center gap-1 text-[12px] text-slate2">
                    <input type="checkbox" checked={row.incluidoEn[j] ?? false}
                      onChange={(e) => {
                        const next = [...config.comparativa.rows];
                        const inc = [...row.incluidoEn];
                        while (inc.length < config.comparativa.columns.length) inc.push(false);
                        inc[j] = e.target.checked;
                        next[i] = { ...row, incluidoEn: inc };
                        patchComparativa({ rows: next });
                      }} />
                    <span className="text-[11px]">col {j + 1}</span>
                  </label>
                ))}
                <button type="button" onClick={() => {
                  const next = config.comparativa.rows.filter((_, j) => j !== i);
                  patchComparativa({ rows: next });
                }} className="text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
            ))}
            <button type="button" onClick={() => {
              const empty: PaidLandingComparativaRow = { label: "", incluidoEn: config.comparativa.columns.map(() => false) };
              patchComparativa({ rows: [...config.comparativa.rows, empty] });
            }} className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
              + Añadir fila
            </button>
          </div>
        </div>
      </Section>

      {/* ---------------------- Rating ---------------------- */}
      <Section title="Rating">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor" value={config.rating.valor} onChange={(v) => patchRating({ valor: v })} />
          <Field label="Nº valoraciones" value={config.rating.numValoraciones} onChange={(v) => patchRating({ numValoraciones: v })} />
        </div>
      </Section>

      {/* ---------------------- Footer ---------------------- */}
      <Section title="Footer y disclaimer legal">
        <Field label="Disclaimer principal" value={config.footer.disclaimer} onChange={(v) => patchFooter({ disclaimer: v })} textarea />
        <Field label="Nota legal (segundo párrafo)" value={config.footer.notaLegal} onChange={(v) => patchFooter({ notaLegal: v })} textarea />
        <Field label="Copyright" value={config.footer.copyright} onChange={(v) => patchFooter({ copyright: v })} />
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] font-semibold text-slate2">Enlaces del footer</p>
          <div className="space-y-1.5">
            {config.footer.enlaces.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input value={l.label} placeholder="Texto" onChange={(e) => {
                  const next = [...config.footer.enlaces]; next[i] = { ...l, label: e.target.value };
                  patchFooter({ enlaces: next });
                }} className="w-1/2 rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                <input value={l.href} placeholder="/legal" onChange={(e) => {
                  const next = [...config.footer.enlaces]; next[i] = { ...l, href: e.target.value };
                  patchFooter({ enlaces: next });
                }} className="w-1/2 rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                <button type="button" onClick={() => {
                  const next = config.footer.enlaces.filter((_, j) => j !== i);
                  patchFooter({ enlaces: next });
                }} className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
            ))}
            <button type="button" onClick={() => patchFooter({ enlaces: [...config.footer.enlaces, { label: "", href: "" }] })}
              className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
              + Añadir enlace
            </button>
          </div>
        </div>
      </Section>

      {/* ---------------------- UTM ---------------------- */}
      <Section title="UTM automática de esta landing">
        <p className="text-[12px] leading-relaxed text-slate2">
          Estos valores se inyectan como query-string en cada CTA «Calcula tu seguro» —
          así todos los leads generados por esta landing quedan atribuidos en el CRM y
          en <a className="underline" href="/admin/utm">/admin/utm</a>.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <FieldCompact label="utm_source" value={config.utm.source} onChange={(v) => patchUtm({ source: v })} />
          <FieldCompact label="utm_medium" value={config.utm.medium} onChange={(v) => patchUtm({ medium: v })} />
          <FieldCompact label="utm_campaign" value={config.utm.campaign} onChange={(v) => patchUtm({ campaign: v })} />
        </div>
        <p className="mt-2 break-all text-[11px] text-slate2">
          URL de ejemplo: <code className="rounded bg-mist px-1 py-0.5">{buildTarificadorHref(config)}</code>
        </p>
      </Section>

      <SaveBar saving={saving} saved={saved} onSave={save} />
    </main>
  );

  function updateProducto(i: number, patch: Partial<PaidLandingProduct>) {
    setConfig((c) => {
      const next = [...c.productos.items];
      next[i] = { ...next[i], ...patch };
      return { ...c, productos: { ...c.productos, items: next } };
    });
  }
}

/* ------------------------------ UI primitives ------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-[20px] border border-hair bg-white p-5">
      <h2 className="text-[15px] font-bold text-navy">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <label className="mt-3 block first:mt-0">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
          className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
      )}
    </label>
  );
}

function FieldCompact({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <label className="mt-2 block first:mt-0">
      <span className="mb-1 block text-[12px] font-semibold text-slate2">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
          className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
      )}
    </label>
  );
}

// Imagen: acepta subida (comprimida a data URL, ImageField ya lo hace) O URL
// externa pegada directamente. Cambia el valor final del mismo campo — la
// landing pública consume `imageUrl` sin importar de dónde venga.
function ImageOrUrlField({ label, value, onChange, preview }: { label: string; value: string; onChange: (v: string) => void; preview: string }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[13px] font-semibold text-ink">{label}</p>
      <ImageField label="Subir archivo" hint="Se comprime a 1200px y se guarda como data URI en el propio documento del CMS." value={value.startsWith("data:") ? value : ""} onChange={onChange} maxWidth={1200} mime="image/jpeg" preview={preview} />
      <label className="mt-2 block">
        <span className="mb-1 block text-[12px] font-semibold text-slate2">…o pega una URL externa</span>
        <input value={value.startsWith("data:") ? "" : value} onChange={(e) => onChange(e.target.value)}
          placeholder="https://cdn.tudominio.com/…"
          className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
      </label>
    </div>
  );
}
