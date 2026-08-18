import { NextResponse } from "next/server";
import { createEmailTemplate, listEmailTemplates, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import type { EmailTemplateDraft } from "@/lib/leadEmailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 50_000;

export async function GET(request: Request) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;
  const templates = await listEmailTemplates();
  return NextResponse.json({ ok: true, templates });
}

export async function POST(request: Request) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;

  let body: EmailTemplateDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.nombre?.trim()) return NextResponse.json({ ok: false, error: "Falta el nombre de la plantilla." }, { status: 400 });
  if (typeof body.cuerpoHtml === "string" && body.cuerpoHtml.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ ok: false, error: "El cuerpo del correo es demasiado largo." }, { status: 413 });
  }

  const template = await createEmailTemplate(body);

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "crear", modulo: "configuracion",
    entidad: "plantilla-email", entidadId: template.id, resumen: `Creó la plantilla de email "${template.nombre}".`,
  });

  return NextResponse.json({ ok: true, template });
}
