"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { ChevronDown, Menu, Close, Spinner } from "@/components/icons";
import type { AdminModule } from "@/lib/crm";

const TOKEN_KEY = "ventajon:admin:token";

export type Identity = {
  kind: "master" | "agent";
  id: string;
  nombre: string;
  fotoUrl: string;
  rol: "admin" | "agente";
  permisos: readonly string[];
};

const AdminTokenContext = createContext<{ token: string; clear: () => void; agent: string; identity: Identity | null } | null>(null);

export function useAdminToken() {
  const ctx = useContext(AdminTokenContext);
  if (!ctx) throw new Error("useAdminToken debe usarse dentro de <AdminShell>.");
  return ctx;
}

type NavLeaf = { href: string; label: string; key: string; modulo: AdminModule };

// Navegación agrupada por categoría, con desplegables — así el menú crece
// por secciones coherentes en vez de una lista plana de páginas. Cada hoja
// lleva su módulo de permisos: si el agente que ha entrado no tiene acceso,
// no se le muestra.
const NAV: ({ kind: "link" } & NavLeaf | { kind: "group"; label: string; key: string; children: NavLeaf[] })[] = [
  {
    kind: "group", label: "Ventas", key: "ventas",
    children: [
      { href: "/admin", label: "Leads", key: "leads", modulo: "leads" },
      { href: "/admin/presupuestos", label: "Presupuestos", key: "presupuestos", modulo: "presupuestos" },
      { href: "/admin/llamadas", label: "Llamadas", key: "llamadas", modulo: "llamadas" },
      { href: "/admin/tareas", label: "Tareas", key: "tareas", modulo: "tareas" },
    ],
  },
  {
    kind: "group", label: "Contenido", key: "contenido",
    children: [
      { href: "/admin/blog", label: "Blog", key: "blog", modulo: "blog" },
      { href: "/admin/campana", label: "Campaña", key: "campana", modulo: "campana" },
    ],
  },
  { kind: "link", href: "/admin/productos", label: "Productos", key: "productos", modulo: "productos" },
  {
    kind: "group", label: "Analítica", key: "analitica-grupo",
    children: [
      { href: "/admin/informes", label: "Informes", key: "informes", modulo: "informes" },
      { href: "/admin/utm", label: "UTM", key: "utm", modulo: "informes" },
    ],
  },
  {
    kind: "group", label: "Configuración", key: "configuracion-grupo",
    children: [
      { href: "/admin/diseno", label: "Diseño", key: "diseno", modulo: "configuracion" },
      { href: "/admin/configuracion/cookies", label: "Cookies", key: "cookies", modulo: "configuracion" },
      { href: "/admin/configuracion/analitica", label: "Analítica", key: "analitica", modulo: "configuracion" },
      { href: "/admin/configuracion/accesibilidad", label: "Accesibilidad", key: "accesibilidad", modulo: "configuracion" },
      { href: "/admin/rgpd", label: "RGPD", key: "rgpd", modulo: "rgpd" },
    ],
  },
  {
    kind: "group", label: "Equipo", key: "equipo-grupo",
    children: [
      { href: "/admin/agentes", label: "Agentes", key: "agentes", modulo: "agentes" },
      { href: "/admin/permisos", label: "Permisos", key: "permisos", modulo: "agentes" },
      { href: "/admin/registro", label: "Registro de actividad", key: "registro", modulo: "agentes" },
    ],
  },
];

function groupKeyForActive(active: string): string | null {
  for (const item of NAV) {
    if (item.kind === "group" && item.children.some((c) => c.key === active)) return item.key;
  }
  return null;
}

export type AdminActiveKey =
  | "leads" | "presupuestos" | "llamadas" | "tareas" | "informes" | "utm" | "productos" | "campana" | "blog"
  | "diseno" | "cookies" | "analitica" | "accesibilidad" | "rgpd" | "agentes" | "permisos" | "registro";

function visibleFor(identity: Identity | null) {
  const canSee = (modulo: AdminModule) => !identity || identity.rol === "admin" || identity.permisos.includes(modulo);
  return NAV
    .map((item) => item.kind === "link" ? item : { ...item, children: item.children.filter((c) => canSee(c.modulo)) })
    .filter((item) => item.kind === "link" ? canSee(item.modulo) : item.children.length > 0);
}

