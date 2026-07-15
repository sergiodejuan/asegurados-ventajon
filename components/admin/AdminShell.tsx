"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { getAgentName, setAgentName } from "@/lib/adminAgent";
import { ChevronDown } from "@/components/icons";

const TOKEN_KEY = "ventajon:admin:token";

const AdminTokenContext = createContext<{ token: string; clear: () => void; agent: string } | null>(null);

export function useAdminToken() {
  const ctx = useContext(AdminTokenContext);
  if (!ctx) throw new Error("useAdminToken debe usarse dentro de <AdminShell>.");
  return ctx;
}

type NavLeaf = { href: string; label: string; key: string };

// Navegación agrupada por categoría: un enlace suelto para lo que se usa a
// diario (Leads, Productos), y desplegables para el resto — así el menú
// crece por secciones coherentes en vez de una lista plana de páginas.
const NAV: ({ kind: "link" } & NavLeaf | { kind: "group"; label: string; key: string; children: NavLeaf[] })[] = [
  { kind: "link", href: "/admin", label: "Leads", key: "leads" },
  {
    kind: "group", label: "Ventas", key: "ventas",
    children: [
      { href: "/admin/presupuestos", label: "Presupuestos", key: "presupuestos" },
      { href: "/admin/tareas", label: "Tareas", key: "tareas" },
    ],
  },
  {
    kind: "group", label: "Contenido", key: "contenido",
    children: [
      { href: "/admin/blog", label: "Blog", key: "blog" },
      { href: "/admin/campana", label: "Campaña", key: "campana" },
    ],
  },
  { kind: "link", href: "/admin/productos", label: "Productos", key: "productos" },
  {
    kind: "group", label: "Analítica", key: "analitica-grupo",
    children: [
      { href: "/admin/informes", label: "Informes", key: "informes" },
      { href: "/admin/utm", label: "UTM", key: "utm" },
    ],
  },
  {
    kind: "group", label: "Configuración", key: "configuracion-grupo",
    children: [
      { href: "/admin/diseno", label: "Diseño", key: "diseno" },
      { href: "/admin/configuracion/cookies", label: "Cookies", key: "cookies" },
      { href: "/admin/configuracion/seguimiento", label: "Seguimiento (GTM)", key: "seguimiento" },
      { href: "/admin/rgpd", label: "RGPD", key: "rgpd" },
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
  | "leads" | "presupuestos" | "tareas" | "informes" | "utm" | "productos" | "campana" | "blog"
  | "diseno" | "cookies" | "seguimiento" | "rgpd";

export function AdminShell({
  children, active,
}: { children: React.ReactNode; active: AdminActiveKey }) {
  const [token, setToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const [agent, setAgent] = useState("");
  const [editingAgent, setEditingAgent] = useState(false);
  const [agentInput, setAgentInput] = useState("");
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

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get("token");
    const stored = urlToken || sessionStorage.getItem(TOKEN_KEY);
    if (stored) {
      sessionStorage.setItem(TOKEN_KEY, stored);
      setToken(stored);
    }
    setAgent(getAgentName());
    setReady(true);
  }, []);

  function saveAgent() {
    setAgentName(agentInput);
    setAgent(agentInput.trim());
    setEditingAgent(false);
  }

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
    <AdminTokenContext.Provider value={{ token, clear, agent }}>
      <div className="flex min-h-screen bg-mist">
        <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-hair bg-white">
          <div className="border-b border-hair px-5 py-4">
            <p className="font-display text-[15px] font-extrabold leading-tight text-navy" translate="no">{BRAND_NAME}</p>
            <p className="text-[12px] font-medium text-slate2">Admin</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {NAV.map((item) => {
              if (item.kind === "link") {
                return (
                  <a
                    key={item.key} href={item.href}
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
                    onClick={() => toggleGroup(item.key)}
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
                          key={c.key} href={c.href}
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
          </nav>
          <div className="border-t border-hair p-3">
            {editingAgent ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="agent-name" className="text-[11px] font-semibold text-slate2">Tu nombre (para atribuir notas y cierres)</label>
                <input id="agent-name" value={agentInput} onChange={(e) => setAgentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveAgent()}
                  placeholder="p.ej. Sergio" autoFocus
                  className="w-full rounded-card border border-hair bg-white px-2.5 py-1.5 text-[13px]" />
                <div className="flex gap-2">
                  <button onClick={saveAgent} className="flex-1 rounded-card bg-navy px-2 py-1.5 text-[12px] font-semibold text-white">Guardar</button>
                  <button onClick={() => setEditingAgent(false)} className="rounded-card border border-hair px-2 py-1.5 text-[12px] font-semibold text-navy">Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setAgentInput(agent); setEditingAgent(true); }}
                className="w-full rounded-card px-3.5 py-2 text-left text-[12px] font-medium text-slate2 transition-colors hover:bg-mist">
                {agent ? <>Agente: <span className="font-semibold text-ink">{agent}</span></> : "Identifícate como agente →"}
              </button>
            )}
            <button onClick={clear} className="mt-1 w-full rounded-card px-3.5 py-2 text-left text-[13px] font-medium text-slate2 transition-colors hover:bg-mist">
              Salir
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AdminTokenContext.Provider>
  );
}
