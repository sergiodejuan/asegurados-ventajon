import { cookies } from "next/headers";
import { AdminChromeProvider } from "@/components/admin/AdminChrome";

export const dynamic = "force-dynamic";

// Literal — debe coincidir con THEME_COOKIE en components/admin/AdminChrome.tsx.
// No se importa de ahí porque es un módulo "use client" y sus constantes no
// resuelven a su valor real al leerse desde un server component.
const ADMIN_THEME_COOKIE = "ventajon_admin_theme";

// Layout que envuelve TODO /admin. Su única razón de ser es alojar el estado
// de "chrome" (modo oscuro, sidebar colapsado) por encima de las páginas
// —cada una monta su propio <AdminShell>, así que sin este layout el estado
// se reiniciaría en cada navegación—, y pintar `data-admin-theme` desde el
// servidor leyendo la cookie, de modo que el modo oscuro no parpadee en el
// primer render. El scope en #admin-root (no en <html>) mantiene el modo
// oscuro dentro del panel: el sitio público no se ve afectado. Las
// variables de color se redefinen bajo [data-admin-theme="dark"] en
// app/globals.css.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const theme = cookies().get(ADMIN_THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  return (
    <div id="admin-root" data-admin-theme={theme} className="min-h-screen bg-mist">
      <AdminChromeProvider initialTheme={theme}>{children}</AdminChromeProvider>
    </div>
  );
}
