import webpush from "web-push";
import { listPushSubscriptions, removePushSubscription } from "./store";

function vapidConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureConfigured() {
  if (configured || !vapidConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:soporte@asegurados-ventajon.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export function webPushConfigured(): boolean {
  return vapidConfigured();
}

// Envía un aviso push a todos los dispositivos donde el lead haya activado
// los avisos desde su área de cliente. Integración opcional (igual que
// Retell/Bland/Manychat): sin claves VAPID configuradas, o sin ninguna
// suscripción activa para ese lead, simplemente no hace nada.
export async function sendPushToLead(leadId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
  if (!vapidConfigured()) return;
  ensureConfigured();
  const subs = await listPushSubscriptions(leadId);
  if (!subs.length) return;
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload));
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) await removePushSubscription(leadId, sub.endpoint).catch(() => {});
      else console.error("[webPush] send error", err);
    }
  }));
}
