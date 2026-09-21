"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { Spinner } from "@/components/icons";

// Página secreta (/portal-desarrollo, no enlazada en ningún menú ni en el
// sitemap): mismo sistema de identidad que /admin (token maestro o sesión de
// agente vía /api/admin/auth/*), pero exige el módulo "desarrollador" en vez
// de estar filtrada por el módulo concreto de cada sección del panel. Así un
// desarrollador externo puede tener acceso solo a esto, sin ver leads ni el
// resto del CRM.
const TOKEN_KEY = "ventajon:admin:token"; // mismo storage que AdminShell: si ya has entrado en /admin en esta pestaña, entras aquí sin volver a loguearte.

type DevIdentity = { nombre: string; rol: "admin" | "agente"; permisos: readonly string[] };

const DevTokenContext = createContext<{ token: string } | null>(null);
export function useDevToken() {
  const ctx = useContext(DevTokenContext);
  if (!ctx) throw new Error("useDevToken debe usarse dentro de <DevPortalGate>.");
  return ctx;
}

export function DevPortalGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [identity, setIdentity] = useState<DevIdentity | null>(null);
  const [ready, setReady] = useState(false);

  async function loadIdentity(headerToken: string) {
    try {
      const res = await fetch("/api/admin/auth/me", { headers: headerToken ? { "x-admin-token": headerToken } : {} });
      const body = await res.json();
      if (res.ok && body.ok) { setIdentity(body.identity); return; }
    } catch { /* noop */ }
    setIdentity(null);
  }

  useEffect(() => {
    (async () => {
      const stored = sessionStorage.getItem(TOKEN_KEY) ?? "";
      setToken(stored);
      await loadIdentity(stored);
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  const hasAccess = !!identity && (identity.rol === "admin" || identity.permisos.includes("desarrollador"));

  if (!identity) {
    return <DevLoginScreen onLoggedIn={async (t) => { setToken(t); await loadIdentity(t); }} />;
  }

  if (!hasAccess) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist px-5">
        <div className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 text-center shadow-card">
          <h1 className="text-[18px] font-extrabold text-navy">Sin acceso</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-slate2">
            Tu cuenta ({identity.nombre}) no tiene el permiso "desarrollador" necesario para ver esta página.
            Pídele a un administrador que te lo conceda desde /admin/permisos.
          </p>
        </div>
      </main>
    );
  }

  return <DevTokenContext.Provider value={{ token }}>{children}</DevTokenContext.Provider>;
}

function DevLoginScreen({ onLoggedIn }: { onLoggedIn: (token: string) => void }) {
  const [mode, setMode] = useState<"agent" | "master">("agent");
  const [tokenInput, setTokenInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpNonce, setOtpNonce] = useState<string | null>(null);
  const [otpEmailHint, setOtpEmailHint] = useState<string>("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function enterWithToken(value: string) {
    sessionStorage.setItem(TOKEN_KEY, value);
    onLoggedIn(value);
  }

  async function submitAgent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No hemos podido iniciar sesión."); setSubmitting(false); return; }
      if (body.otpRequired && typeof body.nonce === "string") {
        setOtpNonce(body.nonce);
        setOtpEmailHint(typeof body.emailHint === "string" ? body.emailHint : "");
        setOtpCode("");
        setSubmitting(false);
        return;
      }
      sessionStorage.removeItem(TOKEN_KEY);
      onLoggedIn("");
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpNonce) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/auth/otp-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nonce: otpNonce, code: otpCode }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? "No hemos podido verificar el código.");
        setSubmitting(false);
        if (res.status === 429 || (res.status === 401 && /caducado|iniciar sesión/i.test(String(body.error ?? "")))) {
          setOtpNonce(null); setOtpCode("");
        }
        return;
      }
      sessionStorage.removeItem(TOKEN_KEY);
      onLoggedIn("");
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  if (otpNonce) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist px-5">
        <div className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 shadow-card">
          <p className="font-display text-[16px] font-extrabold text-navy" translate="no">{BRAND_NAME}</p>
          <h1 className="mt-3 text-[22px] font-extrabold text-navy">Verificación en 2 pasos</h1>
          <p className="mt-2 text-[13px] text-slate2">
            Te hemos enviado un código a <span className="font-semibold text-navy">{otpEmailHint || "tu email"}</span>. Caduca en 10 minutos.
          </p>
          <form onSubmit={submitOtp} className="mt-4">
            <input
              type="text" inputMode="numeric" pattern="\d{6}" autoComplete="one-time-code"
              maxLength={6} value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000" autoFocus
              className="w-full rounded-card border border-hair bg-white px-4 py-3 text-center font-mono text-[22px] tracking-[.4em]"
            />
            {error && <p role="alert" className="mt-2.5 text-[13px] font-medium text-brand-red">{error}</p>}
            <button
              type="submit" disabled={submitting || otpCode.length !== 6}
              className="mt-4 w-full rounded-card bg-navy px-5 py-3.5 text-[16px] font-semibold text-white disabled:bg-slate2/40"
            >
              {submitting ? "Verificando…" : "Verificar"}
            </button>
            <button
              type="button" onClick={() => { setOtpNonce(null); setOtpCode(""); setError(null); }}
              className="mt-2 w-full rounded-card border border-hair bg-white px-5 py-2.5 text-[13px] font-semibold text-navy"
            >
              Volver
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-5">
      <div className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 shadow-card">
        <p className="font-display text-[16px] font-extrabold text-navy" translate="no">{BRAND_NAME}</p>
        <h1 className="mt-3 text-[22px] font-extrabold text-navy">Documentación técnica</h1>
        <p className="mt-1 text-[13px] text-slate2">Acceso restringido al equipo de desarrollo.</p>

        <div className="mt-4 flex overflow-hidden rounded-card border border-hair">
          <button type="button" onClick={() => setMode("agent")}
            className={`flex-1 px-3 py-2 text-[13px] font-semibold transition-colors ${mode === "agent" ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
            Cuenta de equipo
          </button>
          <button type="button" onClick={() => setMode("master")}
            className={`flex-1 px-3 py-2 text-[13px] font-semibold transition-colors ${mode === "master" ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
            Token maestro
          </button>
        </div>

        {mode === "agent" ? (
          <form onSubmit={submitAgent} className="mt-4">
            <label htmlFor="dev-email" className="sr-only">Email</label>
            <input
              id="dev-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px]"
            />
            <label htmlFor="dev-password" className="sr-only">Contraseña</label>
            <input
              id="dev-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" className="mt-2.5 w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px]"
            />
            {error && <p role="alert" className="mt-2.5 text-[13px] font-medium text-brand-red">{error}</p>}
            <button
              type="submit" disabled={submitting || !email || !password} aria-busy={submitting || undefined}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[16px] font-semibold text-white disabled:bg-slate2/40"
            >
              {submitting && <Spinner />}
              {submitting ? "Entrando…" : "Entrar"}
            </button>
          </form>
        ) : (
          <div className="mt-4">
            <label htmlFor="dev-tk" className="sr-only">Token</label>
            <input
              id="dev-tk" type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tokenInput.trim() && enterWithToken(tokenInput.trim())}
              placeholder="ADMIN_TOKEN…"
              className="mt-3 w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px]"
            />
            <button
              onClick={() => tokenInput.trim() && enterWithToken(tokenInput.trim())} disabled={!tokenInput.trim()}
              className="mt-4 w-full rounded-card bg-navy px-5 py-3.5 text-[16px] font-semibold text-white disabled:bg-slate2/40"
            >
              Entrar
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
