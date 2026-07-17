"use client";

import { useEffect, useId, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void }) => string;
      reset: (widgetId: string) => void;
    };
  }
}

// Widget de Cloudflare Turnstile: no renderiza nada si no hay
// NEXT_PUBLIC_TURNSTILE_SITE_KEY configurada, para que los formularios
// sigan funcionando exactamente igual que antes hasta que se active.
export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerId = useId().replace(/:/g, "");
  const widgetId = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!siteKey || !scriptReady || widgetId.current) return;
    const el = document.getElementById(containerId);
    if (!el || !window.turnstile) return;
    widgetId.current = window.turnstile.render(el, {
      sitekey: siteKey,
      callback: onToken,
      "expired-callback": () => onToken(""),
    });
  }, [siteKey, scriptReady, containerId, onToken]);

  if (!siteKey) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div id={containerId} className="mt-3" />
    </>
  );
}
