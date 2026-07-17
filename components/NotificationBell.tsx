"use client";

import { useEffect, useRef, useState } from "react";

type ClientNotification = { id: string; at: string; texto: string; leido: boolean; url?: string };

function formatDate(iso: string) {
  try { return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); }
  catch { return iso; }
}

// Campana de avisos sobre las llamadas del cliente (reprogramada, hecha,
// cancelada) — mismo mecanismo que un centro de notificaciones cualquiera,
// pero sencillo: sin sockets, se refresca al abrir el área y al desplegar
// la campana.
export function NotificationBell() {
  const [items, setItems] = useState<ClientNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/client/notifications");
      const body = await res.json();
      if (body.ok) setItems(body.notifications ?? []);
    } catch { /* noop */ }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      const unreadIds = items.filter((n) => !n.leido).map((n) => n.id);
      if (unreadIds.length) {
        setItems((prev) => prev.map((n) => ({ ...n, leido: true })));
        try {
          await fetch("/api/client/notifications", {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: unreadIds }),
          });
        } catch { /* noop */ }
      }
    }
  }

  const unread = items.filter((n) => !n.leido).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button" onClick={toggleOpen} aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`}
        className="relative grid h-9 w-9 place-items-center rounded-card border border-hair bg-white text-navy transition-colors hover:bg-mist"
      >
        <BellIcon />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notificaciones" className="absolute left-0 z-30 mt-2 w-80 max-w-[90vw] rounded-card border border-hair bg-white p-2 shadow-card">
          {items.length === 0 ? (
            <p className="p-3 text-[13px] text-slate2">Sin notificaciones todavía.</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  {n.url ? (
                    <a href={n.url} className="block rounded-lg px-3 py-2.5 hover:bg-mist">
                      <p className="text-[13px] font-medium leading-relaxed text-navy underline">{n.texto}</p>
                      <p className="mt-0.5 text-[11px] text-slate2">{formatDate(n.at)}</p>
                    </a>
                  ) : (
                    <div className="rounded-lg px-3 py-2.5 hover:bg-mist">
                      <p className="text-[13px] leading-relaxed text-ink">{n.texto}</p>
                      <p className="mt-0.5 text-[11px] text-slate2">{formatDate(n.at)}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
