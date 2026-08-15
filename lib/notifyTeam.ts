import { SOURCE_LABELS, type Lead } from "./crm";
import { BRAND_NAME } from "./brand";
import { sendEmail } from "./email";
import { getLead, getPresupuesto, getTeamNotificationsConfig, getTheme } from "./store";
import { shouldNotify } from "./teamNotifications";
import { sendPushToTeam } from "./webPush";

// Un solo helper para avisar al equipo cuando entra un lead a la web. Se
// dispara al final de cada endpoint de lead — nunca antes de guardar en KV
// para no avisar de algo que luego no se persistió. Fallar aquí NO debe
// romper la respuesta al usuario: cada canal captura su propio error y
// sigue. Todo el detalle (tarificación, UTM, botón a la ficha) se resuelve
// aquí leyendo la ficha real de KV, para que los llamantes solo tengan que
// pasar el leadId.

export type NewLeadNotification = {
  leadId: string;
  source: string;
  presupuestoId?: string;
  aceptaComercial?: boolean;
  extraNote?: string;
};

function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

const PRODUCTO_LABELS: Record<string, string> = {
  salud: "Salud", vida: "Vida", auto: "Auto", decesos: "Decesos", hogar: "Hogar",
};

function labelProducto(p: string): string {
  return PRODUCTO_LABELS[p] ?? (p ? p[0].toUpperCase() + p.slice(1) : "—");
}

function subjectFor(lead: Lead, source: string): string {
  const label = SOURCE_LABELS[source] ?? source;
  const nombre = lead.nombre || "(sin nombre)";
  const producto = lead.producto ? ` · ${labelProducto(lead.producto)}` : "";
  return `[Lead nuevo] ${nombre}${producto} · ${label}`;
}

function escape(v: string): string {
  return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}

function fmtBool(v: boolean | null | undefined): string {
  if (v === true) return "Sí"; if (v === false) return "No"; return "—";
}

function fmtEuros(v: number | null | undefined, periodo?: string): string {
  if (v == null || Number.isNaN(v)) return "—";
  const p = periodo ? ` /${periodo}` : "";
  return `${v.toFixed(2).replace(/\.00$/, "")} €${p}`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// Devuelve las filas específicas del producto: solo se muestran los datos
// realmente rellenos para no ensuciar el correo con campos vacíos de otros
// productos que este envío no usa.
function productRows(lead: Lead): [string, string][] {
  const rows: [string, string][] = [];
  const push = (k: string, v: string | number | null | undefined) => {
    if (v == null || v === "" || v === "—") return;
    rows.push([k, String(v)]);
  };

  switch (lead.producto) {
    case "salud":
      push("Nº asegurados", lead.numAsegurados);
      push("Cobertura dental", lead.coberturaDental != null ? fmtBool(lead.coberturaDental) : undefined);
      push("Inicio previsto", lead.inicio);
      push("Fecha nacimiento", lead.fechaNacimiento);
      { const a = ageFromDob(lead.fechaNacimiento); if (a != null) push("Edad", `${a} años`); }
      push("Sexo", lead.sexo);
      push("Fumador", lead.fumador != null ? fmtBool(lead.fumador) : undefined);
      if (lead.aseguradosAdicionales?.length) {
        const desc = lead.aseguradosAdicionales
          .map((a, i) => `#${i + 2}: ${a.fechaNacimiento || "—"} (${a.sexo || "—"})`).join(" · ");
        push("Otros asegurados", desc);
      }
      break;
    case "vida":
      push("Motivo", lead.motivo);
      push("Fecha nacimiento", lead.fechaNacimiento);
      { const a = ageFromDob(lead.fechaNacimiento); if (a != null) push("Edad", `${a} años`); }
      push("Sexo", lead.sexo);
      push("Fumador", lead.fumador != null ? fmtBool(lead.fumador) : undefined);
      break;
    case "auto":
      push("Tipo vehículo", lead.tipoVehiculo);
      push("Matrícula", lead.matricula);
      push("Marca / modelo", [lead.marcaVehiculo, lead.modeloVehiculo].filter(Boolean).join(" ") || undefined);
      push("Año", lead.anioVehiculo);
      push("Uso", lead.usoVehiculo);
      push("Antigüedad carnet", lead.antiguedadCarnet);
      push("Cobertura deseada", lead.coberturaDeseada);
      { const a = ageFromDob(lead.fechaNacimiento); if (a != null) push("Edad conductor", `${a} años`); }
      push("Sexo conductor", lead.sexo);
      break;
    case "decesos":
      push("Para quién", lead.paraQuien);
      push("Nº asegurados", lead.numAsegurados);
      { const a = ageFromDob(lead.fechaNacimiento); if (a != null) push("Edad", `${a} años`); }
      push("Sexo", lead.sexo);
      break;
    default: break;
  }

  if (lead.yaTieneSeguro) {
    push("Ya tiene seguro", `Sí · ${fmtEuros(lead.seguroActualImporte, lead.seguroActualPeriodo)}`);
    if (lead.seguroActualServicios?.length) push("Cobertura actual", lead.seguroActualServicios.join(", "));
  }

  if (lead.diaLlamada) push("Día llamada", lead.diaLlamada);
  if (lead.turnoLlamada) push("Turno llamada", lead.turnoLlamada);

  return rows;
}

// UTM: solo mostrar entradas con valor y, dentro de esas, las estándar
// primero para que el correo se lea siempre igual sin importar el orden en
// que las guardó el navegador.
const UTM_ORDER = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];
function utmRows(lead: Lead): [string, string][] {
  const utm = lead.utm ?? {};
  const rows: [string, string][] = [];
  for (const k of UTM_ORDER) {
    const v = utm[k];
    if (v) rows.push([k, String(v)]);
  }
  for (const [k, v] of Object.entries(utm)) {
    if (!v || UTM_ORDER.includes(k)) continue;
    rows.push([k, String(v)]);
  }
  return rows;
}

