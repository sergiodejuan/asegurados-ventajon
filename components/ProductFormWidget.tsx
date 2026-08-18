"use client";

import { useEffect, useRef, useState } from "react";

// Wrapper del widget AvantProductForm de Codeoscopic. Carga el script
// asíncrono desde product-form.avant.codeoscopic.io una sola vez por
// pestaña, cachea la Promise para no reintentar en cada montaje y expone
// el componente <ProductFormWidget> con la API mínima que necesitamos:
//   <ProductFormWidget insuranceId="…" quoteId="…" onFinished={…} />
//
// Toda petición de datos del widget se enruta a nuestro proxy
// /api/product-form (que a su vez habla con Codeoscopic con las
// credenciales server-side). Nunca damos al widget acceso directo.

// La librería declara `AvantProductForm` global — declaramos un tipo
// mínimo para consumirla sin `any`.
declare global {
  interface Window {
    AvantProductForm?: {
      mount(el: HTMLElement, opts: {
        insuranceId: string;
        quoteId: string;
        // Callback que el widget llama para cada petición de datos: pasamos
        // el body al proxy y devolvemos la respuesta.
        request: (payload: unknown) => Promise<unknown>;
        onFinished?: (result: unknown) => void;
        onError?: (err: unknown) => void;
      }): { destroy(): void };
    };
  }
}

const SCRIPT_URL = "https://product-form.avant.codeoscopic.io/loader.js";
let loaderPromise: Promise<void> | null = null;

function loadWidgetScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.AvantProductForm) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    if (existing) { existing.addEventListener("load", () => resolve()); existing.addEventListener("error", () => reject(new Error("script_error"))); return; }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loaderPromise = null; reject(new Error("script_error")); };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

async function requestViaProxy(payload: unknown): Promise<unknown> {
  const res = await fetch("/api/product-form", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // Devolvemos un objeto explícito para que el widget pueda mostrar un
    // mensaje coherente (en vez de un throw crudo que puede romperlo).
    return { ok: false, status: res.status };
  }
  return res.json();
}

export type ProductFormWidgetProps = {
  insuranceId: string;
  quoteId: string;
  onFinished?: (result: unknown) => void;
  className?: string;
};

export function ProductFormWidget({ insuranceId, quoteId, onFinished, className }: ProductFormWidgetProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let disposed = false;
    let instance: { destroy(): void } | null = null;

    (async () => {
      try {
        await loadWidgetScript();
        if (disposed || !hostRef.current || !window.AvantProductForm) return;
        instance = window.AvantProductForm.mount(hostRef.current, {
          insuranceId,
          quoteId,
          request: requestViaProxy,
          onFinished: (result) => { if (!disposed) onFinished?.(result); },
          onError: (err) => { console.error("[product-form]", err); if (!disposed) setState("error"); },
        });
        if (!disposed) setState("ready");
      } catch (err) {
        console.error("[product-form] loader:", err);
        if (!disposed) setState("error");
      }
    })();

    return () => {
      disposed = true;
      try { instance?.destroy(); } catch { /* noop */ }
    };
  }, [insuranceId, quoteId, onFinished]);

  return (
    <div className={className}>
      {state === "loading" && <p className="py-6 text-center text-[13px] text-slate2">Cargando configurador…</p>}
      {state === "error" && (
        <p role="alert" className="py-6 text-center text-[13px] font-medium text-brand-red">
          No hemos podido cargar el configurador. Revisa la conexión o inténtalo de nuevo.
        </p>
      )}
      <div ref={hostRef} className={state === "ready" ? "" : "hidden"} />
    </div>
  );
}
