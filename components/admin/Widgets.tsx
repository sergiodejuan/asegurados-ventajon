"use client";

import { useState } from "react";
import { ChevronDown } from "@/components/icons";

export function StatTile({ label, value, active, onClick }: { label: string; value: string | number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-card border p-3 text-left transition-colors ${active ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}
    >
      <p className={`text-[20px] font-extrabold tnums ${active ? "text-white" : "text-navy"}`}>{value}</p>
      <p className={`truncate text-[11px] font-medium ${active ? "text-white/80" : "text-slate2"}`}>{label}</p>
    </button>
  );
}

export function ViewToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-pill px-3 py-1 text-[12px] font-semibold transition-colors ${active ? "bg-navy text-white" : "text-navy hover:bg-mist"}`}>
      {label}
    </button>
  );
}

export function FilterTab({ label, active, onClick, small }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick}
      className={`rounded-pill capitalize transition-colors ${small ? "px-3 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]"} font-semibold ${active ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
      {label}
    </button>
  );
}

export function CollapsiblePanel({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[24px] border border-hair bg-white shadow-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 p-6 text-left">
        <h2 className="text-[15px] font-bold text-navy">{title}</h2>
        <span aria-hidden="true" className={`shrink-0 text-navy transition-transform ${open ? "rotate-180" : ""}`}>
          <ChevronDown width={18} height={18} />
        </span>
      </button>
      {open && <div className="border-t border-hair px-6 pb-6 pt-4">{children}</div>}
    </div>
  );
}

export function NoteBox({ onSave, placeholder = "Escribe una nota…" }: { onSave: (txt: string) => void; placeholder?: string }) {
  const [txt, setTxt] = useState("");
  return (
    <div className="mt-2">
      <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={2}
        placeholder={placeholder}
        className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]" />
      <button onClick={() => { if (txt.trim()) { onSave(txt.trim()); setTxt(""); } }}
        className="mt-2 rounded-card bg-navy px-4 py-2 text-[14px] font-semibold text-white disabled:bg-slate2/40" disabled={!txt.trim()}>
        Guardar nota
      </button>
    </div>
  );
}
