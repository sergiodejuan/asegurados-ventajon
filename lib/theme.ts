// Apariencia del sitio (colores, tipografías, logos, favicon, fotos de hero)
// editable desde /admin/diseno. Los colores/tipografías se aplican vía
// variables CSS (ver tailwind.config.ts + app/layout.tsx), así que todas las
// clases existentes (bg-navy, text-brand-red…) siguen funcionando igual y se
// vuelven editables sin tocar componentes.

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
];

export type SiteTheme = {
  colors: SiteColors;
  displayFont: string;
  bodyFont: string;
  logoUrl: string; // logo del navbar (vacío = wordmark de texto por defecto)
  minimalLogoUrl: string; // logo de páginas sin salida (vacío = usa logoUrl, si no, texto)
  faviconUrl: string; // vacío = favicon.ico por defecto
  heroImages: Record<string, string>; // pageKey -> imagen (data URL)
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
  updatedAt: new Date(0).toISOString(),
};