function NavList({
  active, openGroups, onToggleGroup, onNavigate, identity,
}: { active: AdminActiveKey; openGroups: Set<string>; onToggleGroup: (key: string) => void; onNavigate?: () => void; identity: Identity | null }) {
  return (
    <>
      {visibleFor(identity).map((item) => {
        if (item.kind === "link") {
          return (
            <a
              key={item.key} href={item.href} onClick={onNavigate}
              className={`rounded-card px-3.5 py-2.5 text-[14px] font-semibold transition-colors ${
                active === item.key ? "bg-navy text-white" : "text-navy hover:bg-mist"
              }`}
            >
              {item.label}
            </a>
          );
        }
        const open = openGroups.has(item.key);
        return (
          <div key={item.key}>
            <button
              type="button"
              onClick={() => onToggleGroup(item.key)}
              aria-expanded={open}
              className="flex w-full items-center justify-between rounded-card px-3.5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate2 transition-colors hover:bg-mist hover:text-navy"
            >
              {item.label}
              <ChevronDown width={14} height={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="ml-1 flex flex-col gap-1 border-l border-hair pl-3">
                {item.children.map((c) => (
                  <a
                    key={c.key} href={c.href} onClick={onNavigate}
                    className={`rounded-card px-3 py-2 text-[14px] font-semibold transition-colors ${
                      active === c.key ? "bg-navy text-white" : "text-navy hover:bg-mist"
                    }`}
                  >
                    {c.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function IdentityCard({ identity, onLogout }: { identity: Identity | null; onLogout: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2.5 rounded-card px-2 py-2">
        {identity?.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={identity.fotoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy/10 text-[13px] font-bold text-navy">
            {(identity?.nombre ?? "?").trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{identity?.nombre ?? "…"}</p>
          {identity && <p className="text-[11px] capitalize text-slate2">{identity.rol === "admin" ? "Administrador" : "Agente"}</p>}
        </div>
      </div>
      <button onClick={onLogout} className="mt-1 w-full rounded-card px-3.5 py-2 text-left text-[13px] font-medium text-slate2 transition-colors hover:bg-mist">
        Salir
      </button>
    </>
  );
}

export function AdminShell({
  children, active,
}: { children: React.ReactNode; active: AdminActiveKey }) {
  const [token, setToken] = useState<string>("");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const g = groupKeyForActive(active);
    return new Set(g ? [g] : []);
  });

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const loadIdentity = useCallback(async (headerToken: string) => {
    try {
      const res = await fetch("/api/admin/auth/me", { headers: headerToken ? { "x-admin-token": headerToken } : {} });
      const body = await res.json();
      if (res.ok && body.ok) { setIdentity(body.identity); return true; }
    } catch { /* noop */ }
    setIdentity(null);
    return false;
  }, []);

  useEffect(() => {
    (async () => {
      const urlToken = new URLSearchParams(window.location.search).get("token");
      const stored = urlToken || sessionStorage.getItem(TOKEN_KEY);
      if (stored) sessionStorage.setItem(TOKEN_KEY, stored);
      if (urlToken) {
        // Se guarda en sessionStorage y ya no hace falta en la URL visible:
        // dejarlo ahí lo expondría en el historial del navegador y en
        // cualquier herramienta de analítica que capture la URL completa.
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
      }
      const t = stored ?? "";
      setToken(t);
      await loadIdentity(t);
      setReady(true);
    })();
  }, [loadIdentity]);

  function clear() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setIdentity(null);
    fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => {});
  }

  async function enterWithToken(value: string) {
    sessionStorage.setItem(TOKEN_KEY, value);
    setToken(value);
    await loadIdentity(value);
  }

  async function enterAsAgent() {
    setToken("");
    await loadIdentity("");
  }

  if (!ready) return null;

  const loggedIn = !!token || identity?.kind === "agent";

  if (!loggedIn) {
    return <LoginScreen onMasterToken={enterWithToken} onAgentLoggedIn={enterAsAgent} />;
  }

  return (
    <AdminTokenContext.Provider value={{ token, clear, agent: identity?.nombre ?? "", identity }}>
      <div className="min-h-screen bg-mist lg:flex">
        {/* Cabecera móvil: marca + botón de menú. La navegación completa vive
            en un panel desplegable debajo, no en el sidebar de escritorio. */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-hair bg-white px-4 py-3 lg:hidden">
          <div>
            <p className="font-display text-[15px] font-extrabold leading-tight text-navy" translate="no">{BRAND_NAME}</p>
            <p className="text-[11px] font-medium text-slate2">Admin</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
            className="grid h-10 w-10 place-items-center rounded-card border border-hair text-navy"
          >
            {mobileNavOpen ? <Close width={20} height={20} /> : <Menu width={20} height={20} />}
          </button>
        </header>
        {mobileNavOpen && (
          <div className="sticky top-[57px] z-30 max-h-[calc(100vh-57px)] overflow-y-auto border-b border-hair bg-white p-3 shadow-card lg:hidden">
            <nav className="flex flex-col gap-1">
              <NavList active={active} openGroups={openGroups} onToggleGroup={toggleGroup} onNavigate={() => setMobileNavOpen(false)} identity={identity} />
            </nav>
            <div className="mt-2 border-t border-hair pt-2">
              <IdentityCard identity={identity} onLogout={clear} />
            </div>
          </div>
        )}

        {/* Sidebar de escritorio */}
        <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-hair bg-white lg:flex">
          <div className="border-b border-hair px-5 py-4">
            <p className="font-display text-[15px] font-extrabold leading-tight text-navy" translate="no">{BRAND_NAME}</p>
            <p className="text-[12px] font-medium text-slate2">Admin</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            <NavList active={active} openGroups={openGroups} onToggleGroup={toggleGroup} identity={identity} />
          </nav>
          <div className="border-t border-hair p-3">
            <IdentityCard identity={identity} onLogout={clear} />
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AdminTokenContext.Provider>
  );
}

// Pantalla de entrada: dos caminos que coexisten. El ADMIN_TOKEN maestro
// (heredado, nunca se puede quedar el equipo sin poder entrar) y el login
// propio de cada agente (email + contraseña), que además aplica sus
// permisos.
function LoginScreen({ onMasterToken, onAgentLoggedIn }: { onMasterToken: (token: string) => void; onAgentLoggedIn: () => void }) {
  const [mode, setMode] = useState<"agent" | "master">("agent");
  const [tokenInput, setTokenInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      onAgentLoggedIn();
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-5">
      <div className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 shadow-card">
        <p className="font-display text-[16px] font-extrabold text-navy" translate="no">{BRAND_NAME}</p>
        <h1 className="mt-3 text-[22px] font-extrabold text-navy">Admin</h1>

        <div className="mt-4 flex overflow-hidden rounded-card border border-hair">
          <button type="button" onClick={() => setMode("agent")}
            className={`flex-1 px-3 py-2 text-[13px] font-semibold transition-colors ${mode === "agent" ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
            Soy agente
          </button>
          <button type="button" onClick={() => setMode("master")}
            className={`flex-1 px-3 py-2 text-[13px] font-semibold transition-colors ${mode === "master" ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}>
            Acceso maestro
          </button>
        </div>

        {mode === "agent" ? (
          <form onSubmit={submitAgent} className="mt-4">
            <label htmlFor="agent-email" className="sr-only">Email</label>
            <input
              id="agent-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px]"
            />
            <label htmlFor="agent-password" className="sr-only">Contraseña</label>
            <input
              id="agent-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
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
            <p className="text-[13px] text-slate2">Introduce el token de acceso maestro.</p>
            <label htmlFor="tk" className="sr-only">Token</label>
            <input
              id="tk" type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tokenInput.trim() && onMasterToken(tokenInput.trim())}
              placeholder="ADMIN_TOKEN…"
              className="mt-3 w-full rounded-card border border-hair bg-white px-4 py-3 text-[16px]"
            />
            <button
              onClick={() => tokenInput.trim() && onMasterToken(tokenInput.trim())} disabled={!tokenInput.trim()}
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
