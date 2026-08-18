"use client";

import { useEffect, useRef, useState } from "react";
import { Close } from "./icons";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import type { InactivityModalConfig } from "@/lib/inactivityModal";

// Modal de inactividad de la comparativa: si el usuario pasa `segundos` sin
// interacción (ratón, teclado, scroll, toque), aparece un modal de re-enganche
// configurable desde /admin/marketing/modal-inactividad. Se muestra como
// máximo `maxPorSesion` veces por sesión de navegador. Funciona en desktop y
// móvil; aparece animado (backdrop fade + tarjeta pop-in).
const SESSION_KEY = "ventajon:inactModalShown";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "wheel", "touchstart"] as const;

export function InactivityModal() {
  const [config, setConfig] = useState<InactivityModalConfig | null>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const shownRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga de la config pública (una vez).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/inactivity-modal");
        const body = await res.json();
        if (!cancelled && body?.ok && body.config?.activo) setConfig(body.config as InactivityModalConfig);
      } catch { /* silencioso: sin config, no se muestra nada */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Detección de inactividad: se arma un temporizador que se reinicia con cada
  // interacción; al agotarse, se abre el modal (si no se ha alcanzado el tope).
  useEffect(() => {
    if (!config?.activo) return;
    try { shownRef.current = Number(sessionStorage.getItem(SESSION_KEY) || "0") || 0; } catch { /* sin sessionStorage */ }

    const delay = Math.max(3, config.segundos) * 1000;
    const arm = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (openRef.current) return;
      if (shownRef.current >= config.maxPorSesion) return;
      timerRef.current = setTimeout(() => {
        openRef.current = true;
        setOpen(true);
        shownRef.current += 1;
        try { sessionStorage.setItem(SESSION_KEY, String(shownRef.current)); } catch { /* noop */ }
        pushDataLayerEvent("inactivity_modal_shown", { placement: "comparativa" });
      }, delay);
    };
    const onActivity = () => { if (!openRef.current) arm(); };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    arm();
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [config]);

  // Bloquea el scroll de fondo mientras el modal está abierto + cierre con Esc.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    openRef.current = false;
    setOpen(false);
    // Re-armamos por si aún queda margen en el tope de la sesión.
    // (el efecto de arriba no se re-ejecuta; rearmamos manualmente)
    if (config && shownRef.current < config.maxPorSesion) {
      timerRef.current = setTimeout(() => {
        openRef.current = true;
        setOpen(true);
        shownRef.current += 1;
        try { sessionStorage.setItem(SESSION_KEY, String(shownRef.current)); } catch { /* noop */ }
      }, Math.max(3, config.segundos) * 1000);
    }
  }

  if (!open || !config) return null;

  const tieneImagen = !!config.imagenUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={config.titulo || "Oferta"}
      onClick={(e) => { if (e.currentTarget === e.target) close(); }}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm motion-safe:animate-fade-in"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-[24px] bg-navy shadow-card motion-safe:animate-pop-in">
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
        >
          <Close width={16} height={16} />
        </button>

        <div
          className="relative flex min-h-[440px] flex-col justify-end p-6"
          style={tieneImagen ? { backgroundImage: `url(${config.imagenUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {/* Velo para legibilidad del texto sobre la foto. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

          <div className="relative">
            {config.titulo && <h3 className="text-[26px] font-extrabold leading-tight text-white">{config.titulo}</h3>}
            {config.eyebrow && <p className="mt-3 text-[12px] font-bold uppercase tracking-wide text-white/70">{config.eyebrow}</p>}
            {config.precioTexto && <p className="mt-0.5 text-[28px] font-extrabold leading-tight text-white">{config.precioTexto}</p>}
            {config.descripcion && <p className="mt-3 text-[15px] leading-relaxed text-white/85">{config.descripcion}</p>}

            {config.ctaHref ? (
              <a
                href={config.ctaHref}
                onClick={() => { pushDataLayerEvent("inactivity_modal_cta", { placement: "comparativa" }); }}
                className="mt-5 flex w-full items-center justify-center rounded-pill bg-brand-red px-5 py-4 text-[16px] font-bold text-white transition-colors hover:bg-brand-red-deep"
              >
                {config.ctaTexto || "Ver mi precio"}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => { pushDataLayerEvent("inactivity_modal_cta", { placement: "comparativa" }); close(); }}
                className="mt-5 flex w-full items-center justify-center rounded-pill bg-brand-red px-5 py-4 text-[16px] font-bold text-white transition-colors hover:bg-brand-red-deep"
              >
                {config.ctaTexto || "Ver mi precio"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
