"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { SaveBar } from "@/components/admin/SaveBar";
import { ImageField } from "@/components/admin/ImageField";
import {
  DEFAULT_LANDING_SALUD, blankLandingFor, buildTarificadorHref, slugifyLandingTitle, PRODUCTO_TARIFICADOR_HREF,
  type Landing, type LandingProducto, type LandingProduct, type LandingBenefit,
  type LandingPartner, type LandingComparativaRow,
} from "@/lib/landings";

// Editor de una landing PAID (/lp/[slug]). Adaptado del antiguo editor único
// de /lp/salud (ver components/landings/PaidLanding.tsx para el render
// final) — mismas secciones de contenido, ahora reutilizables por landing,
// con slug/ramo/estado propios y un botón de duplicar.

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

const PRODUCTO_OPTIONS: { value: LandingProducto; label: string }[] = [
  { value: "salud", label: "Salud" },
  { value: "vida", label: "Vida" },
  { value: "auto", label: "Auto" },
  { value: "decesos", label: "Decesos" },
  { value: "hogar", label: "Hogar" },
];

export default function AdminLandingEditorPage({ params }: { params: { id: string } }) {
  return (
    <AdminShell active="landings">
      <Editor id={params.id} />
    </AdminShell>
  );
}

function Editor({ id }: { id: string }) {
  const { token } = useAdminToken();
  const router = useRouter();
  const isNew = id === "nueva";
  const [landing, setLanding] = useState<Landing>(DEFAULT_LANDING_SALUD);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "reserved">("idle");
  const [duplicating, setDuplicating] = useState(false);

  const load = useCallback(async () => {
    if (isNew) { setLanding({ ...DEFAULT_LANDING_SALUD, ...blankLandingFor("salud"), id: "", slug: "" } as Landing); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/landings/${id}`, { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo cargar."); setLoading(false); return; }
      setLanding(body.landing);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [id, isNew, token]);

  useEffect(() => { load(); }, [load]);

  // Comprobación de disponibilidad del slug (solo hint visual — la
  // comprobación autoritativa está en el propio guardado).
  useEffect(() => {
    if (!landing.slug) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug: landing.slug, ...(isNew ? {} : { excludeId: id }) });
        const res = await fetch(`/api/admin/landings/slug-check?${params.toString()}`, { headers: { "x-admin-token": token } });
        const body = await res.json();
        if (!body.ok) { setSlugStatus("idle"); return; }
        setSlugStatus(body.available ? "available" : body.reason === "reserved" ? "reserved" : "taken");
      } catch { setSlugStatus("idle"); }
    }, 400);
    return () => clearTimeout(t);
  }, [landing.slug, id, isNew, token]);

  function setH1(h1: string) {
    setLanding((l) => ({
      ...l,
      hero: { ...l.hero, h1 },
      slug: slugTouched ? l.slug : slugifyLandingTitle(h1),
    }));
  }
  function setProducto(producto: LandingProducto) {
    setLanding((l) => ({ ...l, producto }));
  }

  async function save() {
    if (!landing.hero.h1.trim()) { setError("Falta el titular (H1) del hero."); return; }
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch(isNew ? "/api/admin/landings" : `/api/admin/landings/${id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(landing),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo guardar."); setSaving(false); return; }
      setLanding(body.landing);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      if (isNew) router.push(`/admin/campanas/landings/${body.landing.id}`);
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  async function remove() {
    if (isNew || !confirm("¿Eliminar esta landing? No se puede deshacer.")) return;
    const res = await fetch(`/api/admin/landings/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.ok) router.push("/admin/campanas/landings");
  }

  async function duplicate() {
    if (isNew) return;
    const newSlug = window.prompt("Slug de la copia (se servirá en /lp/<slug>)", `${landing.slug}-copia`);
    if (!newSlug) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/admin/landings/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ newSlug }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) { alert(body.error ?? "No se pudo duplicar."); setDuplicating(false); return; }
      router.push(`/admin/campanas/landings/${body.landing.id}`);
    } catch { alert("Error de conexión."); setDuplicating(false); }
  }

  const patchHero = (patch: Partial<Landing["hero"]>) => setLanding((l) => ({ ...l, hero: { ...l.hero, ...patch } }));
  const patchPorQue = (patch: Partial<Landing["porQueElegir"]>) => setLanding((l) => ({ ...l, porQueElegir: { ...l.porQueElegir, ...patch } }));
  const patchBanner = (patch: Partial<Landing["bannerIntermedio"]>) => setLanding((l) => ({ ...l, bannerIntermedio: { ...l.bannerIntermedio, ...patch } }));
  const patchProductosMeta = (patch: Partial<Omit<Landing["productos"], "items">>) => setLanding((l) => ({ ...l, productos: { ...l.productos, ...patch } }));
  const patchContrataTelefono = (patch: Partial<Landing["contrataTelefono"]>) => setLanding((l) => ({ ...l, contrataTelefono: { ...l.contrataTelefono, ...patch } }));
  const patchComparativa = (patch: Partial<Landing["comparativa"]>) => setLanding((l) => ({ ...l, comparativa: { ...l.comparativa, ...patch } }));
  const patchBeneficios = (patch: Partial<Landing["beneficios"]>) => setLanding((l) => ({ ...l, beneficios: { ...l.beneficios, ...patch } }));
  const patchRating = (patch: Partial<Landing["rating"]>) => setLanding((l) => ({ ...l, rating: { ...l.rating, ...patch } }));
  const patchFooter = (patch: Partial<Landing["footer"]>) => setLanding((l) => ({ ...l, footer: { ...l.footer, ...patch } }));
  const patchUtm = (patch: Partial<Landing["utm"]>) => setLanding((l) => ({ ...l, utm: { ...l.utm, ...patch } }));

  if (loading) return <main className="mx-auto max-w-3xl px-5 py-6"><p className="text-[13px] text-slate2">Cargando…</p></main>;

  const isSalud = landing.producto === "salud";

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
      <a href="/admin/campanas/landings" className="text-[13px] font-semibold text-navy">← Volver al listado</a>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-navy">{isNew ? "Nueva landing" : "Editar landing"}</h1>
        <div className="flex overflow-hidden rounded-pill border border-hair">
          {(["borrador", "publicado"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setLanding((l) => ({ ...l, status: s }))}
              className={`px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors ${landing.status === s ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      {!isNew && (
        <a href={`/lp/${landing.slug}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[13px] font-semibold text-navy underline">
          Ver landing en producción ↗
        </a>
      )}
      {error && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{error}</p>}

      {/* ---------------------- Slug y ramo ---------------------- */}
      <Section title="URL y ramo">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Slug (URL: /lp/…)</span>
          <input value={landing.slug}
            onChange={(e) => { setSlugTouched(true); setLanding((l) => ({ ...l, slug: slugifyLandingTitle(e.target.value) })); }}
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
          {slugStatus === "checking" && <p className="mt-1 text-[12px] text-slate2">Comprobando disponibilidad…</p>}
          {slugStatus === "available" && <p className="mt-1 text-[12px] font-medium text-emerald-700">Disponible.</p>}
          {slugStatus === "taken" && <p className="mt-1 text-[12px] font-medium text-brand-red">Ya hay otra landing con este slug.</p>}
          {slugStatus === "reserved" && <p className="mt-1 text-[12px] font-medium text-brand-red">Ese slug está reservado, elige otro.</p>}
        </label>
        <label className="mt-4 block max-w-xs">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Ramo</span>
          <select value={landing.producto} onChange={(e) => setProducto(e.target.value as LandingProducto)}
            className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]">
            {PRODUCTO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate2">
            {landing.producto === "salud"
              ? "El CTA \"Calcular precio\" abre el tarificador embebido propio de esta landing (varias modalidades, mínima fricción)."
              : landing.producto === "hogar"
                ? "Sin tarificador propio: el CTA \"Calcular precio\" lleva a \"Quiero que me llamen\"."
                : `El CTA "Calcular precio" lleva directamente a ${PRODUCTO_TARIFICADOR_HREF[landing.producto]} (tarificador ya existente del site), con la UTM y el slug de esta landing para poder atribuir el lead.`}
          </p>
        </label>
      </Section>

      {/* ---------------------- Metadatos y teléfono ---------------------- */}
      <Section title="Metadatos y contacto general">
        <Field label="Meta title (etiqueta <title>)" value={landing.metaTitle} onChange={(v) => setLanding((l) => ({ ...l, metaTitle: v }))} />
        <Field label="Meta description" value={landing.metaDescription} onChange={(v) => setLanding((l) => ({ ...l, metaDescription: v }))} textarea />
        <Field label="Teléfono comercial (aparece en top bar y bottom bar)" value={landing.phone} onChange={(v) => setLanding((l) => ({ ...l, phone: v }))} />
        <label className="mt-4 flex items-start gap-3 rounded-card border border-hair bg-white p-3">
          <input type="checkbox" checked={landing.hideAssistant}
            onChange={(e) => setLanding((l) => ({ ...l, hideAssistant: e.target.checked }))}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-hair" />
          <span className="text-[13px] leading-relaxed text-ink">
            <span className="font-semibold text-navy">Ocultar el widget asistente en esta landing</span>
            <span className="mt-0.5 block text-[12px] text-slate2">
              Cuando está activado, el asistente flotante no aparece en <code className="rounded bg-mist px-1 py-0.5">/lp/{landing.slug || "…"}</code>.
            </span>
          </span>
        </label>
      </Section>

      {/* ---------------------- Hero ---------------------- */}
      <Section title="Hero (arriba del todo)">
        <Field label="Kicker (opcional)" value={landing.hero.kicker} onChange={(v) => patchHero({ kicker: v })} />
        <Field label="Titular (H1)" value={landing.hero.h1} onChange={setH1} />
        <Field
          label={`Resaltar en rojo dentro del H1`}
          value={landing.hero.h1Highlight}
          onChange={(v) => patchHero({ h1Highlight: v })}
        />
        <Field label="Precio destacado" value={landing.hero.priceHighlight} onChange={(v) => patchHero({ priceHighlight: v })} />
        <Field label="Frase de prueba social" value={landing.hero.socialProof} onChange={(v) => patchHero({ socialProof: v })} />
        <ImageOrUrlField label="Imagen del hero" value={landing.hero.imageUrl} onChange={(v) => patchHero({ imageUrl: v })} preview="h-24 w-32" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Texto CTA calcular" value={landing.hero.ctaCalcularLabel} onChange={(v) => patchHero({ ctaCalcularLabel: v })} />
          <Field label="Texto CTA llamar" value={landing.hero.ctaLlamarLabel} onChange={(v) => patchHero({ ctaLlamarLabel: v })} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate2">
          El logo del navbar se toma automáticamente de <a className="underline" href="/admin/diseno/logos">Diseño → Logos</a>.
        </p>
      </Section>

      {/* ---------------------- Partners / hospitales ---------------------- */}
      <Section title="¿Por qué elegirnos? — logos de partners">
        <Field label="Titular de la sección" value={landing.porQueElegir.title} onChange={(v) => patchPorQue({ title: v })} />
        <Field label="Subtítulo" value={landing.porQueElegir.subtitle} onChange={(v) => patchPorQue({ subtitle: v })} textarea />
        <div className="mt-3 space-y-3">
          {landing.porQueElegir.partners.map((p, i) => (
            <div key={i} className="rounded-card border border-hair p-3">
              <div className="flex items-center gap-2">
                <input value={p.name} placeholder="Nombre del partner"
                  onChange={(e) => {
                    const next = [...landing.porQueElegir.partners]; next[i] = { ...p, name: e.target.value };
                    patchPorQue({ partners: next });
                  }}
                  className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                <button type="button" onClick={() => {
                  const next = landing.porQueElegir.partners.filter((_, j) => j !== i);
                  patchPorQue({ partners: next });
                }} className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
              <ImageOrUrlField label="Logo" value={p.imageUrl} onChange={(v) => {
                const next = [...landing.porQueElegir.partners]; next[i] = { ...p, imageUrl: v };
                patchPorQue({ partners: next });
              }} preview="h-10 w-20" />
            </div>
          ))}
          <button type="button" onClick={() => patchPorQue({ partners: [...landing.porQueElegir.partners, { name: "", imageUrl: "" } as LandingPartner] })}
            className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
            + Añadir partner
          </button>
        </div>
      </Section>

      {/* ---------------------- Beneficios ---------------------- */}
      <Section title="Beneficios (lista con iconos)">
        <Field label="Titular" value={landing.beneficios.title} onChange={(v) => patchBeneficios({ title: v })} />
        <div className="mt-3 space-y-2">
          {landing.beneficios.items.map((b, i) => (
            <div key={i} className="flex gap-2">
              <select value={b.icon}
                onChange={(e) => {
                  const next = [...landing.beneficios.items]; next[i] = { ...b, icon: e.target.value };
                  patchBeneficios({ items: next });
                }}
                className="w-32 shrink-0 rounded border border-hair bg-white px-2 py-1.5 text-[12px]">
                {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={b.text}
                onChange={(e) => {
                  const next = [...landing.beneficios.items]; next[i] = { ...b, text: e.target.value };
                  patchBeneficios({ items: next });
                }}
                className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
              <button type="button" onClick={() => {
                const next = landing.beneficios.items.filter((_, j) => j !== i);
                patchBeneficios({ items: next });
              }} className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
            </div>
          ))}
          <button type="button" onClick={() => patchBeneficios({ items: [...landing.beneficios.items, { icon: "shield", text: "" } as LandingBenefit] })}
            className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
            + Añadir beneficio
          </button>
        </div>
      </Section>

      {/* ---------------------- Banner intermedio ---------------------- */}
      <Section title="Banner intermedio (CTA a media página)">
        <Field label="Titular" value={landing.bannerIntermedio.title} onChange={(v) => patchBanner({ title: v })} />
        <Field label="Subtítulo" value={landing.bannerIntermedio.subtitle} onChange={(v) => patchBanner({ subtitle: v })} textarea />
        <ImageOrUrlField label="Imagen del banner" value={landing.bannerIntermedio.imageUrl} onChange={(v) => patchBanner({ imageUrl: v })} preview="h-24 w-32" />
      </Section>

      {/* ---------------------- Productos (solo salud) ---------------------- */}
      {isSalud && (
        <Section title="Tipos de seguros (tarjetas)">
          <Field label="Titular" value={landing.productos.title} onChange={(v) => patchProductosMeta({ title: v })} />
          <Field label="Introducción" value={landing.productos.intro} onChange={(v) => patchProductosMeta({ intro: v })} textarea />
          <div className="mt-3 space-y-3">
            {landing.productos.items.map((p, i) => (
              <div key={i} className="rounded-card border border-hair p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-slate2">Tarjeta #{i + 1}</p>
                  <button type="button" onClick={() => setLanding((l) => ({ ...l, productos: { ...l.productos, items: l.productos.items.filter((_, j) => j !== i) } }))}
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
                    <select value={p.ctaAction} onChange={(e) => updateProducto(i, { ctaAction: e.target.value as LandingProduct["ctaAction"] })}
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
                    URL final del botón: <code className="rounded bg-mist px-1 py-0.5">{buildTarificadorHref(landing, p.id)}</code>
                  </p>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setLanding((l) => ({ ...l, productos: { ...l.productos, items: [...l.productos.items, { id: `producto-${l.productos.items.length + 1}`, title: "", priceLabel: "Desde", price: "", description: "", ctaLabel: "Calcula tu seguro", ctaAction: "calcular", imageUrl: "" } as LandingProduct] } }))}
              className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
              + Añadir tarjeta de producto
            </button>
          </div>
        </Section>
      )}

      {/* ---------------------- Contrata por teléfono ---------------------- */}
      <Section title="Bloque «Contrata por teléfono»">
        <Field label="Titular" value={landing.contrataTelefono.title} onChange={(v) => patchContrataTelefono({ title: v })} />
        <Field label="Texto del botón" value={landing.contrataTelefono.ctaLabel} onChange={(v) => patchContrataTelefono({ ctaLabel: v })} />
      </Section>

      {/* ---------------------- Comparativa ---------------------- */}
      <Section title="Tabla comparativa">
        <Field label="Titular" value={landing.comparativa.title} onChange={(v) => patchComparativa({ title: v })} />
        <Field label="Subtítulo (opcional)" value={landing.comparativa.subtitle} onChange={(v) => patchComparativa({ subtitle: v })} textarea />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <FieldCompact label="Filas visibles al inicio (0 = todas)" value={String(landing.comparativa.initialVisibleRows)} onChange={(v) => patchComparativa({ initialVisibleRows: Math.max(0, Number(v) || 0) })} />
          <FieldCompact label="Texto «Ver más»" value={landing.comparativa.verMasLabel} onChange={(v) => patchComparativa({ verMasLabel: v })} />
          <FieldCompact label="Texto «Ver menos»" value={landing.comparativa.verMenosLabel} onChange={(v) => patchComparativa({ verMenosLabel: v })} />
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-semibold text-slate2">Columnas (productos comparados)</p>
          <div className="space-y-1.5">
            {landing.comparativa.columns.map((col, i) => (
              <div key={i} className="flex gap-2">
                <input value={col} onChange={(e) => {
                  const next = [...landing.comparativa.columns]; next[i] = e.target.value;
                  patchComparativa({ columns: next });
                }} className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                <button type="button" onClick={() => {
                  const nextCols = landing.comparativa.columns.filter((_, j) => j !== i);
                  const nextRows = landing.comparativa.rows.map((r) => ({ ...r, incluidoEn: r.incluidoEn.filter((_, j) => j !== i) }));
                  patchComparativa({ columns: nextCols, rows: nextRows });
                }} className="text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
            ))}
            <button type="button" onClick={() => {
              const nextCols = [...landing.comparativa.columns, "Nueva columna"];
              const nextRows = landing.comparativa.rows.map((r) => ({ ...r, incluidoEn: [...r.incluidoEn, false] }));
              patchComparativa({ columns: nextCols, rows: nextRows });
            }} className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
              + Añadir columna
            </button>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-semibold text-slate2">Filas</p>
          <div className="space-y-1.5">
            {landing.comparativa.rows.map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-card border border-hair p-2">
                <input value={row.label} placeholder="Concepto" onChange={(e) => {
                  const next = [...landing.comparativa.rows]; next[i] = { ...row, label: e.target.value };
                  patchComparativa({ rows: next });
                }} className="min-w-[180px] flex-1 rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                {landing.comparativa.columns.map((_col, j) => (
                  <label key={j} className="inline-flex items-center gap-1 text-[12px] text-slate2">
                    <input type="checkbox" checked={row.incluidoEn[j] ?? false}
                      onChange={(e) => {
                        const next = [...landing.comparativa.rows];
                        const inc = [...row.incluidoEn];
                        while (inc.length < landing.comparativa.columns.length) inc.push(false);
                        inc[j] = e.target.checked;
                        next[i] = { ...row, incluidoEn: inc };
                        patchComparativa({ rows: next });
                      }} />
                    <span className="text-[11px]">col {j + 1}</span>
                  </label>
                ))}
                <button type="button" onClick={() => {
                  const next = landing.comparativa.rows.filter((_, j) => j !== i);
                  patchComparativa({ rows: next });
                }} className="text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
            ))}
            <button type="button" onClick={() => {
              const empty: LandingComparativaRow = { label: "", incluidoEn: landing.comparativa.columns.map(() => false) };
              patchComparativa({ rows: [...landing.comparativa.rows, empty] });
            }} className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
              + Añadir fila
            </button>
          </div>
        </div>
      </Section>

      {/* ---------------------- Rating ---------------------- */}
      <Section title="Rating">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor" value={landing.rating.valor} onChange={(v) => patchRating({ valor: v })} />
          <Field label="Nº valoraciones" value={landing.rating.numValoraciones} onChange={(v) => patchRating({ numValoraciones: v })} />
        </div>
      </Section>

      {/* ---------------------- Footer ---------------------- */}
      <Section title="Footer y disclaimer legal">
        <Field label="Disclaimer principal" value={landing.footer.disclaimer} onChange={(v) => patchFooter({ disclaimer: v })} textarea />
        <Field label="Nota legal (segundo párrafo)" value={landing.footer.notaLegal} onChange={(v) => patchFooter({ notaLegal: v })} textarea />
        <Field label="Copyright" value={landing.footer.copyright} onChange={(v) => patchFooter({ copyright: v })} />
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] font-semibold text-slate2">Enlaces del footer</p>
          <div className="space-y-1.5">
            {landing.footer.enlaces.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input value={l.label} placeholder="Texto" onChange={(e) => {
                  const next = [...landing.footer.enlaces]; next[i] = { ...l, label: e.target.value };
                  patchFooter({ enlaces: next });
                }} className="w-1/2 rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                <input value={l.href} placeholder="/legal" onChange={(e) => {
                  const next = [...landing.footer.enlaces]; next[i] = { ...l, href: e.target.value };
                  patchFooter({ enlaces: next });
                }} className="w-1/2 rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                <button type="button" onClick={() => {
                  const next = landing.footer.enlaces.filter((_, j) => j !== i);
                  patchFooter({ enlaces: next });
                }} className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
            ))}
            <button type="button" onClick={() => patchFooter({ enlaces: [...landing.footer.enlaces, { label: "", href: "" }] })}
              className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
              + Añadir enlace
            </button>
          </div>
        </div>
      </Section>

      {/* ---------------------- UTM ---------------------- */}
      <Section title="UTM automática de esta landing">
        <p className="text-[12px] leading-relaxed text-slate2">
          Estos valores se inyectan como query-string en cada CTA «Calcula tu seguro» — así todos los leads
          generados por esta landing quedan atribuidos en el CRM y en <a className="underline" href="/admin/utm">/admin/utm</a>.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <FieldCompact label="utm_source" value={landing.utm.source} onChange={(v) => patchUtm({ source: v })} />
          <FieldCompact label="utm_medium" value={landing.utm.medium} onChange={(v) => patchUtm({ medium: v })} />
          <FieldCompact label="utm_campaign" value={landing.utm.campaign} onChange={(v) => patchUtm({ campaign: v })} />
        </div>
        <p className="mt-2 break-all text-[11px] text-slate2">
          URL de ejemplo: <code className="rounded bg-mist px-1 py-0.5">{buildTarificadorHref(landing)}</code>
        </p>
      </Section>

      {!isNew && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={duplicate} disabled={duplicating}
            className="rounded-card border border-hair bg-white px-4 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-mist disabled:opacity-60">
            {duplicating ? "Duplicando…" : "Duplicar landing"}
          </button>
          <button onClick={remove}
            className="rounded-card px-4 py-2 text-[13px] font-semibold text-brand-red transition-colors hover:bg-brand-red/10">
            Eliminar landing
          </button>
        </div>
      )}

      <SaveBar saving={saving} saved={saved} onSave={save} />
    </main>
  );

  function updateProducto(i: number, patch: Partial<LandingProduct>) {
    setLanding((l) => {
      const next = [...l.productos.items];
      next[i] = { ...next[i], ...patch };
      return { ...l, productos: { ...l.productos, items: next } };
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
