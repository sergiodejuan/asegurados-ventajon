import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getLead, getPresupuesto, addEmailLog, getTheme } from "@/lib/store";
import { createPresupuestoAccessLink, createVerificationLink } from "@/lib/clientVerification";
import { renderEmailTemplate } from "@/lib/leadEmailTemplates";
import { sendEmail, tracked, escapeHtml } from "@/lib/email";
import { requireModule } from "@/lib/agentAuth";
import { createAuditLog } from "@/lib/store";
import { quoteNumber } from "@/lib/quote";
import { BRAND_NAME, SITE_URL, CONTACT_HOURS } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 50_000;

const sendEmailSchema = z
  .object({
    asunto: z.string().trim().min(1).max(200),
    cuerpoHtml: z.string().max(MAX_BODY_LENGTH),
    presupuestoIds: z.array(z.string().max(80)).max(20).optional().default([]),
  })
  .strict();

const PRODUCTO_LABELS: Record<string, string> = {
  salud: "seguro de salud", vida: "seguro de vida", auto: "seguro de auto", decesos: "seguro de decesos",
};

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Envoltura mínima de marca (logo + tipografía + pie con horario de
// atención y enlace legal) — igual criterio de cabecera/pie que
// lib/comparativaEmail.ts, pero sin las tablas de comparación de precios:
// este es un correo de agente a un lead concreto, no una comparativa.
async function wrapEmailBody(opts: { bodyHtml: string; leadId: string; logId: string; accessLinkPath: string | null }): Promise<string> {
  const theme = await getTheme();
  const headerLogo = theme.logoUrl
    ? `<img src="${SITE_URL}/api/theme/logo" alt="${escapeHtml(BRAND_NAME)}" height="32" style="height:32px;width:auto;display:block;border:0" />`
    : `<span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:800;color:#1b2b6b">Asegurados <span style="color:#c8312a">Ventajon</span></span>`;

  const accessBlock = opts.accessLinkPath
    ? `
        <tr><td style="padding:8px 32px 0">
          <a href="${tracked(opts.leadId, opts.logId, opts.accessLinkPath)}" style="font-family:Arial,Helvetica,sans-serif;display:block;text-align:center;background:#c8312a;border-radius:10px;padding:13px 8px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none">
            Ver mi presupuesto
          </a>
        </td></tr>`
    : "";

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(BRAND_NAME)}</title></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:20px;overflow:hidden">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #e4e8f0">${headerLogo}</td></tr>
        <tr><td style="padding:28px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#1c2333">${opts.bodyHtml}</td></tr>
        ${accessBlock}
        <tr><td style="padding:20px 32px 28px;border-top:1px solid #e4e8f0;margin-top:16px">
          <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5a6473;line-height:1.6">
            ${escapeHtml(BRAND_NAME)} · Horario de atención: ${escapeHtml(CONTACT_HOURS)}<br />
            <a href="${SITE_URL}/legal" style="color:#5a6473">Aviso legal y política de privacidad</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <img src="${SITE_URL}/api/email/pixel?lead=${encodeURIComponent(opts.leadId)}&log=${encodeURIComponent(opts.logId)}" width="1" height="1" alt="" style="display:none" />
</body></html>`;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "leads");
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const parsed = sendEmailSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Campos no válidos." }, { status: 400 });
  }
  const body = parsed.data;

  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  if (!lead.email) return NextResponse.json({ ok: false, error: "Este lead no tiene un email guardado." }, { status: 400 });

  // Defensa: solo presupuestos que de verdad pertenecen a este lead —
  // ignora silenciosamente cualquier id ajeno en vez de fallar todo el envío.
  const presupuestos = (
    await Promise.all(body.presupuestoIds.map((pid) => getPresupuesto(pid)))
  ).filter((p): p is NonNullable<typeof p> => !!p && p.leadId === lead.id);

  const primero = presupuestos[0] ?? null;
  const primerNombre = lead.nombre.trim().split(/\s+/)[0] || "";
  const precio = primero ? (primero.eleccion?.precio ?? primero.precioAprox) : null;

  const vars: Record<string, string> = {
    nombre: lead.nombre || "",
    primer_nombre: primerNombre,
    producto: PRODUCTO_LABELS[primero?.producto ?? lead.producto ?? ""] ?? (lead.producto || ""),
    compania: primero?.eleccion?.compania ?? "",
    precio: precio != null ? `${euros(precio)} €/mes` : "",
    numero_presupuesto: primero ? quoteNumber(primero.id) : "",
    agente_nombre: auth.agentNombre || "",
  };

  const asunto = renderEmailTemplate(body.asunto, vars);
  const cuerpoRenderizado = renderEmailTemplate(body.cuerpoHtml, vars);

  // Enlace seguro: si se asocia un único presupuesto, aterriza directo en
  // él; con varios o ninguno, aterriza en el listado general del área de
  // cliente (mismo mecanismo de un solo uso y mismo límite de 3/hora que el
  // resto de enlaces de verificación — ver lib/clientVerification.ts).
  const secureLink = presupuestos.length === 1
    ? await createPresupuestoAccessLink(lead.id, presupuestos[0].id)
    : await createVerificationLink(lead.id);
  if (!secureLink) {
    return NextResponse.json({
      ok: false,
      error: "Ya se han generado demasiados enlaces de acceso para este lead en la última hora. Prueba de nuevo más tarde.",
    }, { status: 429 });
  }
  const linkUrl = new URL(secureLink);
  const accessLinkPath = `${linkUrl.pathname}${linkUrl.search}`;

  const logId = crypto.randomUUID();
  const html = await wrapEmailBody({ bodyHtml: cuerpoRenderizado, leadId: lead.id, logId, accessLinkPath });

  const ok = await sendEmail({ to: lead.email, subject: asunto, html });
  if (!ok) {
    return NextResponse.json({ ok: false, error: "No se pudo enviar el correo (revisa la configuración de envío)." }, { status: 502 });
  }

  await addEmailLog(lead.id, { id: logId, to: lead.email, subject: asunto, tipo: "manual", agente: auth.agentNombre });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "enviar-email", modulo: "leads",
    entidad: "lead", entidadId: lead.id,
    resumen: `Envió un email manual a ${lead.email}${presupuestos.length ? ` con ${presupuestos.length} presupuesto(s) asociado(s)` : ""}.`,
  });

  return NextResponse.json({ ok: true });
}
