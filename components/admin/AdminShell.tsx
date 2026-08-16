"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { ChevronDown, Menu, Close, Spinner, Sun, Moon, Sidebar, IconByName } from "@/components/icons";
import { useSiteTheme } from "@/lib/useTheme";
import { useAdminChrome } from "@/components/admin/AdminChrome";
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

// Árbol de navegación anidado (estilo SaaS): secciones padre → subsecciones
// → páginas. Cada hoja lleva su módulo de permisos: si el agente no tiene
// acceso, no se le muestra (ni la sección que quedaría vacía). Los `key` de
// cada hoja se conservan idénticos a los que cada página pasa como
// `active="…"`, así reorganizar el menú NO obliga a tocar las ~40 páginas.
type NavLeaf = { kind: "leaf"; href: string; label: string; key: string; modulo: AdminModule };
type NavGroup = { kind: "group"; label: string; key: string; icon?: string; children: NavNode[] };
type NavNode = NavLeaf | NavGroup;

function leaf(href: string, label: string, key: string, modulo: AdminModule): NavLeaf {
  return { kind: "leaf", href, label, key, modulo };
}

const NAV: NavNode[] = [
  {
    kind: "group", label: "CRM", key: "grp-crm", icon: "inbox",
    children: [
      leaf("/admin", "Leads", "leads", "leads"),
      leaf("/admin/presupuestos", "Presupuestos", "presupuestos", "presupuestos"),
      leaf("/admin/llamadas", "Llamadas", "llamadas", "llamadas"),
      leaf("/admin/tareas", "Tareas", "tareas", "tareas"),
    ],
  },
  {
    kind: "group", label: "Marketing", key: "grp-marketing", icon: "megaphone",
    children: [
      leaf("/admin/promociones", "Promociones", "promociones", "promociones"),
      leaf("/admin/promociones?tab=campana", "Campaña home", "campana", "campana"),
      leaf("/admin/campanas/referidos", "Programa referidos", "lp-referral", "campana"),
      leaf("/admin/exit-intents", "Exit-intent", "exitintents", "exitintents"),
    ],
  },
  {
    kind: "group", label: "Páginas", key: "grp-paginas", icon: "layers",
    children: [
      leaf("/admin/blog", "Blog", "blog", "blog"),
      leaf("/admin/testimonios", "Testimonios", "testimonios", "testimonios"),
      leaf("/admin/campanas/landings", "Landings paid", "landings", "campana"),
      leaf("/admin/campanas/landings/comparar", "Comparar landings", "landings-comparar", "campana"),
      leaf("/admin/campanas/precio-mejor", "Landing precio mejor", "lp-price-match", "campana"),
    ],
  },
  {
    kind: "group", label: "Productos", key: "grp-productos", icon: "box",
    children: [
      leaf("/admin/productos", "Catálogo de productos", "productos", "productos"),
    ],
  },
  {
    kind: "group", label: "Analítica", key: "grp-analitica", icon: "bars",
    children: [
      leaf("/admin/informes", "Informes", "informes", "informes"),
      leaf("/admin/utm", "UTM", "utm", "informes"),
      leaf("/admin/informes/referidos", "Referidos", "informes-referidos", "informes"),
    ],
  },
  {
    kind: "group", label: "Configuración", key: "grp-config", icon: "settings",
    children: [
      {
        kind: "group", label: "General", key: "grp-config-general",
        children: [
          leaf("/admin/configuracion/cookies", "Cookies", "cookies", "configuracion"),
          leaf("/admin/configuracion/analitica", "Seguimiento (GTM/GA4)", "analitica", "configuracion"),
          leaf("/admin/configuracion/accesibilidad", "Accesibilidad", "accesibilidad", "configuracion"),
          leaf("/admin/configuracion/avisos", "Avisos al equipo", "avisos", "configuracion"),
          leaf("/admin/configuracion/plantillas-email", "Plantillas de email", "plantillas-email", "configuracion"),
          leaf("/admin/rgpd", "RGPD", "rgpd", "rgpd"),
        ],
      },
      {
        kind: "group", label: "Diseño", key: "grp-config-diseno",
        children: [
          leaf("/admin/diseno", "Resumen", "diseno", "configuracion"),
          leaf("/admin/diseno/colores", "Colores", "diseno-colores", "configuracion"),
          leaf("/admin/diseno/tipografia", "Tipografías", "diseno-tipografia", "configuracion"),
          leaf("/admin/diseno/logos", "Logos y favicon", "diseno-logos", "configuracion"),
          leaf("/admin/diseno/portadas", "Fotos de portada", "diseno-portadas", "configuracion"),
          leaf("/admin/diseno/aseguradoras", "Aseguradoras aliadas", "diseno-aseguradoras", "configuracion"),
          leaf("/admin/diseno/loader", "Loader entre páginas", "diseno-loader", "configuracion"),
          leaf("/admin/diseno/home-hero", "Hero de la Home", "diseno-home-hero", "configuracion"),
          leaf("/admin/diseno/widget-auto", "Widget de auto", "diseno-widget-auto", "configuracion"),
        ],
      },
      {
        kind: "group", label: "Integraciones", key: "grp-config-integraciones",
        children: [
          leaf("/admin/integraciones", "Resumen", "integraciones", "integraciones"),
          leaf("/admin/integraciones/codescopic", "Codescopic", "integraciones-codescopic", "integraciones"),
          leaf("/admin/integraciones/tremendous", "Tremendous", "integraciones-tremendous", "integraciones"),
          leaf("/admin/integraciones/api", "API propia", "integraciones-api", "integraciones"),
          leaf("/admin/integraciones/webhooks", "Webhooks", "integraciones-webhooks", "integraciones"),
        ],
      },
      {
        kind: "group", label: "Equipo", key: "grp-config-equipo",
        children: [
          leaf("/admin/agentes", "Agentes", "agentes", "agentes"),
          leaf("/admin/permisos", "Permisos", "permisos", "agentes"),
          leaf("/admin/registro", "Registro de actividad", "registro", "agentes"),
        ],
      },
    ],
  },
];

