"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, type SiteTheme } from "./theme";

// Los colores/tipografías ya se aplican server-side en app/layout.tsx (sin
// flash). Este hook es solo para lo que necesita el cliente: logos y
// favicon dinámicos en componentes que se renderizan en muchas rutas.
export function useSiteTheme(): SiteTheme {
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);
  useEffect(() => {
    fetch("/api/theme")
      .then((r) => r.json())
      .then((body) => { if (body.ok) setTheme(body.theme); })
      .catch(() => {});
  }, []);
  return theme;
}
