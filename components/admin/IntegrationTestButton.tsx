"use client";

import { useState } from "react";
import { useAdminToken } from "@/components/admin/AdminShell";
import { Spinner } from "@/components/icons";

type TestResult = { ok: boolean; detail?: string; error?: string } | null;

// Botón de "probar conexión" reutilizado por los 3 paneles de
// /admin/integraciones: llama a la comprobación real del servidor (nunca
// simulada) y muestra el resultado tal cual, en vez de un simple sí/no.
export function IntegrationTestButton({
  target, label = "Probar conexión", confirmMessage,
}: { target: string; label?: string; confirmMessage?: string }) {
  const { token } = useAdminToken();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult>(null);

  async function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/integraciones/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ target }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; detail?: string; error?: string } | null;
      setResult({ ok: !!body?.ok, detail: body?.detail, error: body?.error });
    } catch {
      setResult({ ok: false, error: "Error de conexión al lanzar la prueba." });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button" onClick={run} disabled={running} aria-busy={running || undefined}
        className="flex items-center gap-2 rounded-card border border-navy px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-60"
      >
        {running && <Spinner />}
        {running ? "Probando…" : label}
      </button>
      {result && (
        <p className={`mt-2 text-[13px] leading-relaxed ${result.ok ? "text-emerald-700" : "text-brand-red-deep"}`} role="status">
          {result.ok ? (result.detail ?? "Conexión correcta.") : (result.error ?? result.detail ?? "No se pudo completar la prueba.")}
        </p>
      )}
    </div>
  );
}
