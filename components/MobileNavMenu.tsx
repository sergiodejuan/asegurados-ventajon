"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BRAND_NAME, WHATSAPP_URL_GENERIC } from "@/lib/brand";
import { PRODUCT_PAGES } from "@/lib/productPages";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { useSiteTheme } from "@/lib/useTheme";
import { Wordmark } from "./Header";
import { Close, WhatsApp, ArrowRight } from "./icons";

const LINKS = [
  { href: "/", label: "Inicio" },
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
      className="safe-top safe-bottom fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-y-auto bg-navy motion-safe:animate-fade-up lg:hidden"
    >
      <div className="flex items-center justify-between px-5 py-4">
        {theme.logoUrl ? (
          <Wordmark logoUrl={theme.logoUrl} />
        ) : (
          // Sin logo configurado, el wordmark de texto de <Wordmark> es
          // navy (pensado para el header, con fondo blanco) — aquí, sobre
          // fondo navy, sería invisible, así que este fallback va en blanco.
          <span className="inline-flex items-baseline gap-1.5 font-display text-[17px] font-extrabold tracking-tight text-white" translate="no">
            <span aria-hidden="true" className="mr-0.5 inline-block h-3 w-3 translate-y-[1px] rounded-[3px] bg-brand-red" />
            {BRAND_NAME.split(" ")[0]}
            <span className="text-brand-red">{BRAND_NAME.split(" ").slice(1).join(" ")}</span>
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <Close width={20} height={20} />
        </button>
      </div>

      <nav aria-label="Principal" className="mt-4 flex flex-col px-5">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="flex items-center justify-between border-b border-white/10 py-4 text-[19px] font-bold text-white"
          >
            {l.label}
            <ArrowRight className="text-white/50" />
          </a>
        ))}

        <p className="mb-1 mt-5 text-[12px] font-bold uppercase tracking-wide text-white/50">Seguros</p>
        {PRODUCT_PAGES.map((p) => (
          <a
            key={p.slug}
            href={p.path}
            className="flex items-center justify-between border-b border-white/10 py-3.5 text-[16px] font-semibold text-white/90"
          >
            {p.badge}
            <ArrowRight width={16} height={16} className="text-white/40" />
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
          className="flex items-center justify-center rounded-card border border-white/30 px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-white/10"
        >
          Te llamamos gratis
        </a>
        <a
          href={WHATSAPP_URL_GENERIC}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => pushDataLayerEvent("whatsapp_click", { placement: "mobile_menu" })}
          className="flex items-center justify-center gap-2 rounded-card bg-white/10 px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/20"
        >
          <WhatsApp className="text-[#25D366]" />
          Escríbenos por WhatsApp
        </a>
      </div>
    </div>
  );
}
