"use client";

import { useEffect, useState } from "react";
import { IconByName } from "./icons";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Invitación a activar avisos push (Web Push estándar) para las llamadas:
// se oculta sola si el navegador no lo soporta, si el sitio no tiene claves
// VAPID configuradas, si el permiso ya está denegado, o si ya hay una
// suscripción activa en este dispositivo.
export function PushOptIn() {
  const [status, setStatus] = useState<"checking" | "hidden" | "offer" | "activating" | "active" | "error">("checking");

  useEffect(() => {
    (async () => {
      if (!VAPID_PUBLIC_KEY || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("hidden"); return;
      }
      if (Notification.permission === "denied") { setStatus("hidden"); return; }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        setStatus(existing ? "active" : "offer");
      } catch {
        setStatus("hidden");
      }
    })();
  }, []);

  async function activate() {
    if (!VAPID_PUBLIC_KEY) return;
    setStatus("activating");
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("offer"); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      await fetch("/api/client/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setStatus("active");
    } catch {
      setStatus("error");
    }
  }

  if (status !== "offer" && status !== "activating" && status !== "error") return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-card border border-hair bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
          <IconByName name="doc" width={16} height={16} />
        </span>
        <p className="text-[13px] leading-relaxed text-ink">
          Activa los avisos y te avisamos en este dispositivo cuando gestionemos tu llamada.
        </p>
      </div>
      <button
        type="button" onClick={activate} disabled={status === "activating"}
        className="shrink-0 rounded-card bg-navy px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
      >
        {status === "activating" ? "Activando…" : status === "error" ? "Reintentar" : "Activar avisos"}
      </button>
    </div>
  );
}
