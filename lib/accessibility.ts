// Preferencias de accesibilidad visual (tamaño de texto, contraste,
// subrayado de enlaces, fuente de lectura fácil, cursor grande, espaciado),
// controladas desde el widget flotante (components/AccessibilityWidget.tsx)
// y aplicadas vía atributos data-* en <html> + reglas CSS en globals.css —
// mismo patrón que el resto de theming del sitio (variables CSS), para no
// tocar ni un componente existente.
//
// El tamaño de texto usa la propiedad CSS "zoom" en <body> en vez de
// cambiar el font-size raíz: la mayoría de textos del sitio usan clases
// Tailwind con píxeles fijos (text-[14px]), que no reaccionan a cambios de
// rem — "zoom" escala el renderizado completo (texto, espaciados,
// iconos) sin crear un nuevo contenedor de posicionamiento, así que los
// elementos fixed (cabecera, CTA fijo, este mismo widget) seguían
// correctamente anclados al viewport tras verificarlo.

export type FontScale = 100 | 115 | 130 | 150;

export type AccessibilityPrefs = {
  fontScale: FontScale;
  highContrast: boolean;
  underlineLinks: boolean;
  readableFont: boolean;
  bigCursor: boolean;
  extraSpacing: boolean;
};

export const DEFAULT_A11Y_PREFS: AccessibilityPrefs = {
  fontScale: 100,
  highContrast: false,
  underlineLinks: false,
  readableFont: false,
  bigCursor: false,
  extraSpacing: false,
};

export const FONT_SCALE_STEPS: FontScale[] = [100, 115, 130, 150];

const STORAGE_KEY = "ventajon:a11y";

export function loadA11yPrefs(): AccessibilityPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_A11Y_PREFS;
    return { ...DEFAULT_A11Y_PREFS, ...(JSON.parse(raw) as Partial<AccessibilityPrefs>) };
  } catch {
    return DEFAULT_A11Y_PREFS;
  }
}

function setFlag(attr: string, on: boolean) {
  if (on) document.documentElement.setAttribute(attr, "true");
  else document.documentElement.removeAttribute(attr);
}

export function applyA11yPrefs(prefs: AccessibilityPrefs): void {
  if (typeof document === "undefined") return;
  // "zoom" no está en todos los tipos de CSSStyleDeclaration de TS todavía.
  (document.body.style as unknown as { zoom: string }).zoom = String(prefs.fontScale / 100);
  setFlag("data-a11y-contrast", prefs.highContrast);
  setFlag("data-a11y-underline", prefs.underlineLinks);
  setFlag("data-a11y-font", prefs.readableFont);
  setFlag("data-a11y-cursor", prefs.bigCursor);
  setFlag("data-a11y-spacing", prefs.extraSpacing);
}

export function saveA11yPrefs(prefs: AccessibilityPrefs): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* localStorage no disponible */ }
  applyA11yPrefs(prefs);
}
