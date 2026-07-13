"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BRAND_NAME, WHATSAPP_URL } from "@/lib/brand";
import { useSiteTheme } from "@/lib/useTheme";
import { WhatsApp } from "./icons";

export function Wordmark({ logoUrl }: { logoUrl?: string } = {}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={BRAND_NAME} className="h-8 w-auto max-w-[160px] object-contain" />;
  }
  const parts = BRAND_NAME.split(" ");
  const first = parts[0];
  const rest = parts.slice(1).join(" ");
  return (
    <span className="inline-flex items-baseline gap-1.5 font-display text-[17px] font-extrabold tracking-tight text-navy" translate="no">
      <span aria-hidden="true" className="mr-0.5 inline-block h-3 w-3 translate-y-[1px] rounded-[3px] bg-brand-red" />
      {first}
      {rest ? <span className="text-brand-red">{rest}</span> : null}
    </span>
  );
}

const NAV_LINKS = [
  { href: "/#otros", label: "Seguros" },
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/actualidad", label: "Actualidad" },
];

export type Crumb = { label: string; href?: string };

// Migas de pan por ruta. Lo que no está aquí se deriva automáticamente del
// propio pathname (ver fallbackBreadcrumb).
const BREADCRUMB_MAP: Record<string, Crumb[]> = {
  "/seguro-de-salud": [{ label: "Seguros", href: "/#otros" }, { label: "Seguro de salud" }],
  "/seguro-de-vida": [{ label: "Seguros", href: "/#otros" }, { label: "Seguro de vida" }],
  "/seguro-de-decesos": [{ label: "Seguros", href: "/#otros" }, { label: "Seguro de decesos" }],
  "/seguro-de-hogar": [{ label: "Seguros", href: "/#otros" }, { label: "Seguro de hogar" }],
  "/seguro-de-auto": [{ label: "Seguros", href: "/#otros" }, { label: "Seguro de auto" }],
  "/legal": [{ label: "Información legal" }],
  "/gracias": [{ label: "Gracias" }],
  "/comparativa": [{ label: "Tu comparativa" }],
  "/quienes-somos": [{ label: "Quiénes somos" }],
  "/actualidad": [{ label: "Actualidad" }],
  "/area-cliente": [{ label: "Área de cliente" }],
};

function fallbackBreadcrumb(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  let acc = "";
  return segments.map((seg, i) => {
    acc += `/${seg}`;
    const label = seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, href: i < segments.length - 1 ? acc : undefined };
  });
}

function useScrollProgress(enabled: boolean) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (doc.scrollTop / max) * 100)) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);
  return progress;
}

// showProgress: activa la línea de progreso de lectura en el menú isla
// (pensada para páginas de contenido largo tipo artículo/blog).
// crumbs: para rutas dinámicas (p.ej. /actualidad/[slug]) que no pueden
// resolverse por pathname exacto en BREADCRUMB_MAP.
export function Header({ showProgress = false, crumbs: crumbsOverride }: { showProgress?: boolean; crumbs?: Crumb[] }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const crumbs = !isHome ? (crumbsOverride ?? BREADCRUMB_MAP[pathname] ?? fallbackBreadcrumb(pathname)) : null;
  const progress = useScrollProgress(showProgress && !isHome);
  const theme = useSiteTheme();

  return (
    <header className="safe-top sticky top-0 z-40 border-b border-hair bg-white/90 backdrop-blur lg:top-4 lg:mx-6 lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-hair lg:bg-white/95 lg:shadow-card lg:backdrop-blur-md xl:mx-12">
      {showProgress && !isHome && (
        <div aria-hidden="true" className="hidden h-[3px] w-full bg-hair lg:block">
          <div className="h-full bg-brand-red transition-[width] duration-150 ease-out" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="mx-auto flex h-14 max-w-app items-center justify-between px-5 md:max-w-5xl lg:h-16 lg:max-w-none lg:px-6">
        <a href="/" className="rounded-md" aria-label={`${BRAND_NAME} · Inicio`}>
          <Wordmark logoUrl={theme.logoUrl} />
        </a>
        <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[14px] font-semibold text-slate2 transition-colors hover:text-navy">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-pill border border-hair px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:border-navy/30 hover:bg-mist"
          >
            <WhatsApp className="text-[#25D366]" />
            Escríbenos
          </a>
          <a
            href="/tarificador"
            className="hidden items-center rounded-pill bg-brand-red px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep lg:inline-flex"
          >
            Calcula tu precio
          </a>
        </div>
      </div>

      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Migas de pan" className="hidden border-t border-hair px-6 py-2.5 lg:block">
          <ol className="flex items-center gap-2 text-[13px] text-slate2">
            <li><a href="/" className="font-medium transition-colors hover:text-navy">Inicio</a></li>
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                {c.href
                  ? <a href={c.href} className="font-medium transition-colors hover:text-navy">{c.label}</a>
                  : <span aria-current="page" className="font-semibold text-navy">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </header>
  );
}
