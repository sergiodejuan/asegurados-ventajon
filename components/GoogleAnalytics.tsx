"use client";

import { useEffect } from "react";
import Script from "next/script";
import { CONSENT_CHANGED_EVENT } from "./CookieConsentBanner";

const CONSENT_KEY = "ventajon:cookieConsent";

function readConsent(): { analiticas: boolean; marketing: boolean } {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { analiticas: false, marketing: false };
    const d = JSON.parse(raw) as { analiticas?: boolean; marketing?: boolean };
    return { analiticas: !!d.analiticas, marketing: !!d.marketing };
  } catch {
    return { analiticas: false, marketing: false };
  }
}

function applyConsentToGtag() {
  if (typeof window.gtag !== "function") return;
  const { analiticas, marketing } = readConsent();
  window.gtag("consent", "update", {
    analytics_storage: analiticas || marketing ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
}

// GA4 directo vía gtag.js (Consent Mode v2), independiente de si también se
// usa GTM. A diferencia de GoogleTagManager.tsx (que no carga el script
// hasta que hay consentimiento), aquí se sigue el patrón que exige/documenta
// Google: el script se carga siempre, pero con el consentimiento por
// defecto en "denied" — así Google puede seguir haciendo modelado de
// conversiones sin cookies mientras no haya consentimiento, y en cuanto el
// visitante acepta, se manda "consent update" para pasar a medición
// completa. Es el estándar actual (2024+) para cumplir RGPD en la UE sin
// perder toda la analítica de quien no ha decidido todavía.
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  useEffect(() => {
    applyConsentToGtag();
    window.addEventListener(CONSENT_CHANGED_EVENT, applyConsentToGtag);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, applyConsentToGtag);
  }, []);

  if (!measurementId) return null;

  return (
    <>
      {/* Debe ejecutarse antes que cualquier otra cosa relacionada con GA/Ads
          en la página: define el estado de consentimiento por defecto
          (denegado) antes de que gtag.js llegue a enviar nada. */}
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {`window.dataLayer=window.dataLayer||[];
function gtag(){window.dataLayer.push(arguments);}
window.gtag=gtag;
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
gtag('set','url_passthrough',true);`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.gtag('js', new Date());
window.gtag('config', '${measurementId}', { send_page_view: false });`}
      </Script>
    </>
  );
}
