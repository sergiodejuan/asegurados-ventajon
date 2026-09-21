"use client";

import { useEffect, useState } from "react";
import { IconByName, Close } from "./icons";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { withUtmParams } from "@/lib/attribution";
import { safeHref } from "@/lib/safeHref";
import { useSiteTheme } from "@/lib/useTheme";

// Widget flotante de captación para el seguro de auto en la home (solo
// escritorio: en móvil ya hay bastante reclamo con el hero, la rejilla de
// productos y la barra de CTA fija). Activable/desactivable, con retraso,
// textos, icono y CTA editables desde /admin/diseno (ver lib/theme.ts
// AutoWidgetConfig). Aparece con un pequeño retraso, se puede cerrar, y su
// CTA lleva utm propio para poder medir en el dashboard de UTM cuánto
// convierte este widget frente al resto de puntos de entrada. Comparte la
// misma variable CSS --assistant-bottom que usa el botón del asistente (ver
// lib/useStickyDesktopBar.ts): así sube junto con ellos y no queda tapado
// por la barra roja sticky de escritorio al desplegarse.
export function AutoWidget() {
  const { autoWidget: config } = useSiteTheme();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!config.enabled) return;
    const t = setTimeout(() => setVisible(true), Math.max(0, config.delaySeconds) * 1000);
    return () => clearTimeout(t);
  }, [config.enabled, config.delaySeconds]);

  if (!config.enabled || !visible || dismissed) return null;

  const ctaHref = withUtmParams(safeHref(config.ctaHref, "/tarificador-auto"), {
    source: "web", medium: "widget", campaign: "auto-widget-home",
  });

  return (
    <div
      role="complementary"
      aria-label="Seguro de coche"
      className="fixed bottom-6 right-6 z-40 hidden w-[280px] overflow-hidden rounded-[20px] bg-gradient-to-br from-brand-red to-brand-red-deep p-5 shadow-card motion-safe:animate-fade-up lg:block lg:bottom-[var(--assistant-bottom,1.5rem)]"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Cerrar"
        className="absolute right-3 top-3 text-white/70 transition-colors hover:text-white"
      >
        <Close width={14} height={14} />
      </button>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white">
        <IconByName name={config.icon || "car"} width={26} height={26} />
      </span>
      <p className="mt-3 text-[16px] font-bold leading-snug text-white">
        {config.title}
      </p>
      <a
        href={ctaHref}
        onClick={() => pushDataLayerEvent("select_promotion", { promotion_name: "auto-widget-home", placement: "home_widget" })}
        className="mt-4 inline-flex items-center justify-center rounded-card bg-white px-4 py-2.5 text-[14px] font-bold text-brand-red-deep transition-transform hover:scale-[1.02]"
      >
        {config.ctaLabel}
      </a>
    </div>
  );
}
