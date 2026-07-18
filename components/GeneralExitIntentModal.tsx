"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IconByName, ChevronRight, Close } from "./icons";
import type { ExitIntentCampaign } from "@/lib/exitIntentCampaign";
import { useSiteTheme } from "@/lib/useTheme";

const COOKIE_CONSENT_KEY = "ventajon:cookieConsent";

// El aviso de cookies (components/CookieConsentBanner.tsx) es un overlay a
// pantalla completa con z-index más alto y de obligado cumplimiento legal:
// nunca debe competir por clics con un popup de marketing. Si todavía no hay
// una decisión de cookies guardada (el aviso está o va a estar visible), el
// exit-intent no se dispara en este intento.
function cookieBannerPending(enabled: boolean): boolean {
  if (!enabled) return false;
  try {
    return !localStorage.getItem(COOKIE_CONSENT_KEY);
  } catch {
    return false;
  }
}

// Exit-intent de la web GENERAL (home, landings, blog, quiénes somos...).
// Los tarificadores, la comparativa y "quiero que me llamen" ya tienen el
// suyo propio (ver components/ExitIntentModal.tsx) y no deben mostrar
// también este — de ahí la lista de exclusión. El área de cliente y la
// página de gracias se excluyen igual: son pantallas post-conversión o
// personales, no navegación general, y un popup de marketing ahí desentona.
const EXCLUDED_PREFIXES = [
  "/admin", "/tarificador", "/comparativa", "/quiero-que-me-llamen", "/area-cliente", "/gracias",
];

function countKey(id: string) {
  return `ventajon:exitintent-general:${id}:count`;
}

export function GeneralExitIntentModal() {
  const pathname = usePathname();
  const excluded = EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p));
  const theme = useSiteTheme();

  const [campaigns, setCampaigns] = useState<ExitIntentCampaign[]>([]);
  const [active, setActive] = useState<ExitIntentCampaign | null>(null);
  const doneRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (excluded) return;
    fetch("/api/exit-intents")
      .then((r) => r.json())
      .then((body) => { if (body.ok) setCampaigns(body.campaigns); })
      .catch(() => {});
  }, [excluded]);

  // Misma detección que el exit-intent de los tarificadores: en escritorio,
  // el cursor saliendo por arriba de la ventana; en móvil, sin ratón, se
  // atrapa UNA vuelta atrás del historial (la segunda vez ya sale con
  // normalidad). De entre las campañas activas, gana la de menor "orden"
  // que todavía no haya agotado sus veces por sesión.
  useEffect(() => {
    if (excluded || campaigns.length === 0) return;
    const sorted = [...campaigns].sort((a, b) => a.orden - b.orden);
    const pick = sorted.find((c) => {
      try { return Number(sessionStorage.getItem(countKey(c.id)) ?? "0") < c.maxPorSesion; }
      catch { return true; }
    });
    if (!pick) return;
    const campaign: ExitIntentCampaign = pick;

    let triggered = false;
    function trigger() {
      if (triggered || doneRef.current) return;
      if (cookieBannerPending(theme.cookieConsent.enabled)) return;
      triggered = true;
      try {
        const shown = Number(sessionStorage.getItem(countKey(campaign.id)) ?? "0");
        sessionStorage.setItem(countKey(campaign.id), String(shown + 1));
      } catch { /* noop */ }
      setActive(campaign);
    }
    function onMouseOut(e: MouseEvent) {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    }
    document.addEventListener("mouseout", onMouseOut);

    let poppedOnce = false;
    function onPopState() {
      if (poppedOnce) return;
      poppedOnce = true;
      window.history.pushState(null, "", window.location.href);
      trigger();
    }
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("popstate", onPopState);
    };
  }, [excluded, campaigns, theme.cookieConsent.enabled]);

  useEffect(() => {
    if (!active) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function close() {
    doneRef.current = true;
    setActive(null);
  }

  if (excluded || !active) return null;

  const panelBg = active.colorPanel === "red" ? "bg-brand-red" : "bg-navy";

  return (
    <div
      role="presentation"
      onClick={close}
      className="fixed inset-0 z-50 grid place-items-end bg-navy-deep/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={active.titulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-[24px] bg-white shadow-[0_8px_40px_-6px_rgba(18,32,79,0.45)] motion-safe:animate-fade-up sm:max-w-sm sm:rounded-[24px]"
      >
        <div className="relative">
          {active.imagenUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.imagenUrl} alt="" className="h-48 w-full object-cover" />
          ) : active.iconName ? (
            <div className={`flex h-40 items-center justify-center ${panelBg}`}>
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-white">
                <IconByName name={active.iconName} width={32} height={32} />
              </span>
            </div>
          ) : null}
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-soft transition-transform hover:scale-105"
          >
            <Close width={16} height={16} />
          </button>
        </div>

        <div className={`px-6 py-8 text-center ${panelBg}`}>
          <p className="text-[22px] font-extrabold leading-snug text-white">{active.titulo}</p>
          <a
            href={active.ctaHref}
            className="mt-6 flex items-center justify-center gap-2 rounded-pill bg-white px-6 py-3.5 text-[15px] font-semibold text-ink transition-transform hover:scale-[1.02]"
          >
            {active.ctaTexto}
            <ChevronRight width={16} height={16} />
          </a>
          {active.ctaSecundarioTexto && (
            <p className="mt-4 text-[13px] text-white/90">
              {active.ctaSecundarioPrefijo}
              <a href={active.ctaSecundarioHref} className="underline">{active.ctaSecundarioTexto}</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
