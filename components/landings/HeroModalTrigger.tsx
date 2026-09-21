"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Shell compartido por los modales de /lp/salud (calcular / te llamamos
// gratis): el botón disparador conserva exactamente el estilo del CTA que
// sustituye (className/style/aria-label), y el propio modal se porta a
// document.body con foco inicial, cierre por Esc/backdrop y bloqueo de
// scroll — misma lógica en los dos modales, un solo sitio donde mantenerla.
export function HeroModalTrigger({
  className, style, ariaLabel, onOpen, children, titleId, renderModal,
}: {
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  onOpen?: () => void;
  children: ReactNode;
  titleId: string;
  renderModal: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => { onOpen?.(); setOpen(true); }}
        className={className}
        style={style}
        aria-label={ariaLabel}
      >
        {children}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-t-[20px] bg-white p-6 shadow-card sm:rounded-[20px] md:rounded-[24px]"
          >
            {renderModal(close)}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
