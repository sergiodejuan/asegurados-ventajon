"use client";

import { useState } from "react";
import { BRAND_NAME, CALLER_NUMBERS, WHATSAPP_NUMBER } from "@/lib/brand";
import { Check } from "./icons";

function telHref(n: string) {
  return "tel:" + n.replace(/[^\d+]/g, "");
}

export function SaveCaller() {
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function copy(n: string) {
    try {
      await navigator.clipboard.writeText(n);
      setCopied(n);
      setTimeout(() => setCopied((c) => (c === n ? null : c)), 1800);
    } catch {
      /* clipboard no disponible */
    }
  }

  function saveContact() {
    const tels = CALLER_NUMBERS.map(
      (c) => `TEL;TYPE=WORK,VOICE:${c.number.replace(/\s+/g, "")}`
    ).join("\n");
    const wa = WHATSAPP_NUMBER.replace(/[^\d]/g, "");
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${BRAND_NAME}`,
      `ORG:${BRAND_NAME}`,
      tels,
      `TEL;TYPE=CELL:+${wa}`,
      "END:VCARD",
    ].join("\n");

    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${BRAND_NAME.replace(/\s+/g, "-")}.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mt-6 rounded-card border-2 border-navy/15 bg-navy/[0.03] p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
          {/* icono teléfono */}
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.34 1.79.63 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.43a2 2 0 0 1 2.11-.45c.86.29 1.75.5 2.65.63A2 2 0 0 1 22 16.92z" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-navy">Te llamaremos desde estos números</p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Guárdalos para reconocer nuestra llamada. Si ves una llamada de estos números, somos nosotros: no es spam.
          </p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {CALLER_NUMBERS.map((c) => (
          <li key={c.number} className="flex items-center justify-between gap-3 rounded-lg border border-hair bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-slate2">{c.label}</p>
              <a href={telHref(c.number)} className="text-[17px] font-bold tnums text-navy">{c.number}</a>
            </div>
            <button
              type="button"
              onClick={() => copy(c.number)}
              className="shrink-0 rounded-pill border border-navy/30 px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              {copied === c.number ? "Copiado ✓" : "Copiar"}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={saveContact}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep"
      >
        {saved ? <><Check width={17} height={17} /> Contacto descargado</> : "Guardar en mis contactos"}
      </button>
      <p className="mt-2 text-center text-[12px] text-slate2">
        Así, cuando te llamemos, verás nuestro nombre en la pantalla.
      </p>
    </div>
  );
}
