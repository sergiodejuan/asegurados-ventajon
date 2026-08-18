"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminToken } from "./AdminShell";
import { DEFAULT_THEME, type SiteTheme } from "@/lib/theme";

// Boilerplate compartido por cada página de /admin/diseno y
// /admin/configuracion/*: todas leen el mismo documento (GET
// /api/admin/theme) y guardan solo el fragmento que gestionan (PATCH
// parcial). Antes cada página repetía este mismo load/save a mano; con 8
// páginas de diseño más las de configuración, centralizarlo evita que un
// cambio en el manejo de errores tenga que replicarse en cada una.
export function useThemeSection() {
  const { token } = useAdminToken();
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/theme", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "Error al cargar."); setLoading(false); return; }
      setTheme(body.theme);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // `patch` es solo el fragmento del tema que le corresponde a esta página
  // (p.ej. { colors } o { autoWidget }), nunca el tema completo — así una
  // pestaña abierta en otra sección no puede pisar cambios ajenos al guardar.
  const save = useCallback(async (patch: Partial<SiteTheme>) => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setTheme(body.theme);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
        return true;
      }
      setError(body.error ?? "No se pudo guardar.");
      return false;
    } catch { setError("Error de conexión."); return false; }
    finally { setSaving(false); }
  }, [token]);

  return { theme, setTheme, loading, saving, saved, error, save };
}
