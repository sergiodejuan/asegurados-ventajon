"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Estado de "chrome" del panel admin que debe SOBREVIVIR a la navegación
// entre páginas: el modo oscuro y si el sidebar está colapsado. Como no hay
// un layout persistente por página (cada página monta su propio
// <AdminShell>), este provider vive en app/admin/layout.tsx —por encima de
// todas las páginas— y así el estado no se reinicia al navegar.
//
// - Modo oscuro: se guarda en una COOKIE (no solo localStorage) para que el
//   server component del layout pueda pintar data-admin-theme en el primer
//   render y no haya parpadeo claro→oscuro. El toggle actualiza el atributo
//   del nodo #admin-root al vuelo + reescribe la cookie.
// - Sidebar colapsado: solo afecta a escritorio y no necesita evitar
//   parpadeo, así que basta localStorage.

const THEME_COOKIE = "ventajon_admin_theme";
const SIDEBAR_KEY = "ventajon:admin:sidebar";

type AdminChrome = {
  dark: boolean;
  toggleDark: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
};

const Ctx = createContext<AdminChrome | null>(null);

export function useAdminChrome(): AdminChrome {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminChrome debe usarse dentro de <AdminChromeProvider>.");
  return ctx;
}

function writeThemeCookie(dark: boolean) {
  // 1 año, todo el sitio; SameSite=Lax basta (no es un secreto).
  document.cookie = `${THEME_COOKIE}=${dark ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
}

export function AdminChromeProvider({
  initialTheme, children,
}: {
  initialTheme: "dark" | "light";
  children: React.ReactNode;
}) {
  const [dark, setDark] = useState(initialTheme === "dark");
  // Empieza en false para coincidir con el HTML del servidor; se corrige tras
  // montar leyendo localStorage (evita hydration mismatch).
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_KEY) === "collapsed") setSidebarCollapsedState(true);
    } catch { /* localStorage no disponible */ }
  }, []);

  const applyTheme = useCallback((next: boolean) => {
    const root = document.getElementById("admin-root");
    if (root) root.setAttribute("data-admin-theme", next ? "dark" : "light");
  }, []);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      applyTheme(next);
      writeThemeCookie(next);
      return next;
    });
  }, [applyTheme]);

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setSidebarCollapsedState(v);
    try { localStorage.setItem(SIDEBAR_KEY, v ? "collapsed" : "expanded"); } catch { /* noop */ }
  }, []);

  return (
    <Ctx.Provider value={{ dark, toggleDark, sidebarCollapsed, setSidebarCollapsed }}>
      {children}
    </Ctx.Provider>
  );
}

export const ADMIN_THEME_COOKIE = THEME_COOKIE;
