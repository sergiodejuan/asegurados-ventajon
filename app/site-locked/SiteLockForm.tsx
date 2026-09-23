"use client";

import { useState } from "react";
import { Spinner } from "@/components/icons";

export default function SiteLockForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/site-lock/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? "No hemos podido comprobar la contraseña.");
        setSubmitting(false);
        return;
      }
      // Recarga completa (no navegación de cliente): así el middleware vuelve
      // a evaluar la petición con la cookie de desbloqueo ya puesta.
      window.location.href = next;
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4">
      <label htmlFor="site-lock-password" className="sr-only">Contraseña</label>
      <input
        id="site-lock-password" name="password" type="password" autoComplete="current-password" autoFocus
        value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña" className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px]"
      />
      {error && <p role="alert" className="mt-2.5 text-[13px] font-medium text-brand-red">{error}</p>}
      <button
        type="submit" disabled={submitting || !password} aria-busy={submitting || undefined}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[16px] font-semibold text-white disabled:bg-slate2/40"
      >
        {submitting && <Spinner />}
        {submitting ? "Comprobando…" : "Entrar"}
      </button>
    </form>
  );
}
