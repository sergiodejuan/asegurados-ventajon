import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { BRAND_NAME } from "./brand";
import {
  CODESCOPIC_FIELD_MAP, CODESCOPIC_ENV_VARS, CODESCOPIC_PAYLOAD_SAMPLE,
  API_CATEGORIES, WEBHOOKS,
} from "./integrationsCatalog";

// Genera el PDF de "Documentación de APIs e Integraciones" que se puede
// descargar desde /admin/integraciones y desde /portal-desarrollo — mismo
// contenido que esas páginas (misma fuente de datos, lib/integrationsCatalog.ts),
// solo que en formato para enviar al equipo. Con pdf-lib (ya es dependencia
// del proyecto, ver app/api/presupuesto/pdf/route.ts) en vez de un renderer
// HTML→PDF, así que el layout es manual: ver la clase Writer más abajo.

const NAVY = rgb(0x1b / 255, 0x2b / 255, 0x6b / 255);
const RED = rgb(0xc8 / 255, 0x31 / 255, 0x2a / 255);
const SLATE = rgb(0x5a / 255, 0x64 / 255, 0x73 / 255);
const INK = rgb(0x1c / 255, 0x23 / 255, 0x33 / 255);
const WHITE = rgb(1, 1, 1);
const HAIR = rgb(0xe4 / 255, 0xe8 / 255, 0xf0 / 255);
const MIST = rgb(0xf4 / 255, 0xf6 / 255, 0xfa / 255);
const GREEN = rgb(0x04 / 255, 0x78 / 255, 0x57 / 255);
const AMBER = rgb(0x92 / 255, 0x62 / 255, 0x0e / 255);

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = 56;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
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
    lines.push(current);
  }
  return lines;
}

class Writer {
  doc!: PDFDocument;
  font!: PDFFont;
  bold!: PDFFont;
  mono!: PDFFont;
  page!: PDFPage;
  y = 0;
  pageNum = 0;
  title: string;

  constructor(title: string) {
    this.title = title;
  }

