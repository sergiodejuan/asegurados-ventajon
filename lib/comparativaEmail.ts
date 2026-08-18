import crypto from "crypto";
import { emailConfigured, sendEmail, escapeHtml, tracked } from "./email";
import { listProducts, getTheme, addEmailLog } from "./store";
import { saludPrice, vidaPrice, autoPrice, decesosPrice, quoteNumber, buildWhatsAppText, whatsAppUrl, slugify } from "./quote";
import { BRAND_NAME, SITE_URL, CONTACT_HOURS } from "./brand";
import type { Product } from "./catalog";

// Correo de "aquí tienes tu comparativa" que se manda justo al completar
// cualquier tarificador (salud/vida/auto) — el mismo momento en el que hoy
// se sincroniza con ManyChat y se dispara la llamada automática, así que se
// engancha igual: no-op si no hay RESEND_API_KEY o no hay email (mismo
// patrón que el resto de integraciones opcionales del proyecto).
//
// Cada logo (de marca y de cada aseguradora) se sirve como una URL https real
// vía app/api/theme/logo y app/api/products/[id]/logo en vez del data: URI
// que se guarda en el admin: Gmail y otros clientes de correo bloquean las
// imágenes data: URI en HTML de email por seguridad.
//
// Cada enlace del correo (las dos acciones de cada aseguradora) pasa por
// app/api/email/click, que registra el clic en la ficha del lead antes de
// redirigir de verdad — y el correo lleva al final un píxel de 1x1 (ver
// app/api/email/pixel) para poder marcar "abierto". Ver EmailLog en
// lib/crm.ts y los tres estados (enviado/abierto/clic) que se muestran en
// el panel "Emails" de la ficha del lead en /admin.

type Producto = "salud" | "vida" | "auto" | "decesos";

type PriceInput = {
  numAsegurados?: number | null;
  coberturaDental?: boolean | null;
  fumador?: boolean | null;
  antiguedadCarnet?: string;
  coberturaDeseada?: string;
};

export type ComparativaEmailInput = PriceInput & {
  leadId: string;
  quoteId: string; // id de la tarificación (submissionId), para el nº de presupuesto
  producto: Producto;
  nombre: string;
  email: string;
  // true si además se ha mandado (o se va a mandar) el resumen por WhatsApp
  // vía el Flow de ManyChat — ver MANYCHAT_THANKYOU_FLOW_NS en lib/manychat.ts.
  // Controla si el correo menciona "también te lo hemos mandado por WhatsApp".
  whatsappSummarySent: boolean;
};

const PRODUCTO_LABELS: Record<Producto, string> = {
  salud: "seguro de salud", vida: "seguro de vida", auto: "seguro de auto", decesos: "seguro de decesos",
};

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalized(input: PriceInput) {
  return {
    numAsegurados: input.numAsegurados ?? undefined,
    coberturaDental: input.coberturaDental ?? undefined,
    fumador: input.fumador ?? undefined,
    antiguedadCarnet: input.antiguedadCarnet,
    coberturaDeseada: input.coberturaDeseada,
  };
}

function priceRows(producto: Producto, p: Product, rawInput: PriceInput): { label: string; value: string }[] {
  const input = normalized(rawInput);
  if (producto === "salud") {
    const price = saludPrice({ conCopago: p.precioConCopago ?? 0, sinCopago: p.precioSinCopago ?? 0 }, input);
    return [
      { label: "Con copago", value: `${euros(price.conCopago)} €/mes` },
      { label: "Sin copago", value: `${euros(price.sinCopago)} €/mes` },
    ];
  }
  if (producto === "auto") {
    return [{ label: "Desde", value: `${euros(autoPrice({ precio: p.precio ?? 0 }, input).precio)} €/mes` }];
  }
  if (producto === "decesos") {
    return [{ label: "Desde", value: `${euros(decesosPrice({ precio: p.precio ?? 0 }, input).precio)} €/mes` }];
  }
  return [{ label: "Desde", value: `${euros(vidaPrice({ precio: p.precio ?? 0 }, input).precio)} €/mes` }];
}

function headlinePrice(producto: Producto, p: Product, rawInput: PriceInput): number {
  const input = normalized(rawInput);
  if (producto === "salud") return saludPrice({ conCopago: p.precioConCopago ?? 0, sinCopago: p.precioSinCopago ?? 0 }, input).conCopago;
  if (producto === "auto") return autoPrice({ precio: p.precio ?? 0 }, input).precio;
  if (producto === "decesos") return decesosPrice({ precio: p.precio ?? 0 }, input).precio;
  return vidaPrice({ precio: p.precio ?? 0 }, input).precio;
}

