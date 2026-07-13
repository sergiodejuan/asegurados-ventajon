// Envío de eventos a dataLayer para Google Tag Manager. Funciona aunque GTM
// todavía no se haya cargado (o el visitante no haya dado su consentimiento
// analítico): el array se inicializa igualmente y GTM, al cargar, procesa
// los eventos que ya estuvieran encolados — es el mismo patrón que usa el
// propio snippet de GTM con "gtm.js".

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function pushDataLayerEvent(event: string, payload: Record<string, unknown> = {}): void {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });
  } catch {
    /* noop */
  }
}
