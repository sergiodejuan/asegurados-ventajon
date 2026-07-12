"use client";

import { useEffect, useRef } from "react";
import { Close } from "./icons";

export function Modal({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-end bg-navy-deep/50 p-0 sm:place-items-center sm:p-5"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-6 shadow-card motion-safe:animate-fade-up sm:max-w-lg sm:rounded-[24px]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-[20px] font-extrabold leading-tight text-navy">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-navy transition-colors hover:bg-mist"
          >
            <Close width={18} height={18} />
          </button>
        </div>
        <div className="mt-4 text-[14px] leading-relaxed text-slate2">{children}</div>
      </div>
    </div>
  );
}
