"use client";

import { useState } from "react";
import { WHATSAPP_TEMPLATES, templateForStatus, waMeUrl, waWebUrl, type WaTemplateCtx } from "@/lib/whatsappTemplates";
import { Close } from "@/components/icons";
import { useAdminToken } from "@/components/admin/AdminShell";

export function WhatsAppFollowupModal({
  ctx, telefono, onClose, presupuestoId,
}: {
  ctx: WaTemplateCtx;
  telefono: string;
  onClose: () => void;
  presupuestoId?: string;
}) {
  const { token } = useAdminToken();
  const [selectedKey, setSelectedKey] = useState<string | "custom">(templateForStatus(ctx.status).key);
  const [text, setText] = useState(() => templateForStatus(ctx.status).build(ctx));
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"ok" | { error: string } | null>(null);

  async function sendByManychat() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/manychat/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({
          telefono, nombre: ctx.nombre, texto: text, presupuestoId,
          plantilla: selectedKey === "custom" ? "mensaje personalizado" : WHATSAPP_TEMPLATES.find((t) => t.key === selectedKey)?.label,
        }),
      });
      const body = await res.json();
      if (res.ok && body.ok) setSendResult("ok");
      else setSendResult({ error: body.error || "No se pudo enviar el mensaje." });
    } catch {
      setSendResult({ error: "Error de conexión al enviar por ManyChat." });
    } finally {
      setSending(false);
    }
  }

  function pick(key: string) {
    setSelectedKey(key);
    const tpl = WHATSAPP_TEMPLATES.find((t) => t.key === key);
    if (tpl) setText(tpl.build(ctx));
  }

  function pickCustom() {
    setSelectedKey("custom");
  }

  if (!telefono) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
          <p className="text-[14px] text-slate2">Este presupuesto no tiene un teléfono asociado.</p>
          <button onClick={onClose} className="mt-4 rounded-card border border-hair px-4 py-2 text-[13px] font-semibold text-navy hover:bg-mist">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-extrabold text-navy">Enviar WhatsApp de seguimiento</h2>
            <p className="mt-0.5 text-[13px] text-slate2">A {ctx.nombre || "el cliente"} · {telefono}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="shrink-0 text-slate2 hover:text-navy">
            <Close width={20} height={20} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Plantilla de mensaje">
          {WHATSAPP_TEMPLATES.map((t) => (
            <button key={t.key} type="button" onClick={() => pick(t.key)}
              className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors ${selectedKey === t.key ? "border-navy bg-navy text-white" : "border-hair bg-white text-navy hover:bg-mist"}`}>
              {t.label}
            </button>
          ))}
          <button type="button" onClick={pickCustom}
            className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors ${selectedKey === "custom" ? "border-navy bg-navy text-white" : "border-hair bg-white text-navy hover:bg-mist"}`}>
            Mensaje personalizado
          </button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink">Mensaje</span>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setSelectedKey("custom"); }}
            rows={6}
            className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[14px] leading-relaxed"
          />
        </label>

        <button
          type="button"
          onClick={sendByManychat}
          disabled={sending || !text.trim()}
          className="mt-5 flex w-full items-center justify-center rounded-card bg-emerald-600 px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Enviando…" : "Enviar directo por ManyChat"}
        </button>
        {sendResult === "ok" && (
          <p className="mt-2 text-[12px] font-semibold text-emerald-700">Mensaje enviado. Ya puedes cerrar esta ventana.</p>
        )}
        {sendResult && sendResult !== "ok" && (
          <p className="mt-2 text-[12px] leading-relaxed text-brand-red-deep">
            {sendResult.error} Si el cliente no te ha escrito en las últimas 24h, WhatsApp bloquea el texto libre — usa una de las opciones manuales de abajo.
          </p>
        )}

        <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate2">O manualmente</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={waMeUrl(telefono, text)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex flex-1 items-center justify-center rounded-card border border-navy px-4 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            Abrir en WhatsApp (móvil)
          </a>
          <a
            href={waWebUrl(telefono, text)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex flex-1 items-center justify-center rounded-card border border-navy px-4 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            Abrir en WhatsApp Web
          </a>
        </div>
      </div>
    </div>
  );
}
