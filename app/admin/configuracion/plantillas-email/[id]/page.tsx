"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { SaveBar } from "@/components/admin/SaveBar";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { EMAIL_VARIABLES, type EmailTemplate } from "@/lib/leadEmailTemplates";

const BLANK: EmailTemplate = { id: "", nombre: "", asunto: "", cuerpoHtml: "", createdAt: "", updatedAt: "" };

export default function AdminEmailTemplateEditorPage({ params }: { params: { id: string } }) {
  return (
    <AdminShell active="plantillas-email">
      <EmailTemplateEditor id={params.id} />
    </AdminShell>
  );
}

function EmailTemplateEditor({ id }: { id: string }) {
  const { token } = useAdminToken();
  const router = useRouter();
  const isNew = id === "nueva";
  const [t, setT] = useState<EmailTemplate>(BLANK);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/email-templates/${id}`, { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setT(body.template);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [id, isNew, token]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!t.nombre.trim()) { setError("Falta el nombre de la plantilla."); return; }
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch(isNew ? "/api/admin/email-templates" : `/api/admin/email-templates/${id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(t),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setT(body.template);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
        if (isNew) router.push(`/admin/configuracion/plantillas-email/${body.template.id}`);
      } else {
        setError(body.error ?? "No se pudo guardar.");
      }
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  if (loading) return <main className="mx-auto max-w-3xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
      <a href="/admin/configuracion/plantillas-email" className="text-[13px] font-semibold text-navy">← Volver al listado</a>

      <h1 className="mt-3 text-[22px] font-extrabold text-navy">{isNew ? "Nueva plantilla" : "Editar plantilla"}</h1>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}

      <div className="mt-5 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink">Nombre (interno, para elegirla al enviar)</span>
          <input
            value={t.nombre} onChange={(e) => setT((p) => ({ ...p, nombre: e.target.value }))}
            className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink">Asunto</span>
          <input
            value={t.asunto} onChange={(e) => setT((p) => ({ ...p, asunto: e.target.value }))}
            className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-ink">Cuerpo del correo</span>
          <RichTextEditor
            value={t.cuerpoHtml}
            onChange={(html) => setT((p) => ({ ...p, cuerpoHtml: html }))}
            variables={EMAIL_VARIABLES}
          />
        </div>

        <p className="text-[12px] leading-relaxed text-slate2">
          El enlace seguro de acceso al presupuesto (cuando el correo se envía con uno o varios presupuestos
          asociados) se añade automáticamente al final — no hace falta escribirlo aquí.
        </p>
      </div>

      <SaveBar saving={saving} saved={saved} onSave={save} />
    </main>
  );
}
