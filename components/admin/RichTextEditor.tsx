"use client";

import type { ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import type { EmailVariable } from "@/lib/leadEmailTemplates";

// Editor WYSIWYG compartido entre el editor de plantillas
// (/admin/configuracion/plantillas-email) y el modal de envío de email
// desde la ficha de un lead (SendEmailModal) — un único setup de Tiptap
// para no mantener dos integraciones distintas. Produce HTML simple
// (párrafos, negrita, cursiva, listas, enlaces), sin estilos en línea:
// lib/comparativaEmail.ts sigue usando tablas con estilos en línea para el
// correo automático de comparativa, que es un documento de marketing más
// elaborado — este editor es para el tono de un correo personal de agente.
export function RichTextEditor({
  value, onChange, variables,
}: {
  value: string;
  onChange: (html: string) => void;
  variables?: EmailVariable[];
}) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "prose-email min-h-[160px] px-4 py-3 text-[14px] leading-relaxed focus:outline-none" },
    },
  });

  function insertVariable(key: string) {
    editor?.chain().focus().insertContent(`{{${key}}}`).run();
  }

  function toggleLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url.trim() }).run();
  }

  return (
    <div className="rounded-card border border-hair bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-hair p-1.5">
        <ToolbarButton active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>Negrita</ToolbarButton>
        <ToolbarButton active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>Cursiva</ToolbarButton>
        <ToolbarButton active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>Lista</ToolbarButton>
        <ToolbarButton active={editor?.isActive("link")} onClick={toggleLink}>Enlace</ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      {variables && variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-hair bg-mist/60 p-2">
          <span className="self-center text-[11px] font-semibold uppercase tracking-wide text-slate2">Variables</span>
          {variables.map((v) => (
            <button
              key={v.key} type="button" onClick={() => insertVariable(v.key)} title={`Ejemplo: ${v.sample}`}
              className="rounded-pill border border-hair bg-white px-2.5 py-1 text-[11px] font-semibold text-navy transition-colors hover:bg-white/70"
            >
              {`{{${v.key}}}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`rounded-pill border px-2.5 py-1 text-[12px] font-semibold transition-colors ${active ? "border-navy bg-navy text-white" : "border-hair bg-white text-navy hover:bg-mist"}`}
    >
      {children}
    </button>
  );
}