  static async create(title: string): Promise<Writer> {
    const w = new Writer(title);
    w.doc = await PDFDocument.create();
    w.doc.setTitle(title);
    w.font = await w.doc.embedFont(StandardFonts.Helvetica);
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold);
    w.mono = await w.doc.embedFont(StandardFonts.Courier);
    w.newPage();
    return w;
  }

  newPage() {
    this.pageNum += 1;
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    // Cabecera
    this.page.drawRectangle({ x: 0, y: PAGE_H - 44, width: PAGE_W, height: 44, color: NAVY });
    this.page.drawText(BRAND_NAME.toUpperCase(), { x: MARGIN, y: PAGE_H - 28, size: 12, font: this.bold, color: WHITE });
    const label = "DOCUMENTACIÓN TÉCNICA — USO INTERNO";
    this.page.drawText(label, { x: PAGE_W - MARGIN - this.bold.widthOfTextAtSize(label, 9), y: PAGE_H - 27, size: 9, font: this.bold, color: WHITE });
    // Pie
    const footer = `${this.title} · Página ${this.pageNum}`;
    this.page.drawText(footer, { x: MARGIN, y: 24, size: 8, font: this.font, color: SLATE });
    const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
    this.page.drawText(fecha, { x: PAGE_W - MARGIN - this.font.widthOfTextAtSize(fecha, 8), y: 24, size: 8, font: this.font, color: SLATE });
    this.y = PAGE_H - 44 - 30;
  }

  ensureSpace(h: number) {
    if (this.y - h < BOTTOM) this.newPage();
  }

  h1(text: string) {
    this.ensureSpace(40);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 20, font: this.bold, color: NAVY });
    this.y -= 8;
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y }, thickness: 2, color: RED });
    this.y -= 22;
  }

  h2(text: string) {
    this.ensureSpace(30);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 14, font: this.bold, color: NAVY });
    this.y -= 6;
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y }, thickness: 1, color: HAIR });
    this.y -= 16;
  }

  h3(text: string) {
    this.ensureSpace(20);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 11.5, font: this.bold, color: NAVY });
    this.y -= 16;
  }

  paragraph(text: string, opts: { size?: number; color?: ReturnType<typeof rgb>; font?: PDFFont; gap?: number } = {}) {
    const size = opts.size ?? 9.5;
    const font = opts.font ?? this.font;
    const color = opts.color ?? INK;
    const lines = wrapText(text, font, size, CONTENT_W);
    const lineHeight = size * 1.45;
    this.ensureSpace(lines.length * lineHeight);
    for (const line of lines) {
      this.page.drawText(line, { x: MARGIN, y: this.y, size, font, color });
      this.y -= lineHeight;
    }
    this.y -= opts.gap ?? 8;
  }

  codeBlock(text: string) {
    const size = 8;
    const lines = wrapText(text, this.mono, size, CONTENT_W - 20);
    const lineHeight = size * 1.5;
    const boxHeight = lines.length * lineHeight + 16;
    this.ensureSpace(boxHeight);
    this.page.drawRectangle({ x: MARGIN, y: this.y - boxHeight + lineHeight - 4, width: CONTENT_W, height: boxHeight, color: NAVY });
    let ly = this.y - 8;
    for (const line of lines) {
      this.page.drawText(line, { x: MARGIN + 10, y: ly, size, font: this.mono, color: WHITE });
      ly -= lineHeight;
    }
    this.y -= boxHeight + 10;
  }

  // Ficha compacta reutilizada para el mapeo de campos de Codescopic, cada
  // endpoint de la API propia, y cada webhook — mismo patrón visual que las
  // fichas de /admin/integraciones, adaptado a texto plano.
  card(opts: { top: string; topRight?: { text: string; ok: boolean }; lines: { label: string; value: string }[] }) {
    const titleSize = 9.5;
    const rowSize = 8.5;
    const rows = opts.lines.flatMap((l) => wrapText(`${l.label}: ${l.value}`, this.font, rowSize, CONTENT_W - 24));
    const rowHeight = rowSize * 1.5;
    const boxHeight = 22 + rows.length * rowHeight + 8;
    this.ensureSpace(boxHeight + 6);
    const top = this.y;
    this.page.drawRectangle({ x: MARGIN, y: top - boxHeight, width: CONTENT_W, height: boxHeight, color: MIST, borderColor: HAIR, borderWidth: 1 });
    this.page.drawText(opts.top, { x: MARGIN + 10, y: top - 16, size: titleSize, font: this.mono, color: INK });
    if (opts.topRight) {
      const c = opts.topRight.ok ? GREEN : AMBER;
      const tw = this.bold.widthOfTextAtSize(opts.topRight.text, 8);
      this.page.drawText(opts.topRight.text, { x: MARGIN + CONTENT_W - 10 - tw, y: top - 16, size: 8, font: this.bold, color: c });
    }
    let ly = top - 16 - rowHeight;
    for (const row of rows) {
      this.page.drawText(row, { x: MARGIN + 10, y: ly, size: rowSize, font: this.font, color: SLATE });
      ly -= rowHeight;
    }
    this.y = top - boxHeight - 8;
  }

  async bytes(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

export async function buildIntegrationsPdf(opts: { codescopicConfigured: boolean }): Promise<Uint8Array> {
  const title = `Documentación de APIs e Integraciones — ${BRAND_NAME}`;
  const w = await Writer.create(title);

  // Portada / introducción
  w.h1("Documentación de APIs e Integraciones");
  w.paragraph(
    `Generado el ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}. ` +
    "Este documento resume las 3 integraciones de asegurados-ventajon.com: el motor de tarificación externo Codescopic " +
    "(aún no conectado), la API propia del sitio (todos sus endpoints) y los webhooks salientes/entrantes. Uso interno — " +
    "no compartir fuera del equipo.",
    { gap: 16 }
  );

  // ---------------------------- Codescopic ----------------------------
  w.h2("1. Codescopic");
  w.paragraph(
    opts.codescopicConfigured
      ? "Variables de entorno configuradas. La prueba de conexión del panel solo comprueba que el host responde, no que la cotización real funcione."
      : "No conectado — pendiente de credenciales. El tarificador de salud ya recoge todos los datos personales que pide el payload de referencia (ver más abajo); falta la documentación de acceso de Codescopic (autenticación, URL base, catálogo de municipios).",
    { color: opts.codescopicConfigured ? GREEN : AMBER, font: w.bold }
  );

  w.h3("Variables de entorno previstas");
  for (const v of CODESCOPIC_ENV_VARS) {
    w.paragraph(`${v.nombre} — ${v.descripcion}`, { size: 9, gap: 4 });
  }
  w.y -= 6;

  w.h3("Mapeo de campos (ramo Salud)");
  for (const f of CODESCOPIC_FIELD_MAP) {
    w.card({
      top: f.campoCodescopic,
      topRight: { text: f.estado === "listo" ? "LISTO" : "PENDIENTE", ok: f.estado === "listo" },
      lines: [
        { label: "Origen en la web", value: f.origenEnLaWeb },
        ...(f.nota ? [{ label: "Nota", value: f.nota }] : []),
      ],
    });
  }

  w.h3("Payload de referencia (Salud)");
  w.codeBlock(CODESCOPIC_PAYLOAD_SAMPLE);

  // ---------------------------- API propia ----------------------------
  w.h2("2. API propia de la web");
  for (const cat of API_CATEGORIES) {
    w.h3(cat.categoria);
    if (cat.descripcion) w.paragraph(cat.descripcion, { size: 9, color: SLATE, gap: 6 });
    for (const e of cat.endpoints) {
      w.card({
        top: `${e.method} ${e.path}`,
        lines: [
          { label: "Qué hace", value: e.resumen },
          { label: "Auth", value: e.auth },
          ...(e.request !== "—" ? [{ label: "Request", value: e.request }] : []),
          ...(e.response !== "—" ? [{ label: "Response", value: e.response }] : []),
        ],
      });
    }
  }

  // ---------------------------- Webhooks ----------------------------
  w.h2("3. Webhooks");
  for (const wh of WEBHOOKS) {
    w.card({
      top: `[${wh.direccion === "saliente" ? "SALIENTE" : "ENTRANTE"}] ${wh.nombre} — ${wh.endpoint}`,
      lines: [
        { label: "Qué hace", value: wh.resumen },
        { label: "Payload", value: wh.payload },
        { label: "Seguridad", value: wh.seguridad },
      ],
    });
  }

  return w.bytes();
}