// Cadena de keys de todos los grupos ANTECESORES de la página activa, para
// abrir el acordeón completo (incluidas subsecciones anidadas) al entrar.
function ancestorsOfActive(nodes: NavNode[], active: string, trail: string[] = []): string[] | null {
  for (const n of nodes) {
    if (n.kind === "leaf") {
      if (n.key === active) return trail;
    } else {
      const r = ancestorsOfActive(n.children, active, [...trail, n.key]);
      if (r) return r;
    }
  }
  return null;
}

export type AdminActiveKey =
  | "leads" | "presupuestos" | "llamadas" | "tareas" | "informes" | "utm" | "informes-referidos" | "productos" | "campana" | "landings" | "landings-comparar" | "lp-price-match" | "lp-referral" | "blog"
  | "exitintents" | "promociones" | "testimonios"
  | "diseno" | "diseno-colores" | "diseno-tipografia" | "diseno-logos" | "diseno-portadas"
  | "diseno-aseguradoras" | "diseno-loader" | "diseno-home-hero" | "diseno-widget-auto"
  | "integraciones" | "integraciones-codescopic" | "integraciones-tremendous" | "integraciones-api" | "integraciones-webhooks"
  | "cookies" | "analitica" | "accesibilidad" | "avisos" | "plantillas-email" | "rgpd" | "agentes" | "permisos" | "registro";

// Filtro de permisos recursivo: una hoja se ve si el agente tiene su módulo;
// un grupo se ve solo si le queda al menos una hoja visible dentro.
function filterNodes(nodes: NavNode[], canSee: (m: AdminModule) => boolean): NavNode[] {
  const out: NavNode[] = [];
  for (const n of nodes) {
    if (n.kind === "leaf") {
      if (canSee(n.modulo)) out.push(n);
    } else {
      const kids = filterNodes(n.children, canSee);
      if (kids.length) out.push({ ...n, children: kids });
    }
  }
  return out;
}

