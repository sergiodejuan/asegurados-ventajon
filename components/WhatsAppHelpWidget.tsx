"use client";

import { useEffect, useState } from "react";
import { WhatsApp, Close } from "./icons";
import { pushDataLayerEvent } from "@/lib/dataLayer";

const SHOW_DELAY_MS = 3000;

export function WhatsAppHelpWidget({ message, waHref }: { message: string; waHref: string }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div
      role="dialog"
      aria-label="Ayuda por WhatsApp"
      className="fixed bottom-6 right-4 z-40 w-[260px] rounded-card border border-hair bg-white p-4 pr-8 shadow-card motion-safe:animate-fade-up lg:right-6"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Cerrar"
        className="absolute right-2.5 top-2.5 text-slate2 transition-colors hover:text-ink"
      >
        <Close width={14} height={14} />
      </button>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25D366]/10 text-[#25D366]">
          <WhatsApp width={22} height={22} />
        </span>
        <div>
          <p className="text-[13px] font-semibold leading-snug text-ink">{message}</p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => pushDataLayerEvent("whatsapp_click", { placement: "widget_ayuda" })}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#1a9c4c]"
          >
            Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
