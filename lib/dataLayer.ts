// Envío de eventos a dataLayer para Google Tag Manager, y de paso —si están
// cargados— también a gtag.js (GA4 directo) y al píxel de Meta. Un único
// punto de disparo para toda la web (ya se llama desde CallRequestForm,
// StepForm, Header, etc.) evita tener que tocar cada componente cuando se
// añade un nuevo destino de analítica.
//
// Funciona aunque ninguno de los tres esté cargado todavía (o el visitante
// no haya dado su consentimiento): dataLayer.push es seguro siempre, y
// gtag()/fbq() sencillamente no existen como funciones globales hasta que
// sus respectivos componentes los definen (ver GoogleAnalytics.tsx y
// MetaPixel.tsx), momento en el que empiezan a atender lo que se les mande.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

// GA4 ya usa varios de estos nombres como "evento recomendado" (generate_lead);
// para el resto simplemente se manda tal cual como evento personalizado, no
// hace falta traducción. El píxel de Meta sí exige nombres de su propio
// vocabulario ("Lead", "Contact"...), de ahí esta tabla.
const META_EVENT_MAP: Record<string, string> = {
  generate_lead: "Lead",
  whatsapp_click: "Contact",
  page_view: "PageView",
};

export function pushDataLayerEvent(event: string, payload: Record<string, unknown> = {}): void {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });
  } catch {
    /* noop */
  }

  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", event, payload);
    }
  } catch {
    /* noop */
  }

  try {
    const metaEvent = META_EVENT_MAP[event];
    if (metaEvent && typeof window.fbq === "function") {
      window.fbq("track", metaEvent, payload);
    }
  } catch {
    /* noop */
  }
}
