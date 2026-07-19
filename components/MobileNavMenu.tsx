"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { WHATSAPP_URL_GENERIC } from "@/lib/brand";
import { PRODUCT_PAGES } from "@/lib/productPages";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { useSiteTheme } from "@/lib/useTheme";
import { Wordmark } from "./Header";
import { Close, WhatsApp, ArrowRight } from "./icons";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/promociones", label: "Promociones" },
  { href: "/testimonios", label: "Testimonios" },
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/actualidad", label: "Actualidad" },
  { href: "/area-cliente", label: "Mi área de cliente" },
];

// Menú de navegación a pantalla completa para móvil/tablet (oculto en
// escritorio, donde el menú isla ya tiene sitio de sobra). Antes de esto no
// existía ninguna forma de llegar a "Quiénes somos", "Actualidad" o al resto
// de seguros desde el móvil salvo enlaces sueltos dentro de cada página.
export function MobileNavMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const theme = useSiteTheme();

  useEffect(() => { onClose(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
      className="safe-top safe-bottom fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-y-auto bg-white motion-safe:animate-slide-in-left lg:hidden"
    >
      <div className="flex items-center justify-between border-b border-hair px-5 py-4">
        <Wordmark logoUrl={theme.logoUrl} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="grid h-11 w-11 place-items-center rounded-full bg-mist text-navy transition-colors hover:bg-hair"
        >
          <Close width={20} height={20} />
        </button>
      </div>

      <nav aria-label="Principal" className="mt-4 flex flex-col px-5">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="flex items-center justify-between border-b border-hair py-4 text-[19px] font-bold text-ink"
          >
            {l.label}
            <ArrowRight className="text-slate2" />
          </a>
        ))}

        <p className="mb-1 mt-5 text-[12px] font-bold uppercase tracking-wide text-slate2">Seguros</p>
        {PRODUCT_PAGES.map((p) => (
          <a
            key={p.slug}
            href={p.path}
            className="flex items-center justify-between border-b border-hair py-3.5 text-[16px] font-semibold text-ink"
          >
            {p.badge}
            <ArrowRight width={16} height={16} className="text-slate2" />
          </a>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 px-5 py-6">
        <a
          href="/tarificador"
          className="flex items-center justify-center rounded-card bg-brand-red px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
        >
          Calcula tu precio
        </a>
        <a
          href="/quiero-que-me-llamen"
          className="flex items-center justify-center rounded-card border border-hair px-5 py-4 text-[16px] font-semibold text-navy transition-colors hover:bg-mist"
        >
          Te llamamos gratis
        </a>
        <a
          href={WHATSAPP_URL_GENERIC}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => pushDataLayerEvent("whatsapp_click", { placement: "mobile_menu" })}
          className="flex items-center justify-center gap-2 rounded-card bg-mist px-5 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-hair"
        >
          <WhatsApp className="text-[#25D366]" />
          Escríbenos por WhatsApp
        </a>
      </div>
    </div>
  );
}
