import { SOURCE_LABELS } from "./crm";
import { sendEmail } from "./email";
import { getTeamNotificationsConfig } from "./store";
import { shouldNotify } from "./teamNotifications";
import { sendPushToTeam } from "./webPush";

// Un solo helper para avisar al equipo cuando entra un lead. Se dispara al
// final de cada endpoint de lead — nunca antes de guardar en KV para no
// avisar de algo que luego no se persistió. Fallar aquí NO debe romper la
// respuesta al usuario: cada canal captura su propio error y sigue.

export type NewLeadNotification = {
  leadId: string;
  source: string;
  nombre: string;
  telefono?: string;
  email?: string;
  producto?: string;
  codigoPostal?: string;
  precioAprox?: number | null;
  aceptaComercial?: boolean;
  extraNote?: string;
};

function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

function subjectFor(n: NewLeadNotification): string {
  const label = SOURCE_LABELS[n.source] ?? n.source;
  const producto = n.producto ? ` · ${n.producto}` : "";
  return `[Lead nuevo] ${n.nombre}${producto} · ${label}`;
}

function htmlBody(n: NewLeadNotification): string {
  const rows: [string, string][] = [];
  rows.push(["Origen", SOURCE_LABELS[n.source] ?? n.source]);
  if (n.producto) rows.push(["Producto", n.producto]);
  if (n.telefono) rows.push(["Teléfono", n.telefono]);
  if (n.email) rows.push(["Email", n.email]);
  if (n.codigoPostal) rows.push(["CP", n.codigoPostal]);
  if (n.precioAprox != null) rows.push(["Precio orientativo", `${n.precioAprox.toFixed(2)} €/mes`]);
  if (n.extraNote) rows.push(["Nota", n.extraNote]);
  rows.push(["Comercial", n.aceptaComercial ? "Sí" : "No"]);

  const tableRows = rows.map(([k, v]) => `<tr><td style="padding:6px 12px;color:#64748b;font-size:12px;">${k}</td><td style="padding:6px 12px;font-weight:600;color:#0b1a3a;">${escape(v)}</td></tr>`).join("");
  const url = siteUrl();
  const cta = url ? `<p style="margin:20px 0 0"><a href="${url}/admin?lead=${encodeURIComponent(n.leadId)}" style="display:inline-block;background:#0b1a3a;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Abrir ficha en el panel</a></p>` : "";

  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;">
      <h2 style="color:#0b1a3a;font-size:18px;margin:0 0 12px">${escape(n.nombre)}</h2>
      <table style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">${tableRows}</table>
      ${cta}
    </div>
  `;
}

function escape(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}

export async function notifyTeamNewLead(n: NewLeadNotification): Promise<void> {
  const cfg = await getTeamNotificationsConfig().catch(() => null);
  if (!cfg) return;

  const ctx = { source: n.source, aceptaComercial: n.aceptaComercial };

  // Email — un envío por destinatario para que cada persona pueda gestionar
  // el correo con sus propias reglas de bandeja/silencio.
  if (shouldNotify(cfg.email, ctx) && cfg.email.recipients.length) {
    const subject = subjectFor(n);
    const html = htmlBody(n);
    await Promise.all(cfg.email.recipients.map(async (to) => {
      try { await sendEmail({ to, subject, html }); }
      catch (err) { console.error("[notifyTeam] email error", err); }
    }));
  }

  // Push a todos los agentes con avisos activados. La navegación abre la
  // ficha en el panel (el propio SW decide qué hacer con la URL).
  if (shouldNotify(cfg.push, ctx)) {
    const label = SOURCE_LABELS[n.source] ?? n.source;
    try {
      await sendPushToTeam({
        title: `Lead nuevo · ${label}`,
        body: `${n.nombre}${n.producto ? ` · ${n.producto}` : ""}${n.codigoPostal ? ` · CP ${n.codigoPostal}` : ""}`,
        url: `/admin?lead=${encodeURIComponent(n.leadId)}`,
      });
    } catch (err) {
      console.error("[notifyTeam] push error", err);
    }
  }
}
