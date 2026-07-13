import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { BRAND_NAME } from "@/lib/brand";
import { getTheme } from "@/lib/store";
import { DISPLAY_FONT_OPTIONS, BODY_FONT_OPTIONS, findFont } from "@/lib/theme";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

// El tema (colores, fuentes, logos, fotos de hero) se lee del store en el
// layout raíz y en las páginas con hero editable; sin esto, Next.js las
// generaría de forma estática en el build y los cambios desde /admin/diseno
// no se reflejarían hasta el siguiente deploy.
export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getTheme();
  return {
    title: `Seguro de salud — ${BRAND_NAME}`,
    description:
      "Comparamos tu seguro de salud entre las mejores compañías para que pagues lo justo. Sin trucos, sin letra pequeña.",
    robots: { index: true, follow: true },
    openGraph: {
      title: `Seguro de salud — ${BRAND_NAME}`,
      description:
        "Comparamos tu seguro de salud entre las mejores compañías para que pagues lo justo.",
      locale: "es_ES",
      type: "website",
    },
    ...(theme.faviconUrl ? { icons: { icon: theme.faviconUrl } } : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No fijamos maximumScale ni userScalable: false (accesibilidad).
  themeColor: "#1B2B6B",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = await getTheme();
  const displayFont = findFont(DISPLAY_FONT_OPTIONS, theme.displayFont);
  const bodyFont = findFont(BODY_FONT_OPTIONS, theme.bodyFont);
  const googleFontFamilies = [displayFont.google, bodyFont.google].filter(Boolean);

  const cssVars = {
    "--color-navy": theme.colors.navy,
    "--color-navy-deep": theme.colors.navyDeep,
    "--color-navy-soft": theme.colors.navySoft,
    "--color-brand-red": theme.colors.brandRed,
    "--color-brand-red-deep": theme.colors.brandRedDeep,
    "--color-ink": theme.colors.ink,
    "--color-slate2": theme.colors.slate2,
    "--color-mist": theme.colors.mist,
    "--color-hair": theme.colors.hair,
    ...(displayFont.google ? { "--font-display": displayFont.css } : {}),
    ...(bodyFont.google ? { "--font-sans": bodyFont.css } : {}),
  } as React.CSSProperties;

  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`} style={cssVars}>
      {googleFontFamilies.length > 0 && (
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${googleFontFamilies.map((f) => `family=${f}`).join("&")}&display=swap`} />
        </head>
      )}
      <body>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Saltar al contenido
        </a>
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
