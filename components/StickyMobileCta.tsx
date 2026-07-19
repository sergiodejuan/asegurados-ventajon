"use client";

import { useEffect, useState } from "react";

// Barra de CTA fija en móvil/tablet, pensada para páginas largas (home,
// landings de producto) donde el CTA del hero deja de estar a la vista al
// hacer scroll. No se muestra en desktop (el nav-isla ya lleva su propio CTA).
export function StickyMobileCta({
  label, href, onClick, secondaryLabel, secondaryHref,
}: {
  label: string; href?: string; onClick?: () => void; secondaryLabel?: string; secondaryHref?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() { setVisible(window.scrollY > 480); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-white/95 shadow-[0_-8px_24px_-12px_rgba(18,32,79,0.25)] backdrop-blur transition-transform duration-300 ease-out lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-app items-center gap-2 px-4 py-3">
        {secondaryHref && secondaryLabel && (
          <a
            href={secondaryHref}
            tabIndex={visible ? 0 : -1}
            className="flex-1 rounded-card border border-hair px-4 py-3 text-center text-[14px] font-semibold text-navy transition-colors hover:bg-mist"
          >
            {secondaryLabel}
          </a>
        )}
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            tabIndex={visible ? 0 : -1}
            className="flex-1 rounded-card bg-brand-red px-4 py-3 text-center text-[14px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
          >
            {label}
          </button>
        ) : (
          <a
            href={href}
            tabIndex={visible ? 0 : -1}
            className="flex-1 rounded-card bg-brand-red px-4 py-3 text-center text-[14px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
          >
            {label}
          </a>
        )}
      </div>
    </div>
  );
}
