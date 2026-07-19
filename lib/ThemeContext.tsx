"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_THEME, type SiteTheme } from "./theme";

// El tema ya se lee server-side una sola vez en app/layout.tsx (getTheme())
// y se reparte por contexto a todos los componentes cliente que lo
// necesitan (logo del navbar, favicon dinámico, aviso de cookies…). Antes
// cada componente volvía a pedirlo por su cuenta con un fetch al montar, lo
// que hacía que el logo real apareciera un instante después de un wordmark
// de texto de relleno — un parpadeo visible en cada carga de página.
const ThemeContext = createContext<SiteTheme>(DEFAULT_THEME);

export function ThemeProvider({ theme, children }: { theme: SiteTheme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): SiteTheme {
  return useContext(ThemeContext);
}
