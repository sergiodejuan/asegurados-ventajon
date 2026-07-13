"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSiteTheme } from "@/lib/useTheme";
import { Wordmark } from "./Header";

type Decision = { necesarias: true; analiticas: boolean; marketing: boolean; decidedAt: string };

const STORAGE_KEY = "ventajon:cookieConsent";

function loadDecision(): Decision | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Decision) : null;
  } catch {
    return null;
  }
}

function saveDecision(d: Decision) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch { /* localStorage no disponible */ }
}

export function CookieConsentBanner() {
  const pathname = usePathname();
  const theme = useSiteTheme();
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<"summary" | "configure">("summary");
  const [analiticas, setAnaliticas] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (loadDecision()) return;
    setVisible(true);
  }, []);

  // No mostrar en el panel admin: es una herramienta interna con su propio
  // control de acceso, no la experiencia de un visitante del sitio.
  if (pathname?.startsWith("/admin")) return null;
  if (!theme.cookieConsent.enabled) return null;
  if (!visible) return null;

  const c = theme.cookieConsent;

  function accept() {
    saveDecision({ necesarias: true, analiticas: true, marketing: true, decidedAt: new Date().toISOString() });
    setVisible(false);
  }
  function reject() {
    saveDecision({ necesarias: true, analiticas: false, marketing: false, decidedAt: new Date().toISOString() });
    setVisible(false);
  }
  function savePreferences() {
    saveDecision({ necesarias: true, analiticas, marketing, decidedAt: new Date().toISOString() });
    setVisible(false);
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cookie-heading" className="fixed inset-0 z-[100] grid place-items-end bg-[#1B2B6B]/30 p-0 sm:place-items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-card sm:max-w-2xl sm:rounded-[24px] sm:p-8">
        <Wordmark logoUrl={theme.logoUrl} />

        <h2 id="cookie-heading" className="mt-4 text-[19px] font-extrabold text-navy">{c.heading}</h2>

        {view === "summary" ? (
          <>
            <p className="mt-3 text-[14px] leading-relaxed text-slate2">
              {c.body}{" "}
              <a href={c.privacyHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">{c.privacyLinkLabel}</a>
              {c.cookiesHref && c.cookiesLinkLabel && (
                <>
                  {" "}y la{" "}
                  <a href={c.cookiesHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">{c.cookiesLinkLabel}</a>.
                </>
              )}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => setView("configure")}
                className="text-[13px] font-semibold text-navy underline sm:text-left">
                {c.configureLabel}
              </button>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button type="button" onClick={reject}
                  className="rounded-card border border-navy px-5 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-mist sm:px-4 sm:py-2.5">
                  {c.rejectLabel}
                </button>
                <button type="button" onClick={accept}
                  className="rounded-card bg-brand-red px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand-red-deep sm:px-4 sm:py-2.5">
                  {c.acceptLabel}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3">
              <CookieToggle label={c.necessaryLabel} desc={c.necessaryDesc} checked disabled onChange={() => {}} />
              <CookieToggle label={c.analyticsLabel} desc={c.analyticsDesc} checked={analiticas} onChange={setAnaliticas} />
              <CookieToggle label={c.marketingLabel} desc={c.marketingDesc} checked={marketing} onChange={setMarketing} />
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => setView("summary")} className="text-[13px] font-semibold text-navy underline">
                ← Volver
              </button>
              <button type="button" onClick={savePreferences}
                className="rounded-card bg-brand-red px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand-red-deep sm:px-4 sm:py-2.5">
                {c.savePreferencesLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CookieToggle({
  label, desc, checked, disabled, onChange,
}: { label: string; desc: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-start gap-3 rounded-card border border-hair p-3.5 ${disabled ? "bg-mist" : "cursor-pointer"}`}>
      <input
        type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-navy disabled:opacity-60"
      />
      <span>
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        <span className="block text-[12px] leading-relaxed text-slate2">{desc}</span>
      </span>
    </label>
  );
}
