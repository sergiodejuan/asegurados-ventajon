import { NextResponse } from "next/server";
import { deleteEmailTemplate, getEmailTemplate, updateEmailTemplate, createAuditLog } from "@/lib/store";
import { requireModule } from "@/lib/agentAuth";
import type { EmailTemplateDraft } from "@/lib/leadEmailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 50_000;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;
  const template = await getEmailTemplate(params.id);
  if (!template) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true, template });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;

  let body: EmailTemplateDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (typeof body.cuerpoHtml === "string" && body.cuerpoHtml.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ ok: false, error: "El cuerpo del correo es demasiado largo." }, { status: 413 });
  }

  const template = await updateEmailTemplate(params.id, body);
  if (!template) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "configuracion",
    entidad: "plantilla-email", entidadId: template.id, resumen: `Actualizó la plantilla de email "${template.nombre}".`,
  });

  return NextResponse.json({ ok: true, template });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;
  const removed = await deleteEmailTemplate(params.id);
  if (!removed) return NextResponse.json({ ok: false, error: "No encontrada." }, { status: 404 });

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "eliminar", modulo: "configuracion",
    entidad: "plantilla-email", entidadId: params.id, resumen: "Eliminó una plantilla de email.",
  });

  return NextResponse.json({ ok: true });
}
