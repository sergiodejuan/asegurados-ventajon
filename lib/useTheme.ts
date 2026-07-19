"use client";

import { useThemeContext } from "./ThemeContext";
import type { SiteTheme } from "./theme";

// Ver comentario en ThemeContext.tsx: el tema llega ya resuelto desde el
// servidor, sin fetch propio ni parpadeo.
export function useSiteTheme(): SiteTheme {
  return useThemeContext();
}