function NavTree({
  nodes, active, openGroups, onToggle, onNavigate, depth = 0,
}: {
  nodes: NavNode[]; active: AdminActiveKey; openGroups: Set<string>;
  onToggle: (key: string) => void; onNavigate?: () => void; depth?: number;
}) {
  return (
    <>
      {nodes.map((n) => {
        if (n.kind === "leaf") {
          return (
            <a
              key={n.key} href={n.href} onClick={onNavigate}
              className={`rounded-card px-3 py-2 text-[13.5px] font-medium transition-colors ${
                active === n.key ? "bg-navy text-white" : "text-navy hover:bg-mist"
              }`}
            >
              {n.label}
            </a>
          );
        }
        const open = openGroups.has(n.key);
        const isTop = depth === 0;
        return (
          <div key={n.key}>
            <button
              type="button" onClick={() => onToggle(n.key)} aria-expanded={open}
              className={isTop
                ? "flex w-full items-center gap-2.5 rounded-card px-3 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-mist"
                : "flex w-full items-center gap-2 rounded-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate2 transition-colors hover:bg-mist hover:text-navy"}
            >
              {isTop && n.icon && <span className="shrink-0 text-navy"><IconByName name={n.icon} width={17} height={17} /></span>}
              <span className="text-left">{n.label}</span>
              <ChevronDown width={14} height={14} className={`ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="mt-0.5 ml-3 flex flex-col gap-0.5 border-l border-hair pl-2.5">
                <NavTree nodes={n.children} active={active} openGroups={openGroups} onToggle={onToggle} onNavigate={onNavigate} depth={depth + 1} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function NavList({
  active, openGroups, onToggleGroup, onNavigate, identity,
}: { active: AdminActiveKey; openGroups: Set<string>; onToggleGroup: (key: string) => void; onNavigate?: () => void; identity: Identity | null }) {
  const canSee = (modulo: AdminModule) => !identity || identity.rol === "admin" || identity.permisos.includes(modulo);
  const nodes = filterNodes(NAV, canSee);
  return <NavTree nodes={nodes} active={active} openGroups={openGroups} onToggle={onToggleGroup} onNavigate={onNavigate} />;
}

// Marca de la cabecera del panel: logo real (editable en /admin/diseno/logos)
// con reserva a wordmark de texto en dos colores si aún no hay logo. El
// contenedor `.admin-logo-wrap` gana un fondo claro sutil en modo oscuro
// (ver app/globals.css) para que un logo pensado para fondo claro siga
// siendo legible sobre el sidebar oscuro.
function BrandMark() {
  const theme = useSiteTheme();
  if (theme.logoUrl) {
    return (
      <span className="admin-logo-wrap inline-flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={theme.logoUrl} alt={BRAND_NAME} className="h-8 w-auto max-w-[150px] object-contain" />
      </span>
    );
  }
  const [first, ...rest] = BRAND_NAME.split(" ");
  return (
    <span translate="no" className="font-display text-[15px] font-extrabold leading-tight text-navy">
      {first} {rest.length > 0 && <span className="text-brand-red">{rest.join(" ")}</span>}
    </span>
  );
}

// Fila de controles del sidebar: modo oscuro + ocultar el menú.
function ChromeControls({ onCollapse }: { onCollapse?: () => void }) {
  const { dark, toggleDark } = useAdminChrome();
  return (
    <div className="mb-2 flex items-center gap-1">
      <button
        type="button" onClick={toggleDark}
        aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
        title={dark ? "Modo claro" : "Modo oscuro"}
        className="grid h-9 w-9 place-items-center rounded-card border border-hair text-navy transition-colors hover:bg-mist"
      >
        {dark ? <Sun width={17} height={17} /> : <Moon width={17} height={17} />}
      </button>
      {onCollapse && (
        <button
          type="button" onClick={onCollapse}
          aria-label="Ocultar menú lateral" title="Ocultar menú"
          className="grid h-9 w-9 place-items-center rounded-card border border-hair text-navy transition-colors hover:bg-mist"
        >
          <Sidebar width={17} height={17} />
        </button>
      )}
    </div>
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
  const { sidebarCollapsed, setSidebarCollapsed } = useAdminChrome();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    // Abre toda la cadena de secciones que contiene la página activa.
    return new Set(ancestorsOfActive(NAV, active) ?? []);
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
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="rounded-pill bg-navy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">Admin</span>
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
              <ChromeControls />
              <IdentityCard identity={identity} onLogout={clear} />
            </div>
          </div>
        )}

        {/* Sidebar de escritorio — se oculta por completo al colapsar para
            dar todo el ancho a la página; un botón flotante lo devuelve. */}
        {!sidebarCollapsed && (
          <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-hair bg-white lg:flex">
            <div className="flex items-center justify-between gap-2 border-b border-hair px-4 py-4">
              <BrandMark />
              <span className="rounded-pill bg-navy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">Admin</span>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              <NavList active={active} openGroups={openGroups} onToggleGroup={toggleGroup} identity={identity} />
            </nav>
            <div className="border-t border-hair p-3">
              <ChromeControls onCollapse={() => setSidebarCollapsed(true)} />
              <IdentityCard identity={identity} onLogout={clear} />
            </div>
          </aside>
        )}
        {sidebarCollapsed && (
          <button
            type="button" onClick={() => setSidebarCollapsed(false)}
            aria-label="Mostrar menú lateral" title="Mostrar menú"
            className="fixed left-3 top-3 z-40 hidden h-10 w-10 place-items-center rounded-card border border-hair bg-white text-navy shadow-card transition-colors hover:bg-mist lg:grid"
          >
            <Menu width={20} height={20} />
          </button>
        )}
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
  // Estado del segundo paso 2FA (email OTP). Cuando login devuelve
  // { otpRequired, nonce, emailHint } cambiamos a pantalla OTP; el user
  // pega el código de 6 dígitos, /otp-verify crea la cookie de sesión.
  const [otpNonce, setOtpNonce] = useState<string | null>(null);
  const [otpEmailHint, setOtpEmailHint] = useState<string>("");
  const [otpCode, setOtpCode] = useState("");
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
      if (body.otpRequired && typeof body.nonce === "string") {
        setOtpNonce(body.nonce);
        setOtpEmailHint(typeof body.emailHint === "string" ? body.emailHint : "");
        setOtpCode("");
        setSubmitting(false);
        return;
      }
      onAgentLoggedIn();
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
        // Si el nonce ha muerto (429/401 sin recuperación), volver al paso 1.
        if (res.status === 429 || (res.status === 401 && /caducado|iniciar sesión/i.test(String(body.error ?? "")))) {
          setOtpNonce(null); setOtpCode("");
        }
        return;
      }
      onAgentLoggedIn();
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  function cancelOtp() {
    setOtpNonce(null); setOtpCode(""); setError(null);
  }

  // Pantalla intermedia: contraseña OK, pedimos código de 6 dígitos.
  if (otpNonce) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist px-5">
        <div className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 shadow-card">
          <BrandMark />
          <h1 className="mt-3 text-[22px] font-extrabold text-navy">Verificación en 2 pasos</h1>
          <p className="mt-2 text-[13px] text-slate2">
            Te hemos enviado un código de 6 dígitos a <span className="font-semibold text-navy">{otpEmailHint || "tu email"}</span>. Caduca en 10 minutos.
          </p>
          <form onSubmit={submitOtp} className="mt-4">
            <label htmlFor="otp-code" className="sr-only">Código</label>
            <input
              id="otp-code" name="otp" type="text" inputMode="numeric" pattern="\d{6}"
              autoComplete="one-time-code" maxLength={6} value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-card border border-hair bg-white px-4 py-3 text-center font-mono text-[22px] tracking-[.4em]"
              autoFocus
            />
            {error && <p role="alert" className="mt-2.5 text-[13px] font-medium text-brand-red">{error}</p>}
            <button
              type="submit" disabled={submitting || otpCode.length !== 6} aria-busy={submitting || undefined}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[16px] font-semibold text-white disabled:bg-slate2/40"
            >
              {submitting && <Spinner />}
              {submitting ? "Verificando…" : "Verificar"}
            </button>
            <button
              type="button" onClick={cancelOtp}
              className="mt-2 w-full rounded-card border border-hair bg-white px-5 py-2.5 text-[13px] font-semibold text-navy"
            >
              Volver a introducir email y contraseña
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-5">
      <div className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 shadow-card">
        <BrandMark />
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
