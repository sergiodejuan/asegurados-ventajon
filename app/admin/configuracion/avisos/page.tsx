"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";
import { SaveBar } from "@/components/admin/SaveBar";
import { availableSourceOptions, type TeamNotificationsConfig, DEFAULT_TEAM_NOTIFICATIONS } from "@/lib/teamNotifications";

export default function AdminAvisosPage() {
  return (
    <AdminShell active="avisos">
      <AvisosAdmin />
    </AdminShell>
  );
}

type Status = { email: boolean; push: boolean };

function AvisosAdmin() {
  const { token } = useAdminToken();
  const [config, setConfig] = useState<TeamNotificationsConfig>(DEFAULT_TEAM_NOTIFICATIONS);
  const [recipientsText, setRecipientsText] = useState("");
  const [status, setStatus] = useState<Status>({ email: false, push: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushActive, setPushActive] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const sourceOptions = useMemo(() => availableSourceOptions(), []);

  const headers = useMemo(() => ({ "Content-Type": "application/json", "x-admin-token": token }), [token]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/notifications", { headers, cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo cargar la configuración.");
      setConfig({ ...DEFAULT_TEAM_NOTIFICATIONS, ...data.config });
      setRecipientsText((data.config?.email?.recipients ?? []).join("\n"));
      setStatus(data.status);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  // Estado local del navegador — el push está habilitado en ESTE dispositivo o no
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setPushActive(!!sub);
    }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const emails = recipientsText.split(/\s+|,|;/).map((s) => s.trim()).filter(Boolean);
      const body: Partial<TeamNotificationsConfig> = {
        email: { ...config.email, recipients: emails },
        push: config.push,
      };
      const res = await fetch("/api/admin/notifications", { method: "PUT", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo guardar.");
      setConfig({ ...DEFAULT_TEAM_NOTIFICATIONS, ...data.config });
      setRecipientsText((data.config?.email?.recipients ?? []).join("\n"));
      setStatus(data.status);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setSaving(false); }
  }

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
    return output;
  }

  async function activatePush() {
    setPushBusy(true); setError("");
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en las variables del sitio.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Debes permitir las notificaciones en el navegador.");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const raw = sub.toJSON();
      const res = await fetch("/api/admin/notifications/push-subscribe", {
        method: "POST", headers,
        body: JSON.stringify({ endpoint: raw.endpoint, keys: raw.keys }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo guardar la suscripción.");
      setPushActive(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setPushBusy(false); }
  }

  async function deactivatePush() {
    setPushBusy(true); setError("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/admin/notifications/push-subscribe", {
          method: "DELETE", headers, body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setPushActive(false);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setPushBusy(false); }
  }

  function toggleSource(kind: "email" | "push", value: string) {
    setConfig((c) => {
      const list = c[kind].sources;
      const next = list.includes(value) ? list.filter((s) => s !== value) : [...list, value];
      return { ...c, [kind]: { ...c[kind], sources: next } };
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold text-navy">Avisos al equipo</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Recibe un aviso por email o push cuando entre un lead a la web. Aplica a todos los formularios: tarificadores,
        exit-intent, guías, llamadas y solicitudes de igualación de precio.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <div className="mt-5 flex flex-col gap-5">
          {/* EMAIL */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-navy">Aviso por email</h2>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <span className="text-[12px] font-semibold text-slate2">{config.email.enabled ? "Activado" : "Desactivado"}</span>
                <input
                  type="checkbox" checked={config.email.enabled}
                  onChange={(e) => setConfig((c) => ({ ...c, email: { ...c.email, enabled: e.target.checked } }))}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-hair transition-colors checked:bg-navy relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
                />
              </label>
            </div>
            {!status.email && (
              <p className="mt-2 rounded-card bg-brand-red/5 px-3 py-2 text-[12px] font-semibold text-brand-red">
                Requiere configurar RESEND_API_KEY para poder enviar correos.
              </p>
            )}
            <label className="mt-3 block">
              <span className="mb-1 block text-[13px] font-semibold text-ink">Destinatarios</span>
              <textarea
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                rows={4} placeholder="comercial@asegurados-ventajon.com"
                className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[14px] font-mono"
              />
              <span className="mt-1 block text-[11px] text-slate2">Uno por línea. Hasta 20 direcciones.</span>
            </label>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-[13px]">
              <input type="checkbox" checked={config.email.soloConComercial}
                onChange={(e) => setConfig((c) => ({ ...c, email: { ...c.email, soloConComercial: e.target.checked } }))}
                className="h-4 w-4 rounded border-hair" />
              Solo avisar si el lead marcó la casilla de comunicaciones comerciales
            </label>
            <div className="mt-3">
              <p className="text-[12px] font-semibold text-slate2">Origins que disparan aviso (vacío = todos)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sourceOptions.map((opt) => {
                  const on = config.email.sources.includes(opt.value);
                  return (
                    <button key={opt.value} type="button" onClick={() => toggleSource("email", opt.value)}
                      className={`rounded-pill border px-3 py-1 text-[12px] font-semibold transition-colors ${on ? "border-navy bg-navy text-white" : "border-hair bg-white text-slate2 hover:border-navy/40"}`}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* PUSH */}
          <section className="rounded-[20px] border border-hair bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-navy">Aviso push en el navegador</h2>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <span className="text-[12px] font-semibold text-slate2">{config.push.enabled ? "Activado" : "Desactivado"}</span>
                <input
                  type="checkbox" checked={config.push.enabled}
                  onChange={(e) => setConfig((c) => ({ ...c, push: { ...c.push, enabled: e.target.checked } }))}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-hair transition-colors checked:bg-navy relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
                />
              </label>
            </div>
            {!status.push && (
              <p className="mt-2 rounded-card bg-brand-red/5 px-3 py-2 text-[12px] font-semibold text-brand-red">
                Requiere configurar VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY (más NEXT_PUBLIC_VAPID_PUBLIC_KEY en el sitio).
              </p>
            )}
            <p className="mt-2 text-[12px] leading-relaxed text-slate2">
              Cada agente debe activar los avisos en SU navegador desde este panel. Se puede activar en varios dispositivos.
            </p>
            <div className="mt-3 flex items-center gap-3">
              {!pushSupported ? (
                <span className="text-[12px] font-semibold text-slate2">Este navegador no soporta push.</span>
              ) : pushActive ? (
                <button type="button" onClick={deactivatePush} disabled={pushBusy}
                  className="rounded-card border border-hair px-4 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-mist disabled:opacity-50">
                  {pushBusy ? "Desactivando…" : "Desactivar en este dispositivo"}
                </button>
              ) : (
                <button type="button" onClick={activatePush} disabled={pushBusy || !status.push}
                  className="rounded-card bg-navy px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-50">
                  {pushBusy ? "Activando…" : "Activar en este dispositivo"}
                </button>
              )}
              {pushActive && <span className="text-[12px] font-semibold text-emerald-700">Activo en este navegador</span>}
            </div>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[13px]">
              <input type="checkbox" checked={config.push.soloConComercial}
                onChange={(e) => setConfig((c) => ({ ...c, push: { ...c.push, soloConComercial: e.target.checked } }))}
                className="h-4 w-4 rounded border-hair" />
              Solo avisar si el lead marcó la casilla de comunicaciones comerciales
            </label>
            <div className="mt-3">
              <p className="text-[12px] font-semibold text-slate2">Origins que disparan aviso (vacío = todos)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sourceOptions.map((opt) => {
                  const on = config.push.sources.includes(opt.value);
                  return (
                    <button key={opt.value} type="button" onClick={() => toggleSource("push", opt.value)}
                      className={`rounded-pill border px-3 py-1 text-[12px] font-semibold transition-colors ${on ? "border-navy bg-navy text-white" : "border-hair bg-white text-slate2 hover:border-navy/40"}`}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <p className="text-[11px] leading-relaxed text-slate2">
            Los avisos se envían siempre después de guardar el lead — si el envío falla, el lead ya está en el panel.
            La configuración se guarda cifrada en la base de datos KV; no se comparte con terceros.
          </p>
        </div>
      )}

      <SaveBar saving={saving} saved={saved} onSave={save} />
    </main>
  );
}
