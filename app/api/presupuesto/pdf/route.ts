import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import { BRAND_NAME } from "@/lib/brand";
import { buildWhatsAppText, whatsAppUrl, quoteNumber, ageFromDob, type QuoteProfile } from "@/lib/quote";
import { rateLimitFail, checkRateLimit } from "@/lib/rateLimit";
import { CLIENT_SESSION_COOKIE, verifySessionToken } from "@/lib/clientSession";
import { resolveIdentity } from "@/lib/agentAuth";
import { getPresupuesto } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PdfRequest = {
  producto: "salud" | "vida" | "auto" | "decesos";
  compania: string;
  quote: Partial<QuoteProfile> | null;
  precio: { conCopago?: number; sinCopago?: number; precio?: number };
  servicios: string[];
  condiciones: string;
  // presupuestoId real (id del presupuesto en KV). Requerido para clientes
  // públicos: se valida que la sesión del cliente sea la dueña. Los admin
  // pueden omitirlo (autenticación por token/agente da acceso a cualquiera).
  presupuestoId?: string;
};

const NAVY = rgb(0x1b / 255, 0x2b / 255, 0x6b / 255);
const RED = rgb(0xc8 / 255, 0x31 / 255, 0x2a / 255);
const SLATE = rgb(0x5a / 255, 0x64 / 255, 0x73 / 255);
const INK = rgb(0x1c / 255, 0x23 / 255, 0x33 / 255);
const WHITE = rgb(1, 1, 1);
const HAIR = rgb(0xe4 / 255, 0xe8 / 255, 0xf0 / 255);

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (current && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function euros(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function POST(request: Request) {
  const limited = await rateLimitFail(request, { bucket: "presupuesto-pdf", limit: 30, windowSeconds: 3600 });
  if (limited) return limited;

  let body: PdfRequest;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.compania || (body.producto !== "salud" && body.producto !== "vida" && body.producto !== "auto" && body.producto !== "decesos")) {
    return NextResponse.json({ ok: false, error: "Datos incompletos." }, { status: 400 });
  }

  // Autenticación: 1) admin (token o sesión de agente) tiene acceso libre
  // para generar PDFs de cualquier presupuesto; 2) cliente público debe
  // tener sesión válida (cookie httpOnly firmada tras completar el
  // tarificador) Y su leadId debe ser el dueño del presupuestoId que
  // solicita. Sin sesión, no se genera PDF (auditoría, X-04) — antes
  // era abierto y permitía a cualquiera generar PDFs con la marca
  // Ventajon para datos arbitrarios (vector de fraude/phishing).
  const identity = await resolveIdentity(request).catch(() => null);
  const isAdmin = !!identity; // ADMIN_TOKEN o sesión de agente
  if (!isAdmin) {
    // Cliente público: exigir sesión + presupuestoId real + propiedad.
    const clientLeadId = verifySessionToken(cookies().get(CLIENT_SESSION_COOKIE)?.value);
    if (!clientLeadId) {
      return NextResponse.json({ ok: false, error: "No autorizado. Completa primero un presupuesto para poder descargarlo." }, { status: 401 });
    }
    const presupuestoId = body.presupuestoId || (body.quote?.id ?? "");
    if (!presupuestoId) {
      return NextResponse.json({ ok: false, error: "Falta el identificador del presupuesto." }, { status: 400 });
    }
    // Rate limit por leadId (defensa de coste: 20 PDFs por lead/día).
    const perLead = await checkRateLimit(`presupuesto-pdf:lead:${clientLeadId}`, 20, 24 * 3600);
    if (!perLead.ok) {
      return NextResponse.json(
        { ok: false, error: "Has generado muchos PDFs. Prueba de nuevo mañana." },
        { status: 429, headers: { "Retry-After": String(perLead.retryAfterSeconds) } }
      );
    }
    const presupuesto = await getPresupuesto(presupuestoId).catch(() => null);
    if (!presupuesto || presupuesto.leadId !== clientLeadId) {
      return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
    }
  }

  // pdf-lib con la fuente estándar Helvetica solo soporta WinAnsi: un texto
  // con emoji u otros caracteres fuera de ese rango lanza una excepción al
  // dibujarlo. Se captura aquí para devolver un 400 controlado en vez de un
  // 500 sin más — y de paso, limita el endpoint a no poder usarse para
  // generar PDFs en bucle sin ningún control (ver rateLimitFail arriba).
  try {
    return await buildPresupuestoPdf(body);
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo generar el PDF con esos datos." }, { status: 400 });
  }
}

// Watermark de verificación: hash HMAC-SHA256 truncado del contenido clave
// del PDF + timestamp, calculado con un secreto propio (o ADMIN_TOKEN como
// fallback). Se estampa como pie discreto — cualquier PDF falsificado
// mostrará un hash que no valida contra el endpoint /api/presupuesto/verify
// (a futuro), permitiendo desmentir documentos que suplanten la marca.
function pdfWatermark(body: PdfRequest, at: string): string {
  // Estricto: solo PDF_WATERMARK_SECRET. Nunca ADMIN_TOKEN — si algún día
  // rotamos el master, no queremos invalidar la trazabilidad de PDFs pasados
  // ni tampoco compartir superficie de compromiso (auditoría consultora Meta-A).
  const secret = process.env.PDF_WATERMARK_SECRET || "";
  if (!secret) return "";
  const payload = `${body.producto}|${body.compania}|${body.quote?.id ?? ""}|${JSON.stringify(body.precio)}|${at}`;
  const h = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return h.slice(0, 12).toUpperCase();
}

async function buildPresupuestoPdf(body: PdfRequest): Promise<NextResponse> {
  const quote = body.quote ?? null;
  const presupuestoId = quote?.id ? quoteNumber(quote.id) : quoteNumber(`${Date.now()}`);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  const age = ageFromDob(quote?.fechaNacimiento);

  const waText = buildWhatsAppText({ producto: body.producto, compania: body.compania, quote: quote as QuoteProfile | null });
  const qrPng = await QRCode.toBuffer(whatsAppUrl(waText), { type: "png", width: 320, margin: 1, color: { dark: "#1B2B6B", light: "#FFFFFF" } });

  const doc = await PDFDocument.create();
  doc.setTitle(`Presupuesto ${presupuestoId} — ${BRAND_NAME}`);
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const qrImage = await doc.embedPng(qrPng);

  const marginX = 48;
  const width = 595;

  // Header
  page.drawRectangle({ x: 0, y: 792, width, height: 50, color: NAVY });
  page.drawText(BRAND_NAME.toUpperCase(), { x: marginX, y: 811, size: 14, font: bold, color: WHITE });
  const presupuestoLabel = "PRESUPUESTO ORIENTATIVO";
  page.drawText(presupuestoLabel, {
    x: width - marginX - bold.widthOfTextAtSize(presupuestoLabel, 11), y: 813, size: 11, font: bold, color: WHITE,
  });

  let y = 768;
  page.drawText(`Presupuesto nº ${presupuestoId}`, { x: marginX, y, size: 10, font: bold, color: SLATE });
  const fechaLabel = `Fecha: ${fecha}`;
  page.drawText(fechaLabel, { x: width - marginX - font.widthOfTextAtSize(fechaLabel, 10), y, size: 10, font, color: SLATE });

  // Datos del cliente
  y -= 30;
  page.drawText("Datos del cliente", { x: marginX, y, size: 13, font: bold, color: NAVY });
  y -= 8;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: HAIR });
  y -= 20;

  const clientRows: [string, string][] = [
    ["Nombre", quote?.nombre || "—"],
    ["Teléfono", quote?.telefono || "—"],
    ["Email", quote?.email || "—"],
    ["Código postal", quote?.codigoPostal || "—"],
  ];
  if (body.producto === "salud") {
    clientRows.push(["Personas a asegurar", String(quote?.numAsegurados ?? 1)]);
    clientRows.push(["Cobertura dental", quote?.coberturaDental ? "Sí" : "No"]);
  } else if (body.producto === "auto") {
    clientRows.push(["Vehículo", quote?.tipoVehiculo || "—"]);
    clientRows.push(["Matrícula", quote?.matricula || "—"]);
  } else if (body.producto === "decesos") {
    clientRows.push(["Personas a asegurar", String(quote?.numAsegurados ?? 1)]);
  } else {
    clientRows.push(["Motivo", quote?.motivo || "—"]);
    clientRows.push(["Fumador", quote?.fumador ? "Sí" : "No"]);
  }
  if (age !== null) clientRows.push(["Edad", `${age} años`]);

  const colWidth = (width - marginX * 2) / 2;
  const rowHeight = 32;
  clientRows.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = marginX + col * colWidth;
    const ry = y - row * rowHeight;
    page.drawText(label, { x, y: ry, size: 9, font, color: SLATE });
    page.drawText(value, { x, y: ry - 15, size: 11, font: bold, color: INK });
  });
  y -= Math.ceil(clientRows.length / 2) * rowHeight + 20;

  // Oferta
  page.drawText(`Tu oferta con ${body.compania}`, { x: marginX, y, size: 13, font: bold, color: NAVY });
  y -= 8;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: HAIR });
  y -= 28;

  if (body.producto === "salud") {
    page.drawText("Con copago", { x: marginX, y, size: 9, font, color: SLATE });
    page.drawText(`${euros(body.precio.conCopago ?? 0)} €/mes`, { x: marginX, y: y - 18, size: 18, font: bold, color: NAVY });
    page.drawText("Sin copago", { x: marginX + colWidth, y, size: 9, font, color: SLATE });
    page.drawText(`${euros(body.precio.sinCopago ?? 0)} €/mes`, { x: marginX + colWidth, y: y - 18, size: 18, font: bold, color: NAVY });
    y -= 46;
  } else {
    page.drawText("Precio orientativo", { x: marginX, y, size: 9, font, color: SLATE });
    page.drawText(`Desde ${euros(body.precio.precio ?? 0)} €/mes`, { x: marginX, y: y - 18, size: 18, font: bold, color: NAVY });
    y -= 46;
  }

  page.drawText("Servicios incluidos", { x: marginX, y, size: 11, font: bold, color: INK });
  y -= 18;
  for (const s of body.servicios.slice(0, 8)) {
    page.drawCircle({ x: marginX + 2, y: y + 3, size: 1.6, color: RED });
    page.drawText(s, { x: marginX + 12, y, size: 10, font, color: INK });
    y -= 16;
  }

  if (body.condiciones) {
    y -= 8;
    page.drawText("Condiciones", { x: marginX, y, size: 11, font: bold, color: INK });
    y -= 16;
    for (const line of wrapText(body.condiciones, font, 9.5, width - marginX * 2)) {
      page.drawText(line, { x: marginX, y, size: 9.5, font, color: SLATE });
      y -= 13;
    }
  }

  // QR
  const qrSize = 96;
  const qrY = 120;
  page.drawImage(qrImage, { x: width - marginX - qrSize, y: qrY, width: qrSize, height: qrSize });
  const qrCaption = wrapText("Escanea para seguir por WhatsApp con este presupuesto", font, 8.5, 120);
  qrCaption.forEach((line, i) => {
    page.drawText(line, { x: width - marginX - qrSize, y: qrY - 14 - i * 11, size: 8.5, font, color: SLATE });
  });

  // Footer disclaimer
  const disclaimer = wrapText(
    `Precio orientativo, no una cotización en firme. El precio final depende del perfil de la persona a asegurar y de la ` +
    `compañía elegida, y lo confirma un asesor de ${BRAND_NAME} sin compromiso. ${BRAND_NAME} es una correduría de seguros.`,
    font, 8, width - marginX * 2 - 140
  );
  disclaimer.forEach((line, i) => {
    page.drawText(line, { x: marginX, y: qrY + qrSize - 14 - i * 11, size: 8, font, color: SLATE });
  });

  // Watermark de verificación (auditoría X-04). Cadena corta al pie que
  // permite desmentir PDFs falsificados: solo Ventajon puede regenerar
  // exactamente ese hash con el secreto de firma y el mismo contenido.
  const at = new Date().toISOString();
  const wm = pdfWatermark(body, at);
  if (wm) {
    const wmText = `Ref. ${wm} · Emitido ${at.slice(0, 10)}`;
    page.drawText(wmText, { x: marginX, y: 32, size: 7, font, color: SLATE });
  }

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="presupuesto-${presupuestoId}.pdf"`,
    },
  });
}
