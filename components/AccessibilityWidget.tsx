"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSiteTheme } from "@/lib/useTheme";
import {
  DEFAULT_A11Y_PREFS, FONT_SCALE_STEPS, loadA11yPrefs, saveA11yPrefs, applyA11yPrefs,
  type AccessibilityPrefs, type FontScale,
} from "@/lib/accessibility";
import { Eye, Close, Minus, Plus, Check } from "./icons";

// Widget flotante de accesibilidad visual: tamaño de texto, alto contraste,
// subrayado de enlaces, fuente de lectura fácil, cursor grande y más
// espaciado entre líneas. Posición: centrado verticalmente a la izquierda,
// tanto en escritorio como en móvil — es la única zona de la pantalla libre
// de elementos fijos en ambos formatos (la cabecera vive arriba, el CTA
// fijo y el resto de burbujas —asistente, WhatsApp— viven abajo, y en
// escritorio la burbuja del asistente también está abajo a la izquierda,
// no a media altura). El panel se abre como hoja inferior en móvil (más
// cómodo con el pulgar) y como tarjeta junto al botón en escritorio.
export function AccessibilityWidget() {
  const pathname = usePathname();
  const theme = useSiteTheme();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_A11Y_PREFS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = loadA11yPrefs();
    setPrefs(stored);
    applyA11yPrefs(stored);
    setMounted(true);
  }, []);

  function update(patch: Partial<AccessibilityPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveA11yPrefs(next);
  }

  function reset() {
    setPrefs(DEFAULT_A11Y_PREFS);
    saveA11yPrefs(DEFAULT_A11Y_PREFS);
  }

  if (pathname?.startsWith("/admin")) return null;
  if (!theme.accessibilityWidget.enabled) return null;
  if (!mounted) return null;

  const activeCount = [
    prefs.fontScale !== 100, prefs.highContrast, prefs.underlineLinks,
    prefs.readableFont, prefs.bigCursor, prefs.extraSpacing,
  ].filter(Boolean).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Opciones de accesibilidad"
        aria-expanded={open}
        className="fixed left-3 top-1/2 z-40 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-navy text-white shadow-card transition-transform hover:scale-105"
      >
        <Eye width={22} height={22} />
        {activeCount > 0 && (
          <span aria-hidden="true" className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-red text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Opciones de accesibilidad"
          className="safe-bottom fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-card lg:inset-x-auto lg:bottom-auto lg:left-20 lg:top-1/2 lg:w-[340px] lg:-translate-y-1/2 lg:rounded-[20px] lg:border lg:border-hair"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-navy">Accesibilidad</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full text-slate2 hover:bg-mist">
              <Close width={18} height={18} />
            </button>
          </div>

          <p className="mt-1 text-[12px] leading-relaxed text-slate2">
            Ajustes pensados para facilitar la lectura. Se guardan en este navegador.
          </p>

          <div className="mt-4">
            <p className="text-[13px] font-semibold text-ink">Tamaño del texto</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => update({ fontScale: stepScale(prefs.fontScale, -1) })}
                disabled={prefs.fontScale === FONT_SCALE_STEPS[0]}
                aria-label="Reducir tamaño de texto"
                className="grid h-10 w-10 place-items-center rounded-full border border-hair text-navy transition-colors hover:bg-mist disabled:opacity-40"
              >
                <Minus width={16} height={16} />
              </button>
              <span className="w-14 text-center text-[14px] font-bold tnums text-navy">{prefs.fontScale}%</span>
              <button
                type="button"
                onClick={() => update({ fontScale: stepScale(prefs.fontScale, 1) })}
                disabled={prefs.fontScale === FONT_SCALE_STEPS[FONT_SCALE_STEPS.length - 1]}
                aria-label="Aumentar tamaño de texto"
                className="grid h-10 w-10 place-items-center rounded-full border border-hair text-navy transition-colors hover:bg-mist disabled:opacity-40"
              >
                <Plus width={16} height={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <ToggleRow label="Alto contraste" checked={prefs.highContrast} onChange={(v) => update({ highContrast: v })} />
            <ToggleRow label="Subrayar enlaces" checked={prefs.underlineLinks} onChange={(v) => update({ underlineLinks: v })} />
            <ToggleRow label="Fuente de lectura fácil" checked={prefs.readableFont} onChange={(v) => update({ readableFont: v })} />
            <ToggleRow label="Más espaciado entre líneas" checked={prefs.extraSpacing} onChange={(v) => update({ extraSpacing: v })} />
            <ToggleRow label="Cursor grande" checked={prefs.bigCursor} onChange={(v) => update({ bigCursor: v })} />
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-5 w-full rounded-card border border-hair px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:bg-mist"
          >
            Restablecer valores
          </button>
        </div>
      )}
    </>
  );
}

function stepScale(current: FontScale, dir: 1 | -1): FontScale {
  const idx = FONT_SCALE_STEPS.indexOf(current);
  const next = FONT_SCALE_STEPS[idx + dir];
  return next ?? current;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`flex items-center justify-between rounded-card border px-3.5 py-3 text-left text-[14px] font-medium transition-colors ${
        checked ? "border-navy bg-navy/5 text-navy" : "border-hair text-ink hover:bg-mist"
      }`}
    >
      {label}
      <span aria-hidden="true" className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? "border-navy bg-navy text-white" : "border-hair text-transparent"}`}>
        <Check width={12} height={12} />
      </span>
    </button>
  );
}