function companyBlock(producto: Producto, p: Product, input: PriceInput, leadId: string, logId: string): string {
  const logoHtml = p.logoUrl
    ? `<img src="${SITE_URL}/api/products/${p.id}/logo" alt="${escapeHtml(p.compania)}" height="28" style="height:28px;width:auto;max-width:130px;display:block;border:0" />`
    : `<span style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#1c2333">${escapeHtml(p.compania)}</span>`;

  const priceRowsHtml = priceRows(producto, p, input).map((r) => `
    <tr>
      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a6473;padding:2px 0">${r.label}</td>
      <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;color:#1b2b6b;padding:2px 0">${r.value}</td>
    </tr>`).join("");

  const callHref = tracked(leadId, logId, `/quiero-que-me-llamen?producto=${producto}&compania=${encodeURIComponent(p.compania)}&precio=${Math.round(headlinePrice(producto, p, input))}`);
  const infoHref = tracked(leadId, logId, `/comparativa/${slugify(p.compania)}?producto=${producto}`);

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e8f0;border-radius:16px;margin-bottom:12px">
    <tr><td style="padding:16px 18px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>${logoHtml}</td>
        ${p.destacado ? `<td align="right"><span style="font-family:Arial,Helvetica,sans-serif;display:inline-block;background:#fdeceb;color:#c8312a;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:999px">Recomendado</span></td>` : "<td></td>"}
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${priceRowsHtml}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
        <td width="50%" style="padding-right:6px">
          <a href="${infoHref}" style="font-family:Arial,Helvetica,sans-serif;display:block;text-align:center;border:1px solid #e4e8f0;border-radius:10px;padding:10px 8px;font-size:13px;font-weight:700;color:#1b2b6b;text-decoration:none">Más información</a>
        </td>
        <td width="50%" style="padding-left:6px">
          <a href="${callHref}" style="font-family:Arial,Helvetica,sans-serif;display:block;text-align:center;background:#c8312a;border-radius:10px;padding:10px 8px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none">Solicitar llamada</a>
        </td>
      </tr></table>
    </td></tr>
  </table>`;
}

// HTML del correo separado del envío (sendComparativaSummaryEmail más abajo)
// para poder generarlo/inspeccionarlo sin depender de tener RESEND_API_KEY
// configurado — usado también al verificar este cambio.
export async function buildComparativaEmailHtml(
  input: ComparativaEmailInput,
  logId: string
): Promise<{ subject: string; html: string } | null> {
  const products = (await listProducts(input.producto, true)).slice(0, 5);
  if (!products.length) return null;

  const theme = await getTheme();
  const primerNombre = input.nombre.trim().split(/\s+/)[0] || "";
  const productoLabel = PRODUCTO_LABELS[input.producto];
  const numero = quoteNumber(input.quoteId);

  const headerLogo = theme.logoUrl
    ? `<img src="${SITE_URL}/api/theme/logo" alt="${escapeHtml(BRAND_NAME)}" height="32" style="height:32px;width:auto;display:block;border:0" />`
    : `<span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:800;color:#1b2b6b">Asegurados <span style="color:#c8312a">Ventajon</span></span>`;

  const companyRows = products.map((p) => companyBlock(input.producto, p, input, input.leadId, logId)).join("");

  const waHref = whatsAppUrl(buildWhatsAppText({ producto: input.producto, origen: "email" }));

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(BRAND_NAME)}</title></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:20px;overflow:hidden">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #e4e8f0">${headerLogo}</td></tr>
        <tr><td style="padding:28px 32px 8px">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:#1b2b6b;line-height:1.3">
            ${primerNombre ? `${escapeHtml(primerNombre)}, aquí tienes tu comparativa` : "Aquí tienes tu comparativa"}
          </p>
          <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#5a6473">Presupuesto nº ${numero}</p>
          <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#5a6473">
            Así de orientativo se mueve el precio de tu ${productoLabel} entre las compañías con las que trabajamos.
            Un asesor de ${escapeHtml(BRAND_NAME)} te llama para confirmar tu propuesta final, sin compromiso.
          </p>
        </td></tr>
        ${input.whatsappSummarySent ? `
        <tr><td style="padding:12px 32px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;border-radius:12px">
            <tr><td style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1c2333;line-height:1.5">
              📲 También te hemos enviado este resumen por WhatsApp, para que lo tengas siempre a mano.
            </td></tr>
          </table>
        </td></tr>` : ""}
        <tr><td style="padding:20px 32px 4px">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#5a6473;text-transform:uppercase;letter-spacing:.03em">Precios orientativos</p>
        </td></tr>
        <tr><td style="padding:8px 32px 0">${companyRows}</td></tr>
        <tr><td style="padding:8px 32px 0">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1c2333">¿Qué pasa ahora?</p>
          <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a6473;line-height:1.8">
            1. Revisa las opciones y elige la que más te convenza.<br />
            2. Pulsa «Solicitar llamada» en esa opción — gratis y sin compromiso.<br />
            3. Te llamamos en horario ${escapeHtml(CONTACT_HOURS)} para confirmar tu propuesta final.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px 8px">
          <a href="${waHref}" style="font-family:Arial,Helvetica,sans-serif;display:block;text-align:center;border:1px solid #1b2b6b;border-radius:12px;padding:13px 8px;font-size:14px;font-weight:700;color:#1b2b6b;text-decoration:none">
            ¿Prefieres que sigamos por WhatsApp? Escríbenos
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid #e4e8f0">
          <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5a6473;line-height:1.6">
            ${escapeHtml(BRAND_NAME)} · Horario de atención: ${escapeHtml(CONTACT_HOURS)}<br />
            <a href="${SITE_URL}/legal" style="color:#5a6473">Aviso legal y política de privacidad</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <img src="${SITE_URL}/api/email/pixel?lead=${encodeURIComponent(input.leadId)}&log=${encodeURIComponent(logId)}" width="1" height="1" alt="" style="display:none" />
</body></html>`;

  const subject = `Tu comparativa de ${productoLabel} — ${BRAND_NAME}`;
  return { subject, html };
}

export async function sendComparativaSummaryEmail(input: ComparativaEmailInput): Promise<{ sent: boolean }> {
  if (!emailConfigured() || !input.email) return { sent: false };

  const logId = crypto.randomUUID();
  const built = await buildComparativaEmailHtml(input, logId);
  if (!built) return { sent: false };

  const ok = await sendEmail({ to: input.email, subject: built.subject, html: built.html });
  if (ok) await addEmailLog(input.leadId, { id: logId, to: input.email, subject: built.subject, tipo: "comparativa-resumen" });
  return { sent: ok };
}
