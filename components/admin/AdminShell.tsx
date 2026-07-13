"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";

const TOKEN_KEY = "ventajon:admin:token";

const AdminTokenContext = createContext<{ token: string; clear: () => void } | null>(null);

export function useAdminToken() {
  const ctx = useContext(AdminTokenContext);
  if (!ctx) throw new Error("useAdminToken debe usarse dentro de <AdminShell>.");
  return ctx;
}

const TABS = [
  { href: "/admin", label: "Leads", key: "leads" },
  { href: "/admin/presupuestos", label: "Presupuestos", key: "presupuestos" },
  { href: "/admin/productos", label: "Productos", key: "productos" },
  { href: "/admin/campana", label: "Campaña", key: "campana" },
  { href: "/admin/diseno", label: "Diseño", key: "diseno" },
] as const;

export function AdminShell({ children, active }: { children: React.ReactNode; active: "leads" | "presupuestos" | "productos" | "campana" | "diseno" }) {
  const [token, setToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get("token");
    const stored = urlToken || sessionStorage.getItem(TOKEN_KEY);
    if (stored) {
      sessionStorage.setItem(TOKEN_KEY, stored);
      setToken(stored);
    }
    setReady(true);
  }, []);

  function enter() {
    if (!input.trim()) return;
    sessionStorage.setItem(TOKEN_KEY, input.trim());
    setToken(input.trim());
  }

  function clear() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  if (!ready) return null;

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist px-5">
        <div className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 shadow-card">
          <p className="font-display text-[16px] font-extrabold text-navy" translate="no">{BRAND_NAME}</p>
          <h1 className="mt-3 text-[22px] font-extrabold text-navy">Admin</h1>
          <p className="mt-1 text-[14px] text-slate2">Introduce el token de acceso.</p>
          <label htmlFor="tk" className="sr-only">Token</label>
          <input
            id="tk" type="password" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enter()}
            placeholder="ADMIN_TOKEN…"
            className="mt-4 w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px]"
          />
          <button
            onClick={enter} disabled={!input.trim()}
            className="mt-4 w-full rounded-card bg-navy px-5 py-3.5 text-[16px] font-semibold text-white disabled:bg-slate2/40"
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  return (
    <AdminTokenContext.Provider value={{ token, clear }}>
      <div className="flex min-h-screen bg-mist">
        <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-hair bg-white">
          <div className="border-b border-hair px-5 py-4">
            <p className="font-display text-[15px] font-extrabold leading-tight text-navy" translate="no">{BRAND_NAME}</p>
            <p className="text-[12px] font-medium text-slate2">Admin</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {TABS.map((t) => (
              <a
                key={t.key} href={t.href}
                className={`rounded-card px-3.5 py-2.5 text-[14px] font-semibold transition-colors ${
                  active === t.key ? "bg-navy text-white" : "text-navy hover:bg-mist"
                }`}
              >
                {t.label}
              </a>
            ))}
          </nav>
          <div className="border-t border-hair p-3">
            <button onClick={clear} className="w-full rounded-card px-3.5 py-2 text-left text-[13px] font-medium text-slate2 transition-colors hover:bg-mist">
              Salir
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AdminTokenContext.Provider>
  );
}
