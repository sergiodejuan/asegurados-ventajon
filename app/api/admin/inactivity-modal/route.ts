import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { getInactivityModalConfig, saveInactivityModalConfig, createAuditLog } from "@/lib/store";
import { clampInactivityModal, type InactivityModalConfig } from "@/lib/inactivityModal";
import { isValidImageDataUri } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El cliente comprime la imagen antes de subirla; un enlace https externo pesa
// unos pocos bytes.
const MAX_IMAGE_LENGTH = 900_000;

export async function GET(request: Request) {
  const auth = await requireModule(request, "exitintents");
  if (!auth.ok) return auth.response;
  const config = await getInactivityModalConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PATCH(request: Request) {
  const auth = await requireModule(request, "exitintents");
  if (!auth.ok) return auth.response;

  let body: Partial<InactivityModalConfig>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (typeof body.imagenUrl === "string" && body.imagenUrl.startsWith("data:")) {
    if (body.imagenUrl.length > MAX_IMAGE_LENGTH) {
      return NextResponse.json({ ok: false, error: "La imagen es demasiado grande. Prueba con una más ligera." }, { status: 413 });
    }
    if (!isValidImageDataUri(body.imagenUrl)) {
      return NextResponse.json({ ok: false, error: "La imagen no es válida (PNG/JPEG/WebP/GIF)." }, { status: 400 });
    }
  }

  const config = await saveInactivityModalConfig(clampInactivityModal(body));

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "exitintents",
    entidad: "config", entidadId: "modal-inactividad", resumen: "Actualizó el modal de inactividad de la comparativa.",
  });

  return NextResponse.json({ ok: true, config });
}
