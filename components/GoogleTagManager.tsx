"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_CHANGED_EVENT } from "./CookieConsentBanner";

const CONSENT_KEY = "ventajon:cookieConsent";

function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw) as { analiticas?: boolean; marketing?: boolean };
    return !!(d.analiticas || d.marketing);
  } catch {
    return false;
  }
}

// Carga Google Tag Manager (id configurable desde /admin/diseno) solo
// cuando el visitante ya ha aceptado cookies analíticas o de marketing —
// respeta la decisión del módulo de cookies en vez de cargar GTM siempre y
// confiar en que las etiquetas de dentro filtren. Se reacciona al instante
// a un cambio de consentimiento (evento CONSENT_CHANGED_EVENT), sin
// necesidad de recargar la página.
export function GoogleTagManager({ gtmId }: { gtmId: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(hasAnalyticsConsent());
    function onConsentChanged() { setAllowed(hasAnalyticsConsent()); }
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
  }, []);

  if (!gtmId || !allowed) return null;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
