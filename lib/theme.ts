// Apariencia del sitio (colores, tipografías, logos, favicon, fotos de hero,
// logos de aseguradoras aliadas, módulo de cookies) editable desde
// /admin/diseno. Los colores/tipografías se aplican vía variables CSS (ver
// tailwind.config.ts + app/layout.tsx), así que todas las clases existentes
// (bg-navy, text-brand-red…) siguen funcionando igual y se vuelven editables
// sin tocar componentes.

import { BRAND_NAME } from "./brand";

export type SiteColors = {
  navy: string;
  navyDeep: string;
  navySoft: string;
  brandRed: string;
  brandRedDeep: string;
  ink: string;
  slate2: string;
  mist: string;
  hair: string;
};

export const DEFAULT_COLORS: SiteColors = {
  navy: "#1B2B6B",
  navyDeep: "#12204F",
  navySoft: "#31418A",
  brandRed: "#C8312A",
  brandRedDeep: "#A8261F",
  ink: "#1C2333",
  slate2: "#5A6473",
  mist: "#F5F7FB",
  hair: "#E4E8F0",
};

export const COLOR_LABELS: Record<keyof SiteColors, string> = {
  navy: "Azul marino (principal)",
  navyDeep: "Azul marino oscuro (hover)",
  navySoft: "Azul marino suave",
  brandRed: "Rojo de marca (acento)",
  brandRedDeep: "Rojo oscuro (hover)",
  ink: "Texto principal",
  slate2: "Texto secundario",
  mist: "Fondo general",
  hair: "Bordes / líneas",
};

export type FontOption = { id: string; label: string; css: string; google: string };