type EmailInputs = {
  lead: Lead;
  source: string;
  presupuestoId: string;
  precioAprox: number | null;
  logoUrl: string;
  extraNote?: string;
};

function renderTable(rows: [string, string][]): string {
  return rows.map(([k, v]) => `
    <tr>
      <td style="padding:8px 14px;color:#64748b;font-size:12px;vertical-align:top;white-space:nowrap;border-bottom:1px solid #eef2f7;">${escape(k)}</td>
      <td style="padding:8px 14px;color:#0b1a3a;font-size:13px;font-weight:600;vertical-align:top;border-bottom:1px solid #eef2f7;word-break:break-word;">${escape(v)}</td>
    </tr>`).join("");
}

function renderHtml({ lead, source, presupuestoId, precioAprox, logoUrl, extraNote }: EmailInputs): string {
  const base = siteUrl();
  const leadUrl = base ? `${base}/admin?lead=${encodeURIComponent(lead.id)}` : "";
  const presupUrl = base && presupuestoId ? `${base}/admin/presupuestos?id=${encodeURIComponent(presupuestoId)}` : "";
  const sourceLabel = SOURCE_LABELS[source] ?? source;

  const contactoRows: [string, string][] = [];
  if (lead.telefono) contactoRows.push(["Teléfono", lead.telefono]);
  if (lead.email) contactoRows.push(["Email", lead.email]);
  if (lead.codigoPostal) contactoRows.push(["Código postal", lead.codigoPostal]);
  if (lead.documento) contactoRows.push([lead.documentoTipo?.toUpperCase() || "Documento", lead.documento]);

  const originRows: [string, string][] = [];
  originRows.push(["Origen", sourceLabel]);
  originRows.push(["Producto", labelProducto(lead.producto)]);
  originRows.push(["Fecha", fmtDate(lead.createdAt)]);
  originRows.push(["ID lead", lead.id]);
  if (presupuestoId) originRows.push(["ID presupuesto", presupuestoId]);
  if (precioAprox != null) originRows.push(["Precio orientativo", fmtEuros(precioAprox, "mes")]);
  originRows.push(["Comunicaciones comerciales", fmtBool(lead.aceptaComercial)]);
  if (extraNote) originRows.push(["Nota", extraNote]);

  const productoRows = productRows(lead);
  const utm = utmRows(lead);

  const pm = lead.priceMatch;
  const priceMatchBlock = pm ? `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:20px;border:1px solid #fecaca;border-radius:12px;overflow:hidden;background:#fff5f5;">
      <tr><td style="padding:12px 14px;background:#dc2626;color:#fff;font-size:13px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;">Igualación de precio</td></tr>
      ${renderTable([
        ["Compañía actual", pm.companiaActual || "—"],
        ["Precio actual", fmtEuros(pm.precioActual, pm.periodicidad)],
        ...(pm.comentario ? [["Comentario", pm.comentario] as [string, string]] : []),
        ...(pm.capturaUrl ? [["Captura", pm.capturaUrl.startsWith("data:") ? "Enviada por el usuario (adjunta en la ficha)" : pm.capturaUrl] as [string, string]] : []),
      ])}
    </table>` : "";

  const buttonBase = "display:inline-block;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;line-height:1;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;";
  const primaryBtn = leadUrl ? `<a href="${leadUrl}" style="${buttonBase}background:#0b1a3a;color:#ffffff;">Abrir ficha del lead →</a>` : "";
  const secondaryBtn = presupUrl ? `<a href="${presupUrl}" style="${buttonBase}background:#ffffff;color:#0b1a3a;border:1.5px solid #0b1a3a;margin-left:10px;">Ver presupuesto</a>` : "";

  return `
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lead nuevo</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0b1a3a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 20px rgba(11,26,58,0.08);">
        <!-- Header -->
        <tr><td style="background:#0b1a3a;padding:22px 28px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;">
                ${logoUrl
                  ? `<img src="${escape(logoUrl)}" alt="${escape(BRAND_NAME)}" height="34" style="display:block;height:34px;max-height:34px;">`
                  : `<span style="color:#ffffff;font-weight:800;font-size:18px;letter-spacing:-.01em;">${escape(BRAND_NAME)}</span>`}
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.14);color:#ffffff;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">Lead nuevo</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Hero -->
        <tr><td style="padding:26px 28px 6px 28px;">
          <p style="margin:0;color:#64748b;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">${escape(sourceLabel)}</p>
          <h1 style="margin:6px 0 0 0;font-size:22px;line-height:1.25;color:#0b1a3a;font-weight:800;">${escape(lead.nombre || "(sin nombre)")}</h1>
          <p style="margin:6px 0 0 0;color:#475569;font-size:14px;">${escape(labelProducto(lead.producto))} · ${escape(fmtDate(lead.createdAt))}</p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:20px 28px 6px 28px;">
          ${primaryBtn}${secondaryBtn}
        </td></tr>

        <!-- Bloques -->
        <tr><td style="padding:20px 28px 4px 28px;">
          ${contactoRows.length ? `
          <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #eef2f7;border-radius:12px;overflow:hidden;margin-bottom:16px;">
            <tr><td style="padding:10px 14px;background:#f8fafc;color:#0b1a3a;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Contacto</td></tr>
            ${renderTable(contactoRows)}
          </table>` : ""}

          ${productoRows.length ? `
          <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #eef2f7;border-radius:12px;overflow:hidden;margin-bottom:16px;">
            <tr><td style="padding:10px 14px;background:#f8fafc;color:#0b1a3a;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Tarificación</td></tr>
            ${renderTable(productoRows)}
          </table>` : ""}

          <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #eef2f7;border-radius:12px;overflow:hidden;margin-bottom:16px;">
            <tr><td style="padding:10px 14px;background:#f8fafc;color:#0b1a3a;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Origen</td></tr>
            ${renderTable(originRows)}
          </table>

          ${utm.length ? `
          <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #eef2f7;border-radius:12px;overflow:hidden;margin-bottom:16px;">
            <tr><td style="padding:10px 14px;background:#f8fafc;color:#0b1a3a;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Atribución (UTM)</td></tr>
            ${renderTable(utm)}
          </table>` : ""}

          ${priceMatchBlock}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:22px 28px 26px 28px;color:#94a3b8;font-size:11px;line-height:1.6;">
          Este correo lo genera automáticamente el CRM de ${escape(BRAND_NAME)} cuando entra un lead a la web.
          Puedes desactivar los avisos por email desde <a href="${base}/admin/configuracion/avisos" style="color:#0b1a3a;text-decoration:underline;">/admin/configuracion/avisos</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function notifyTeamNewLead(n: NewLeadNotification): Promise<void> {
  const cfg = await getTeamNotificationsConfig().catch(() => null);
  if (!cfg) return;

  const ctx = { source: n.source, aceptaComercial: n.aceptaComercial };
  if (!shouldNotify(cfg.email, ctx) && !shouldNotify(cfg.push, ctx)) return;

  // Carga completa desde KV: los llamantes solo tienen que pasar leadId +
  // source. Así el correo siempre lleva TODO lo que hay en la ficha aunque
  // el endpoint que originó el aviso solo conociera un subconjunto.
  const lead = await getLead(n.leadId).catch(() => null);
  if (!lead) return;

  const presupuestoId = n.presupuestoId ?? lead.submissions?.at(-1)?.id ?? "";
  const presupuesto = presupuestoId ? await getPresupuesto(presupuestoId).catch(() => null) : null;
  const precioAprox = presupuesto?.precioAprox ?? null;

  const theme = await getTheme().catch(() => null);
  // Preferimos el logo de correo/oscuro si está definido, si no el minimal.
  const logoUrl = theme?.logoUrl || theme?.minimalLogoUrl || "";

  const inputs: EmailInputs = { lead, source: n.source, presupuestoId, precioAprox, logoUrl, extraNote: n.extraNote };

  // Email — un envío por destinatario para que cada persona pueda gestionar
  // el correo con sus propias reglas de bandeja/silencio.
  if (shouldNotify(cfg.email, ctx) && cfg.email.recipients.length) {
    const subject = subjectFor(lead, n.source);
    const html = renderHtml(inputs);
    await Promise.all(cfg.email.recipients.map(async (to) => {
      try { await sendEmail({ to, subject, html }); }
      catch (err) { console.error("[notifyTeam] email error", err); }
    }));
  }

  // Push — mensaje mucho más corto (limite práctico de Web Push ≈ 4 KiB;
  // los navegadores además truncan cuerpos largos). Enlaza a la misma
  // ficha del lead que abre el correo.
  if (shouldNotify(cfg.push, ctx)) {
    const label = SOURCE_LABELS[n.source] ?? n.source;
    try {
      await sendPushToTeam({
        title: `Lead nuevo · ${label}`,
        body: `${lead.nombre || "(sin nombre)"}${lead.producto ? ` · ${labelProducto(lead.producto)}` : ""}${lead.codigoPostal ? ` · CP ${lead.codigoPostal}` : ""}${precioAprox != null ? ` · ~${precioAprox.toFixed(0)} €/mes` : ""}`,
        url: `/admin?lead=${encodeURIComponent(lead.id)}`,
      });
    } catch (err) {
      console.error("[notifyTeam] push error", err);
    }
  }
}
