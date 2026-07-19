// Atribución interna de marketing (UTM + página de aterrizaje + referrer).
//
// Modelo: la página de aterrizaje y el referrer se capturan una única vez
// (la primera visita de la ventana de atribución) y ya no se tocan — así
// siempre sabemos por dónde entró realmente el visitante. Los parámetros
// utm_*, en cambio, se actualizan cada vez que la URL trae alguno nuevo
// ("último toque de campaña"): esto es necesario para que enlaces internos
// con utm propio (p.ej. el CTA de /mes-gratis hacia /tarificador) queden
// bien atribuidos aunque el visitante ya llevara un rato navegando.
//
// Se guarda en localStorage (no sessionStorage) con una caducidad de 30
// días — la ventana de atribución estándar del sector — para que una
// conversión que llega días después de la primera visita siga sabiendo de
// dónde vino.

const KEY = "ventajon:attribution";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPage?: string;
  capturedAt?: string;
};

function readStored(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    if (parsed.capturedAt && Date.now() - new Date(parsed.capturedAt).getTime() > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function captureAttribution(pathname: string, search: string): void {
  try {
    const params = new URLSearchParams(search);
    const hasUtm = params.has("utm_source") || params.has("utm_medium") || params.has("utm_campaign");
    const existing = readStored();
    if (existing && !hasUtm) return; // ya hay atribución guardada y esta visita no trae campaña nueva

    const next: Attribution = {
      source: params.get("utm_source") ?? existing?.source,
      medium: params.get("utm_medium") ?? existing?.medium,
      campaign: params.get("utm_campaign") ?? existing?.campaign,
      content: params.get("utm_content") ?? existing?.content,
      term: params.get("utm_term") ?? existing?.term,
      referrer: existing?.referrer ?? (document.referrer || undefined),
      landingPage: existing?.landingPage ?? (pathname + search),
      capturedAt: existing?.capturedAt ?? new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* localStorage no disponible */
  }
}

export function getAttribution(): Attribution {
  return readStored() ?? {};
}

// UTM genérico para enlaces internos de un placement concreto (p.ej. el
// mega menú de "Seguros" en el header). Mismo criterio que
// lib/promotions.ts withPromotionUtm: el UTM del placement siempre
// sobrescribe uno que ya trajera el href, nunca se concatena (dos
// utm_campaign en la misma URL sería un bug, URLSearchParams.get() solo lee
// el primero).
export function withUtmParams(href: string, utm: { source: string; medium: string; campaign: string }): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("utm_source", utm.source);
  params.set("utm_medium", utm.medium);
  params.set("utm_campaign", utm.campaign);
  return `${path}?${params.toString()}`;
}
