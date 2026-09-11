"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Sólo la contraseña. La UX es intencionadamente austera — cualquier
// pista sobre el negocio filtraría información antes del gate.
export default function AccesoForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextTarget = params.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/acceso/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next: nextTarget }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        // Recargamos la URL destino en lugar de router.push para forzar
        // que el middleware vea la cookie recién plantada.
        window.location.href = typeof body.next === "string" && body.next.startsWith("/") ? body.next : "/";
        return;
      }
      setError(body.error || "Contraseña incorrecta.");
    } catch {
      setError("No se ha podido conectar. Inténtalo de nuevo.");
    } finally { setLoading(false); }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 shadow-card"
    >
      <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-slate2">
        <span className="inline-block h-2 w-2 rounded-full bg-brand-red" />
        Acceso restringido
      </div>
      <h1 className="mt-2 text-[22px] font-extrabold text-ink">Introduce la contraseña</h1>
      <p className="mt-1 text-[13px] text-slate2">
        Esta web está temporalmente cerrada. Contacta con el administrador si necesitas acceso.
      </p>

      <label className="mt-5 block text-[13px] font-semibold text-ink" htmlFor="pw">
        Contraseña
      </label>
      <input
        id="pw"
        type="password"
        autoFocus
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 w-full rounded-card border border-hair bg-white px-3 py-2 text-[15px] text-ink outline-none focus:border-navy"
      />

      {error && (
        <p className="mt-3 text-[13px] font-semibold text-brand-red" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || password.length === 0}
        className="mt-5 w-full rounded-pill bg-navy px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
      >
        {loading ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
