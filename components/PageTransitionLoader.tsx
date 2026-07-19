"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Caveat } from "next/font/google";
import { useSiteTheme } from "@/lib/useTheme";

const caveat = Caveat({ subsets: ["latin"], weight: ["700"] });

// Páginas "azules" (tarificadores, comparativa, formulario de llamada, área
// de cliente, valoración de compañía) tienen su propia pantalla de carga
// (QuoteLoadingOverlay) o no necesitan una — nunca deben mostrar también este
// loader de marca. Mismo patrón que GeneralExitIntentModal.EXCLUDED_PREFIXES.
const EXCLUDED_PREFIXES = [
  "/admin", "/tarificador", "/comparativa", "/quiero-que-me-llamen", "/area-cliente", "/gracias", "/valoracion",
];

function isEligible(pathname: string): boolean {
  return !EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
}

const MIN_DURATION_MS = 900;
const MAX_DURATION_MS = 6000; // red de seguridad si la navegación no llega a completarse
const FACT_INTERVAL_MS = 1100;

export function PageTransitionLoader() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useSiteTheme();
  const config = theme.pageTransitionLoader;

  const [visible, setVisible] = useState(false);
  const [targetPathname, setTargetPathname] = useState<string | null>(null);
  const [factIndex, setFactIndex] = useState(0);
  const shownAtRef = useRef(0);

  useEffect(() => {
    if (!config.enabled) return;

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try { url = new URL(href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;

      const destination = url.pathname;
      const current = window.location.pathname;
      if (destination === current) return;
      if (!isEligible(current) || !isEligible(destination)) return;

      e.preventDefault();
      shownAtRef.current = Date.now();
      setTargetPathname(destination);
      setVisible(true);
      router.push(href);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [config.enabled, router]);

  // Se oculta cuando la navegación llega a destino y ya pasó la duración
  // mínima (para que no sea un parpadeo si la página siguiente carga muy rápido).
  useEffect(() => {
    if (!visible || !targetPathname || pathname !== targetPathname) return;
    const remaining = Math.max(0, MIN_DURATION_MS - (Date.now() - shownAtRef.current));
    const timer = setTimeout(() => { setVisible(false); setTargetPathname(null); }, remaining);
    return () => clearTimeout(timer);
  }, [pathname, visible, targetPathname]);

  useEffect(() => {
    if (!visible) return;
    const maxTimer = setTimeout(() => { setVisible(false); setTargetPathname(null); }, MAX_DURATION_MS);
    return () => clearTimeout(maxTimer);
  }, [visible]);

  useEffect(() => {
    if (!visible) { setFactIndex(0); return; }
    if (config.tips.length === 0) return;
    const timer = setInterval(() => setFactIndex((i) => (i + 1) % config.tips.length), FACT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [visible, config.tips.length]);

  if (!visible || !config.enabled) return null;

  const subtitle = (targetPathname && config.subtitles[targetPathname]) || config.defaultSubtitle;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-white px-6 text-center"
    >
      <div className="motion-safe:animate-loader-pulse">
        {config.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.imageUrl} alt="" className="h-24 w-auto object-contain md:h-32" />
        ) : (
          <p className={`${caveat.className} leading-[0.85] text-brand-red`}>
            <span className="block -rotate-3 text-[40px] md:text-[52px]">mereces</span>
            <span className="block rotate-2 pl-6 text-[40px] md:text-[52px]">pagar</span>
            <span className="block -rotate-2 pl-10 text-[40px] md:text-[52px]">menos</span>
          </p>
        )}
      </div>

      <p className="mt-7 max-w-sm text-[16px] font-semibold text-navy md:text-[18px]">{subtitle}</p>

      {config.tips.length > 0 && (
        <div className="mt-10 w-full max-w-sm">
          <p className="text-[12px] font-bold uppercase tracking-wide text-slate2">¿Sabías que…?</p>
          <p key={factIndex} className="mt-2 min-h-[4.5em] text-[14px] leading-relaxed text-ink motion-safe:animate-fade-up">
            {config.tips[factIndex]}
          </p>
          <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
            {config.tips.map((_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i === factIndex ? "bg-brand-red" : "bg-hair"}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
