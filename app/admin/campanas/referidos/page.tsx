"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { SaveBar } from "@/components/admin/SaveBar";
import { ImageField } from "@/components/admin/ImageField";
import {
  DEFAULT_REFERRAL_LANDING,
  type ReferralLandingConfig, type ReferralStep, type ReferralFaqItem,
} from "@/lib/referralLanding";

// Editor de la landing /referidos + configuración del programa "Amigos
// Ventajon". Mismo patrón que el editor de /precio-mejor-garantizado
// (una sola página con secciones, guardado global). Cifras del incentivo
// editables aquí — evita despliegue para cambiar montos en promo estacional.

const ICON_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Sin icono" },
  { value: "gift", label: "Regalo" },
  { value: "chat", label: "Chat / mensaje" },
  { value: "compare", label: "Comparar" },
  { value: "shield", label: "Escudo" },
  { value: "life", label: "Corazón" },
  { value: "home", label: "Hogar" },
  { value: "car", label: "Coche" },
  { value: "doc", label: "Documento" },
  { value: "pin", label: "Ubicación" },
];

export default function AdminReferralPage() {
  return (
    <AdminShell active="lp-referral">
      <Editor />
    </AdminShell>
  );
}

function Editor() {
  const { token } = useAdminToken();
  const [config, setConfig] = useState<ReferralLandingConfig>(DEFAULT_REFERRAL_LANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/landings/referidos", { headers: { "x-admin-token": token } });
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
      const res = await fetch("/api/admin/landings/referidos", {
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

  if (loading) return <main className="mx-auto max-w-3xl px-5 py-6"><p className="text-[13px] text-slate2">Cargando…</p></main>;

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-navy">Programa Amigos</h1>
        <a href="/referidos" target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-navy underline">
          Ver landing ↗
        </a>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Edita la landing pública <code className="rounded bg-mist px-1.5 py-0.5 text-[12px]">/referidos</code> y los importes del programa.
        Los cambios de importe SOLO aplican a conversiones futuras — las ya devengadas mantienen su bono.
      </p>
      {error && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{error}</p>}

      <Section title="Estado del programa">
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={config.programaActivo}
            onChange={(e) => setConfig((c) => ({ ...c, programaActivo: e.target.checked }))}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-red" />
          <span className="text-[13px] leading-relaxed text-ink">
            <span className="font-semibold text-navy">Programa activo</span>
            <span className="mt-0.5 block text-[12px] text-slate2">
              Si lo desactivas: la landing muestra "vuelve pronto", el modal de invitar queda bloqueado y los links /r/[code] redirigen a /referidos. Los códigos ya generados NO se borran — el programa se puede reanudar sin perder datos.
            </span>
          </span>
        </label>
      </Section>

      <Section title="Incentivo (cifras)">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="€ para el amigo (al cotizar + opt-in)" value={String(config.incentivo.montoReferido)}
            onChange={(v) => setConfig((c) => ({ ...c, incentivo: { ...c.incentivo, montoReferido: Number(v.replace(/\D/g, "")) || 0 } }))} />
          <Field label="€ para el cliente que refiere (al contratar amigo)" value={String(config.incentivo.montoReferidor)}
            onChange={(v) => setConfig((c) => ({ ...c, incentivo: { ...c.incentivo, montoReferidor: Number(v.replace(/\D/g, "")) || 0 } }))} />
          <Field label="Días de gracia tras contratación" value={String(config.incentivo.graciaContratacionDias)}
            onChange={(v) => setConfig((c) => ({ ...c, incentivo: { ...c.incentivo, graciaContratacionDias: Number(v.replace(/\D/g, "")) || 0 } }))} />
          <Field label="Cap anual (nº conversiones máx.)" value={String(config.incentivo.capAnualPorReferidor)}
            onChange={(v) => setConfig((c) => ({ ...c, incentivo: { ...c.incentivo, capAnualPorReferidor: Number(v.replace(/\D/g, "")) || 0 } }))} />
        </div>
        <Field label="Tipo de recompensa (texto visible al usuario)" value={config.incentivo.tipo}
          onChange={(v) => setConfig((c) => ({ ...c, incentivo: { ...c.incentivo, tipo: v } }))} />
      </Section>

      <Section title="Metadatos y visibilidad">
        <Field label="Meta title" value={config.metaTitle} onChange={(v) => setConfig((c) => ({ ...c, metaTitle: v }))} />
        <Field label="Meta description" value={config.metaDescription} onChange={(v) => setConfig((c) => ({ ...c, metaDescription: v }))} textarea />
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" checked={config.robotsIndex} onChange={(e) => setConfig((c) => ({ ...c, robotsIndex: e.target.checked }))} className="h-4 w-4 accent-brand-red" />
          <span className="text-[13px] text-ink">Indexable en Google (landing genérica; las personales /r/[code] siempre noindex)</span>
        </label>
      </Section>

      <Section title="Hero">
        <Field label="Kicker (opcional)" value={config.hero.kicker} onChange={(v) => setConfig((c) => ({ ...c, hero: { ...c.hero, kicker: v } }))} />
        <Field label="Titular (H1)" value={config.hero.h1} onChange={(v) => setConfig((c) => ({ ...c, hero: { ...c.hero, h1: v } }))} textarea />
        <Field label="Resaltar en rojo dentro del H1" value={config.hero.h1Highlight} onChange={(v) => setConfig((c) => ({ ...c, hero: { ...c.hero, h1Highlight: v } }))} />
        <Field label="Subtítulo" value={config.hero.subtitle} onChange={(v) => setConfig((c) => ({ ...c, hero: { ...c.hero, subtitle: v } }))} textarea />
        <ImageField label="Imagen del hero (opcional)" hint="Se comprime a 1200px." value={config.hero.imageUrl} onChange={(v) => setConfig((c) => ({ ...c, hero: { ...c.hero, imageUrl: v } }))} maxWidth={1200} mime="image/jpeg" preview="h-24 w-32" />
      </Section>

      <Section title="Badges de compromiso">
        <div className="space-y-2">
          {config.compromisoBadges.map((b, i) => (
            <div key={i} className="flex gap-2">
              <select value={b.icon}
                onChange={(e) => setConfig((c) => ({ ...c, compromisoBadges: c.compromisoBadges.map((x, j) => j === i ? { ...x, icon: e.target.value } : x) }))}
                className="w-36 shrink-0 rounded border border-hair bg-white px-2 py-1.5 text-[12px]">
                {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={b.label}
                onChange={(e) => setConfig((c) => ({ ...c, compromisoBadges: c.compromisoBadges.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))}
                className="w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
              <button type="button" onClick={() => setConfig((c) => ({ ...c, compromisoBadges: c.compromisoBadges.filter((_, j) => j !== i) }))}
                className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
            </div>
          ))}
          <button type="button" onClick={() => setConfig((c) => ({ ...c, compromisoBadges: [...c.compromisoBadges, { icon: "gift", label: "" }] }))}
            className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
            + Añadir badge
          </button>
        </div>
      </Section>

      <Section title="Cómo funciona (pasos)">
        <Field label="Título de la sección" value={config.comoFunciona.title} onChange={(v) => setConfig((c) => ({ ...c, comoFunciona: { ...c.comoFunciona, title: v } }))} />
        <div className="mt-3 space-y-3">
          {config.comoFunciona.steps.map((s, i) => (
            <div key={i} className="rounded-card border border-hair p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-slate2">Paso #{i + 1}</p>
                <button type="button" onClick={() => setConfig((c) => ({ ...c, comoFunciona: { ...c.comoFunciona, steps: c.comoFunciona.steps.filter((_, j) => j !== i) } }))}
                  className="text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[140px_1fr]">
                <select value={s.icon}
                  onChange={(e) => updateStep(i, { icon: e.target.value })}
                  className="rounded border border-hair bg-white px-2 py-1.5 text-[12px]">
                  {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input value={s.title} placeholder="Título del paso" onChange={(e) => updateStep(i, { title: e.target.value })}
                  className="rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
              </div>
              <textarea value={s.description} placeholder="Descripción" rows={2}
                onChange={(e) => updateStep(i, { description: e.target.value })}
                className="mt-2 w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
            </div>
          ))}
          <button type="button" onClick={() => setConfig((c) => ({ ...c, comoFunciona: { ...c.comoFunciona, steps: [...c.comoFunciona.steps, { icon: "gift", title: "", description: "" } as ReferralStep] } }))}
            className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
            + Añadir paso
          </button>
        </div>
      </Section>

      <Section title="Prueba social">
        <Field label="Título" value={config.socialProof.title} onChange={(v) => setConfig((c) => ({ ...c, socialProof: { ...c.socialProof, title: v } }))} />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Valor (ej. 4,7/5)" value={config.socialProof.valor} onChange={(v) => setConfig((c) => ({ ...c, socialProof: { ...c.socialProof, valor: v } }))} />
          <Field label="Nº valoraciones" value={config.socialProof.numValoraciones} onChange={(v) => setConfig((c) => ({ ...c, socialProof: { ...c.socialProof, numValoraciones: v } }))} />
        </div>
        <div className="mt-3 space-y-3">
          {config.socialProof.testimonios.map((t, i) => (
            <div key={i} className="rounded-card border border-hair p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-slate2">Testimonio #{i + 1}</p>
                <button type="button" onClick={() => setConfig((c) => ({ ...c, socialProof: { ...c.socialProof, testimonios: c.socialProof.testimonios.filter((_, j) => j !== i) } }))}
                  className="text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
              <textarea value={t.texto} placeholder="Testimonio" rows={2}
                onChange={(e) => setConfig((c) => ({ ...c, socialProof: { ...c.socialProof, testimonios: c.socialProof.testimonios.map((x, j) => j === i ? { ...x, texto: e.target.value } : x) } }))}
                className="mt-2 w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
              <input value={t.autor} placeholder="Autor (ej. Marta P., Las Palmas)"
                onChange={(e) => setConfig((c) => ({ ...c, socialProof: { ...c.socialProof, testimonios: c.socialProof.testimonios.map((x, j) => j === i ? { ...x, autor: e.target.value } : x) } }))}
                className="mt-2 w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
            </div>
          ))}
          <button type="button" onClick={() => setConfig((c) => ({ ...c, socialProof: { ...c.socialProof, testimonios: [...c.socialProof.testimonios, { texto: "", autor: "" }] } }))}
            className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
            + Añadir testimonio
          </button>
        </div>
      </Section>

      <Section title="Mensajes de compartir">
        <p className="text-[11px] leading-relaxed text-slate2">
          Placeholders disponibles: <code className="rounded bg-mist px-1 text-[11px]">{"{nombre}"}</code> (referidor),
          <code className="ml-1 rounded bg-mist px-1 text-[11px]">{"{link}"}</code>,
          <code className="ml-1 rounded bg-mist px-1 text-[11px]">{"{monto}"}</code> (importe referido).
        </p>
        <Field label="Mensaje WhatsApp" value={config.mensajeCompartir.whatsapp} textarea
          onChange={(v) => setConfig((c) => ({ ...c, mensajeCompartir: { ...c.mensajeCompartir, whatsapp: v } }))} />
        <Field label="Asunto email" value={config.mensajeCompartir.email.asunto}
          onChange={(v) => setConfig((c) => ({ ...c, mensajeCompartir: { ...c.mensajeCompartir, email: { ...c.mensajeCompartir.email, asunto: v } } }))} />
        <Field label="Cuerpo email" value={config.mensajeCompartir.email.cuerpo} textarea
          onChange={(v) => setConfig((c) => ({ ...c, mensajeCompartir: { ...c.mensajeCompartir, email: { ...c.mensajeCompartir.email, cuerpo: v } } }))} />
      </Section>

      <Section title="Preguntas frecuentes (FAQ)">
        <Field label="Título" value={config.faq.title} onChange={(v) => setConfig((c) => ({ ...c, faq: { ...c.faq, title: v } }))} />
        <div className="mt-3 space-y-3">
          {config.faq.items.map((f, i) => (
            <div key={i} className="rounded-card border border-hair p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-slate2">FAQ #{i + 1}</p>
                <button type="button" onClick={() => setConfig((c) => ({ ...c, faq: { ...c.faq, items: c.faq.items.filter((_, j) => j !== i) } }))}
                  className="text-[12px] font-semibold text-brand-red underline">Quitar</button>
              </div>
              <input value={f.q} placeholder="Pregunta"
                onChange={(e) => setConfig((c) => ({ ...c, faq: { ...c.faq, items: c.faq.items.map((x, j) => j === i ? { ...x, q: e.target.value } : x) } }))}
                className="mt-2 w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
              <textarea value={f.a} placeholder="Respuesta" rows={3}
                onChange={(e) => setConfig((c) => ({ ...c, faq: { ...c.faq, items: c.faq.items.map((x, j) => j === i ? { ...x, a: e.target.value } : x) } }))}
                className="mt-2 w-full rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
            </div>
          ))}
          <button type="button" onClick={() => setConfig((c) => ({ ...c, faq: { ...c.faq, items: [...c.faq.items, { q: "", a: "" } as ReferralFaqItem] } }))}
            className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
            + Añadir FAQ
          </button>
        </div>
      </Section>

      <Section title="Disclaimer legal">
        <p className="text-[11px] leading-relaxed text-slate2">
          Redacción por defecto incluye compliance RGPD, art. 21 LSSI y fiscalidad de vales-regalo. Modifica con cuidado.
        </p>
        <textarea value={config.disclaimer} rows={6}
          onChange={(e) => setConfig((c) => ({ ...c, disclaimer: e.target.value }))}
          className="mt-2 w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
      </Section>

      <Section title="Footer">
        <div className="space-y-2">
          {config.footer.enlaces.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input value={l.label} placeholder="Texto"
                onChange={(e) => setConfig((c) => ({ ...c, footer: { ...c.footer, enlaces: c.footer.enlaces.map((x, j) => j === i ? { ...x, label: e.target.value } : x) } }))}
                className="w-1/2 rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
              <input value={l.href} placeholder="/legal"
                onChange={(e) => setConfig((c) => ({ ...c, footer: { ...c.footer, enlaces: c.footer.enlaces.map((x, j) => j === i ? { ...x, href: e.target.value } : x) } }))}
                className="w-1/2 rounded border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
              <button type="button" onClick={() => setConfig((c) => ({ ...c, footer: { ...c.footer, enlaces: c.footer.enlaces.filter((_, j) => j !== i) } }))}
                className="shrink-0 text-[12px] font-semibold text-brand-red underline">Quitar</button>
            </div>
          ))}
          <button type="button" onClick={() => setConfig((c) => ({ ...c, footer: { ...c.footer, enlaces: [...c.footer.enlaces, { label: "", href: "" }] } }))}
            className="rounded-card border border-hair px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-mist">
            + Añadir enlace
          </button>
        </div>
        <Field label="Copyright" value={config.footer.copyright} onChange={(v) => setConfig((c) => ({ ...c, footer: { ...c.footer, copyright: v } }))} />
      </Section>

      <Section title="UTM automática (para tracking en Ads)">
        <div className="grid grid-cols-3 gap-3">
          <Field label="utm_source" value={config.utm.source} onChange={(v) => setConfig((c) => ({ ...c, utm: { ...c.utm, source: v } }))} />
          <Field label="utm_medium" value={config.utm.medium} onChange={(v) => setConfig((c) => ({ ...c, utm: { ...c.utm, medium: v } }))} />
          <Field label="utm_campaign" value={config.utm.campaign} onChange={(v) => setConfig((c) => ({ ...c, utm: { ...c.utm, campaign: v } }))} />
        </div>
      </Section>

      <SaveBar saving={saving} saved={saved} onSave={save} />
    </main>
  );

  function updateStep(i: number, patch: Partial<ReferralStep>) {
    setConfig((c) => ({ ...c, comoFunciona: { ...c.comoFunciona, steps: c.comoFunciona.steps.map((s, j) => j === i ? { ...s, ...patch } : s) } }));
  }
}

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