// Fuente por defecto = la actual (Bricolage Grotesque / Instrument Sans),
// autoalojada vía next/font sin coste de rendimiento. El resto se cargan
// como Google Fonts en tiempo real solo si el admin elige una distinta.
export const DISPLAY_FONT_OPTIONS: FontOption[] = [
  { id: "bricolage", label: "Bricolage Grotesque (por defecto)", css: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif", google: "" },
  { id: "sora", label: "Sora", css: "'Sora', ui-sans-serif, system-ui, sans-serif", google: "Sora:wght@500;600;700;800" },
  { id: "outfit", label: "Outfit", css: "'Outfit', ui-sans-serif, system-ui, sans-serif", google: "Outfit:wght@500;600;700;800" },
  { id: "manrope", label: "Manrope", css: "'Manrope', ui-sans-serif, system-ui, sans-serif", google: "Manrope:wght@500;600;700;800" },
  { id: "poppins", label: "Poppins", css: "'Poppins', ui-sans-serif, system-ui, sans-serif", google: "Poppins:wght@500;600;700;800" },
  { id: "playfair", label: "Playfair Display (serif, más clásica)", css: "'Playfair Display', ui-serif, serif", google: "Playfair+Display:wght@600;700;800" },
];

export const BODY_FONT_OPTIONS: FontOption[] = [
  { id: "instrument", label: "Instrument Sans (por defecto)", css: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif", google: "" },
  { id: "inter", label: "Inter", css: "'Inter', ui-sans-serif, system-ui, sans-serif", google: "Inter:wght@400;500;600" },
  { id: "worksans", label: "Work Sans", css: "'Work Sans', ui-sans-serif, system-ui, sans-serif", google: "Work+Sans:wght@400;500;600" },
  { id: "sourcesans", label: "Source Sans 3", css: "'Source Sans 3', ui-sans-serif, system-ui, sans-serif", google: "Source+Sans+3:wght@400;500;600" },
];

export function findFont(list: FontOption[], id: string): FontOption {
  return list.find((f) => f.id === id) ?? list[0];
}

export const HERO_PAGE_KEYS: { key: string; label: string }[] = [
  { key: "home", label: "Portada (inicio)" },
  { key: "salud", label: "Seguro de salud" },
  { key: "vida", label: "Seguro de vida" },
  { key: "decesos", label: "Seguro de decesos" },
  { key: "hogar", label: "Seguro de hogar" },
  { key: "auto", label: "Seguro de auto" },
  { key: "mesGratis", label: "Landing campaña · 1 mes gratis" },
];

export type CookieConsentConfig = {
  enabled: boolean;
  heading: string;
  body: string;
  acceptLabel: string;
  rejectLabel: string;
  configureLabel: string;
  savePreferencesLabel: string;
  necessaryLabel: string;
  necessaryDesc: string;
  analyticsLabel: string;
  analyticsDesc: string;
  marketingLabel: string;
  marketingDesc: string;
  privacyLinkLabel: string;
  privacyHref: string;
  cookiesLinkLabel: string;
  cookiesHref: string;
};

export const DEFAULT_COOKIE_CONSENT: CookieConsentConfig = {
  enabled: true,
  heading: "Aviso de cookies",
  body:
    `${BRAND_NAME} utiliza cookies propias y de terceros para realizar análisis estadísticos, ` +
    `mantener tu sesión y mejorar tu experiencia mediante el análisis de tus hábitos de navegación. ` +
    `Puedes configurar estas cookies, pudiendo en tal caso limitarse la navegación y servicios del ` +
    `sitio web. Si aceptas las cookies estás consintiendo su utilización en este sitio web. Puedes ` +
    `aceptar todas las cookies pulsando el botón "Aceptar", configurar o rechazar su uso.`,
  acceptLabel: "Aceptar",
  rejectLabel: "Rechazar",
  configureLabel: "Configurar cookies",
  savePreferencesLabel: "Guardar preferencias",
  necessaryLabel: "Necesarias",
  necessaryDesc: "Imprescindibles para que el sitio funcione (navegación, formularios). Siempre activas.",
  analyticsLabel: "Analíticas",
  analyticsDesc: "Nos ayudan a entender cómo se usa el sitio para mejorarlo.",
  marketingLabel: "Marketing",
  marketingDesc: "Para mostrarte contenido y ofertas relevantes.",
  privacyLinkLabel: "Política de Privacidad",
  privacyHref: "/legal",
  cookiesLinkLabel: "Política de Cookies",
  cookiesHref: "/legal",
};

export type AccessibilityWidgetConfig = {
  enabled: boolean;
};

export const DEFAULT_ACCESSIBILITY_WIDGET: AccessibilityWidgetConfig = {
  enabled: true,
};

// Medición directa (gtag.js), independiente de si también se usa GTM. Si
// usas GTM para cargar GA4 dentro del contenedor, no actives esto a la vez
// para el mismo GA4 — duplicarías las visitas. El ID (G-XXXXXXXXXX) no es
// secreto (aparece igualmente en el JS del navegador); lo que sí es secreto
// es la API Secret de Measurement Protocol, que por eso vive en variable de
// entorno (GA4_API_SECRET), no aquí.
export type Ga4Config = {
  enabled: boolean;
  measurementId: string; // G-XXXXXXXXXX
};

export const DEFAULT_GA4: Ga4Config = {
  enabled: false,
  measurementId: "",
};

// Meta Pixel (Facebook/Instagram Ads). El ID del píxel no es secreto (viaja
// igualmente en el JS del navegador); el token de acceso de la Conversions
// API (servidor a servidor, para el evento "Lead") sí lo es, y por eso vive
// en variable de entorno (META_CAPI_ACCESS_TOKEN), nunca aquí.
export type MetaPixelConfig = {
  enabled: boolean;
  pixelId: string;
};

export const DEFAULT_META_PIXEL: MetaPixelConfig = {
  enabled: false,
  pixelId: "",
};

export type SiteTheme = {
  colors: SiteColors;
  displayFont: string;
  bodyFont: string;
  logoUrl: string; // logo del navbar (vacío = wordmark de texto por defecto)
  minimalLogoUrl: string; // logo de páginas sin salida (vacío = usa logoUrl, si no, texto)
  faviconUrl: string; // vacío = favicon.ico por defecto
  heroImages: Record<string, string>; // pageKey -> imagen (data URL)
  partnerLogos: Record<string, string>; // nombre de aseguradora (lib/brand.ts PARTNERS) -> logo (data URL)
  cookieConsent: CookieConsentConfig;
  accessibilityWidget: AccessibilityWidgetConfig;
  gtmId: string; // ID de contenedor de Google Tag Manager (GTM-XXXXXXX); vacío = no se carga
  ga4: Ga4Config;
  metaPixel: MetaPixelConfig;
  updatedAt: string;
};

export const DEFAULT_THEME: SiteTheme = {
  colors: DEFAULT_COLORS,
  displayFont: "bricolage",
  bodyFont: "instrument",
  logoUrl: "",
  minimalLogoUrl: "",
  faviconUrl: "",
  heroImages: {},
  partnerLogos: {},
  cookieConsent: DEFAULT_COOKIE_CONSENT,
  accessibilityWidget: DEFAULT_ACCESSIBILITY_WIDGET,
  gtmId: "",
  ga4: DEFAULT_GA4,
  metaPixel: DEFAULT_META_PIXEL,
  updatedAt: new Date(0).toISOString(),
};
