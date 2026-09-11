"use client";

import { useEffect, useState } from "react";
import { useAdminToken } from "@/components/admin/AdminShell";

export type IntegrationStatus = {
  codescopic: { configured: boolean; missing: string[] };
  tremendous: { configured: boolean; missing: string[] };
  apiPropia: { storageMode: "kv" | "memory"; turnstileConfigured: boolean; adminTokenSet: boolean };
  webhooks: {
    saliente: { configured: boolean };
    retell: { configured: boolean };
    bland: { configured: boolean };
  };
};

// Estado real (derivado de variables de entorno / almacén) de las 3
// integraciones, compartido por la página resumen y cada subpágina.
export function useIntegrationStatus() {
  const { token } = useAdminToken();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/integraciones/status", { headers: { "x-admin-token": token } });
        const body = await res.json();
        if (cancelled) return;
        if (res.ok && body.ok) {
          const { ok: _ok, ...rest } = body;
          setStatus(rest as IntegrationStatus);
        } else {
          setError(body?.error ?? "No se pudo cargar el estado de las integraciones.");
        }
      } catch {
        if (!cancelled) setError("Parece que hay un problema de conexión.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return { status, loading, error };
}
