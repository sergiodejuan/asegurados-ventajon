"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_CHANGED_EVENT } from "./CookieConsentBanner";

const CONSENT_KEY = "ventajon:cookieConsent";

// El píxel de Meta es publicidad/remarketing, no analítica interna: se
// gobierna por la categoría "marketing" del aviso de cookies, no por
// "analíticas" (a diferencia de GA4, que cuenta como analítica aunque el
// visitante también pueda aceptar marketing).
function hasMarketingConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw) as { marketing?: boolean };
    return !!d.marketing;
  } catch {
    return false;
  }
}

// Píxel de Meta (Facebook/Instagram Ads): solo la parte de navegador
// (PageView + audiencias de remarketing). El evento de conversión real
// ("Lead", al completar un formulario) se manda desde el servidor vía
// Conversions API (ver lib/metaCapi.ts) en vez de desde aquí — así la
// conversión se registra igual aunque el visitante tenga bloqueador de
// anuncios o ITP le recorte las cookies de terceros, que es exactamente lo
// que hace que un píxel "solo cliente" infravalore las conversiones reales.
export function MetaPixel({ pixelId }: { pixelId: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(hasMarketingConsent());
    function onConsentChanged() { setAllowed(hasMarketingConsent()); }
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
  }, []);

  if (!pixelId || !allowed) return null;

  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1" width="1" alt="" style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
