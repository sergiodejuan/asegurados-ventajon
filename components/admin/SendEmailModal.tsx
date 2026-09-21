"use client";

import { useEffect, useState } from "react";
import { useAdminToken } from "@/components/admin/AdminShell";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { EMAIL_VARIABLES, type EmailTemplate } from "@/lib/leadEmailTemplates";
import { quoteNumber } from "@/lib/quote";
import { Close } from "@/components/icons";

type LeadCtx = { id: string; nombre: string; email: string; producto: string };
type PresupuestoOption = {
  id: string; producto: string; status: string;
  precioAprox: number | null; eleccion: { compania: string; precio: number | null } | null;
};

export function SendEmailModal({ lead, onClose }: { lead: LeadCtx; onClose: () => void }) {
  const { token } = useAdminToken();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [presupuestos, setPresupuestos] = useState<PresupuestoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | "custom">("custom");
  const [asunto, setAsunto] = useState("");
  const [cuerpoHtml, setCuerpoHtml] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"ok" | { error: string } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [templatesRes, presupuestosRes] = await Promise.all([
          fetch("/api/admin/email-templates", { headers: { "x-admin-token": token } }),
          fetch(`/api/admin/presupuestos?leadId=${lead.id}`, { headers: { "x-admin-token": token } }),
        ]);
        const templatesBody = await templatesRes.json();
        if (templatesBody.ok) setTemplates(templatesBody.templates);
        const presupuestosBody = await presupuestosRes.json();
        if (presupuestosBody.ok) setPresupuestos(presupuestosBody.presupuestos);
      } catch { /* se muestran vacíos, el formulario sigue usable */ }
      setLoading(false);
    })();
  }, [lead.id, token]);

  function pickTemplate(id: string) {
    setSelectedTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) { setAsunto(tpl.asunto); setCuerpoHtml(tpl.cuerpoHtml); }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function send() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/enviar-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ asunto, cuerpoHtml, presupuestoIds: Array.from(selectedIds) }),
      });
      const body = await res.json();
      if (res.ok && body.ok) setSendResult("ok");
      else setSendResult({ error: body.error || "No se pudo enviar el correo." });
    } catch {
      setSendResult({ error: "Error de conexión al enviar el correo." });
    } finally {
      setSending(false);
    }
  }

  if (!lead.email) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
          <p className="text-[14px] text-slate2">Este lead no tiene un email guardado.</p>
          <button onClick={onClose} className="mt-4 rounded-card border border-hair px-4 py-2 text-[13px] font-semibold text-navy hover:bg-mist">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-extrabold text-navy">Enviar email</h2>
            <p className="mt-0.5 text-[13px] text-slate2">A {lead.nombre || "el cliente"} · {lead.email}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="shrink-0 text-slate2 hover:text-navy">
            <Close width={20} height={20} />
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-[13px] text-slate2">Cargando…</p>
        ) : (
          <>
            {templates.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Plantilla de correo">
                {templates.map((t) => (
                  <button key={t.id} type="button" onClick={() => pickTemplate(t.id)}
                    className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors ${selectedTemplateId === t.id ? "border-navy bg-navy text-white" : "border-hair bg-white text-navy hover:bg-mist"}`}>
                    {t.nombre}
                  </button>
                ))}
                <button type="button" onClick={() => setSelectedTemplateId("custom")}
                  className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors ${selectedTemplateId === "custom" ? "border-navy bg-navy text-white" : "border-hair bg-white text-navy hover:bg-mist"}`}>
                  Correo personalizado
                </button>
              </div>
            )}

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink">Asunto</span>
              <input
                value={asunto} onChange={(e) => setAsunto(e.target.value)}
                className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]"
              />
            </label>

            <div className="mt-4">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink">Cuerpo del correo</span>
              <RichTextEditor value={cuerpoHtml} onChange={setCuerpoHtml} variables={EMAIL_VARIABLES} />
            </div>

            {presupuestos.length > 0 && (
              <div className="mt-4">
                <span className="mb-1.5 block text-[12px] font-semibold text-ink">Asociar presupuestos abiertos</span>
                <div className="flex flex-col gap-1.5 rounded-card border border-hair p-2">
                  {presupuestos.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-mist">
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelected(p.id)} />
                      <span className="capitalize text-ink">#{quoteNumber(p.id)} · {p.producto}</span>
                      {p.eleccion?.compania && <span className="text-slate2">· {p.eleccion.compania}</span>}
                      {(p.eleccion?.precio ?? p.precioAprox) != null && (
                        <span className="ml-auto tnums font-semibold text-navy">≈ {(p.eleccion?.precio ?? p.precioAprox)!.toFixed(2)} €/mes</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-3 text-[12px] leading-relaxed text-slate2">
              Se añadirá automáticamente al final del correo un enlace seguro de acceso
              {selectedIds.size === 1 ? " a ese presupuesto." : " al área de cliente."}
            </p>

            <button
              type="button" onClick={send} disabled={sending || !asunto.trim() || !cuerpoHtml.trim()}
              className="mt-5 flex w-full items-center justify-center rounded-card bg-navy px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Enviando…" : "Enviar correo"}
            </button>
            {sendResult === "ok" && (
              <p className="mt-2 text-[12px] font-semibold text-emerald-700">Correo enviado. Ya puedes cerrar esta ventana.</p>
            )}
            {sendResult && sendResult !== "ok" && (
              <p className="mt-2 text-[12px] leading-relaxed text-brand-red-deep">{sendResult.error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
