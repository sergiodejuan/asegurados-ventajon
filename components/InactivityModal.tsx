"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Close, Spinner, Check } from "./icons";
import { TurnstileWidget } from "./TurnstileWidget";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { getAttribution } from "@/lib/attribution";
import { loadQuote } from "@/lib/quote";
import { matchesInactivityPage, type InactivityModalConfig } from "@/lib/inactivityModal";

// Modal de inactividad configurable (admin → Marketing → Modal de inactividad).
// Aparece cuando el usuario pasa `segundos` sin interacción (ratón, teclado,
// scroll, toque), en desktop y móvil, animado. Se monta una sola vez de forma
// global (app/layout.tsx) y decide por la ruta actual + config si debe operar.
const SESSION_KEY = "ventajon:inactModalShown";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "wheel", "touchstart"] as const;

function phoneOk(v: string) {
  return v.replace(/\D/g, "").length >= 9;
}

export function InactivityModal() {
  const pathname = usePathname();
  const [config, setConfig] = useState<InactivityModalConfig | null>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const shownRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Captura de teléfono.
  const [telefono, setTelefono] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

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

  // Nunca en el panel admin ni en el área de cliente (aunque la lista de
  // páginas esté vacía = todas).
  const enZonaExcluida = (pathname || "").startsWith("/admin") || (pathname || "").startsWith("/area-cliente");
  const activo = !!config?.activo && !enZonaExcluida && matchesInactivityPage(pathname || "/", config.paginas);

  // Detección de inactividad. Se re-evalúa al cambiar de ruta (activo depende
  // del pathname) para respetar la lista de páginas configurada.
  useEffect(() => {
    if (!activo || !config) return;
    try { shownRef.current = Number(sessionStorage.getItem(SESSION_KEY) || "0") || 0; } catch { /* sin sessionStorage */ }

    const delay = Math.max(3, config.segundos) * 1000;
    const arm = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (openRef.current) return;
      if (shownRef.current >= config.maxPorSesion) return;
      timerRef.current = setTimeout(() => {
        // No apilar sobre otro modal abierto (gate de la comparativa,
        // coberturas, igualación de precio…): reintenta más tarde.
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) { arm(); return; }
        openRef.current = true;
        setOpen(true);
        shownRef.current += 1;
        try { sessionStorage.setItem(SESSION_KEY, String(shownRef.current)); } catch { /* noop */ }
        pushDataLayerEvent("inactivity_modal_shown", { placement: pathname || "" });
      }, delay);
    };
    const onActivity = () => { if (!openRef.current) arm(); };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    arm();
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activo, config, pathname]);

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
    setErr(null);
    if (config && shownRef.current < config.maxPorSesion) {
      timerRef.current = setTimeout(() => {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        openRef.current = true;
        setOpen(true);
        shownRef.current += 1;
        try { sessionStorage.setItem(SESSION_KEY, String(shownRef.current)); } catch { /* noop */ }
      }, Math.max(3, config.segundos) * 1000);
    }
  }

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!phoneOk(telefono)) { setErr("Escribe un teléfono válido."); return; }
    setSubmitting(true);
    try {
      // Reutilizamos los datos del tarificador si existen (comparativa
      // post-gate); si no (landings), el propio envío del teléfono cuenta como
      // consentimiento, con el aviso legal visible debajo.
      const q = loadQuote();
      const now = new Date().toISOString();
      const hasConsent = !!(q?.consentAt?.privacidadAt && q?.consentAt?.contactoAt);
      const cp = /^\d{5}$/.test(q?.codigoPostal ?? "") ? q!.codigoPostal! : "";
      const res = await fetch("/api/call-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: q?.nombre ?? "",
          telefono,
          codigoPostal: cp,
          producto: q?.producto ?? "salud",
          aceptaPrivacidad: true,
          autorizaContacto: true,
          aceptaComercial: !!q?.consentAt?.comercialAt,
          company: "",
          consent: hasConsent ? q?.consentAt : { privacidadAt: now, contactoAt: now },
          origen: "web",
          utm: getAttribution(),
          turnstileToken,
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && body?.ok) {
        setSent(true);
        pushDataLayerEvent("generate_lead", { producto: q?.producto ?? "salud", form: "inactivity_modal" });
        return;
      }
      setErr(body?.error ?? "No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
    } catch {
      setErr("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
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
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

          <div className="relative">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white">
                  <Check width={28} height={28} />
                </div>
                <h3 className="mt-3 text-[22px] font-extrabold leading-tight text-white">¡Gracias!</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/85">
                  Un asesor te llamará gratis lo antes posible{telefono ? <> al <span className="font-semibold tnums">{telefono}</span></> : ""}.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 flex w-full items-center justify-center rounded-pill bg-white px-5 py-3.5 text-[15px] font-bold text-navy transition-colors hover:bg-white/90"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <>
                {config.titulo && <h3 className="text-[26px] font-extrabold leading-tight text-white">{config.titulo}</h3>}
                {config.eyebrow && <p className="mt-3 text-[12px] font-bold uppercase tracking-wide text-white/70">{config.eyebrow}</p>}
                {config.precioTexto && <p className="mt-0.5 text-[28px] font-extrabold leading-tight text-white">{config.precioTexto}</p>}
                {config.descripcion && <p className="mt-3 text-[15px] leading-relaxed text-white/85">{config.descripcion}</p>}

                {config.capturaTelefono ? (
                  <form onSubmit={submitPhone} className="mt-5">
                    <div className="flex items-stretch gap-1.5 rounded-pill bg-white p-1 shadow-sm">
                      <input
                        type="tel" inputMode="tel" autoComplete="tel" name="tel"
                        value={telefono} onChange={(e) => setTelefono(e.target.value)}
                        placeholder="Tu teléfono" aria-label="Tu teléfono"
                        className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-ink placeholder:text-slate2/60 focus:outline-none"
                      />
                      <button
                        type="submit" disabled={submitting}
                        className="flex shrink-0 items-center justify-center gap-1.5 rounded-pill bg-brand-red px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-brand-red-deep disabled:bg-brand-red/60"
                      >
                        {submitting && <Spinner width={14} height={14} />}
                        {config.ctaTexto || "Que me llamen gratis"}
                      </button>
                    </div>
                    {err && <p role="alert" className="mt-1.5 px-1 text-[12px] font-medium text-white">{err}</p>}
                    <p className="mt-2 text-[11px] leading-snug text-white/60">
                      Al enviar autorizas que te contactemos. Consulta la{" "}
                      <a href="/legal" className="underline hover:text-white/90">política de privacidad</a>.
                    </p>
                    <TurnstileWidget onToken={setTurnstileToken} />
                  </form>
                ) : config.ctaHref ? (
                  <a
                    href={config.ctaHref}
                    onClick={() => pushDataLayerEvent("inactivity_modal_cta", { placement: pathname || "" })}
                    className="mt-5 flex w-full items-center justify-center rounded-pill bg-brand-red px-5 py-4 text-[16px] font-bold text-white transition-colors hover:bg-brand-red-deep"
                  >
                    {config.ctaTexto || "Ver mi precio"}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => { pushDataLayerEvent("inactivity_modal_cta", { placement: pathname || "" }); close(); }}
                    className="mt-5 flex w-full items-center justify-center rounded-pill bg-brand-red px-5 py-4 text-[16px] font-bold text-white transition-colors hover:bg-brand-red-deep"
                  >
                    {config.ctaTexto || "Ver mi precio"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
