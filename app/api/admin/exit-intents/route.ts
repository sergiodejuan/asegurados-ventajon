import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { getExitIntentConfig, saveExitIntentConfig, createAuditLog } from "@/lib/store";
import type { ExitIntentConfig } from "@/lib/exitIntentCampaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Límite razonable por imagen en base64 (el cliente ya la comprime antes de
// subirla si sube un archivo; un enlace externo pesa unos pocos bytes).
const MAX_IMAGE_LENGTH = 900_000;
const MAX_CAMPAIGNS = 10;

export async function GET(request: Request) {
  const auth = await requireModule(request, "exitintents");
  if (!auth.ok) return auth.response;
  const config = await getExitIntentConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PATCH(request: Request) {
  const auth = await requireModule(request, "exitintents");
  if (!auth.ok) return auth.response;

  let body: Partial<ExitIntentConfig>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (body.campaigns) {
    if (!Array.isArray(body.campaigns)) {
      return NextResponse.json({ ok: false, error: "Formato de campañas no válido." }, { status: 400 });
    }
    if (body.campaigns.length > MAX_CAMPAIGNS) {
      return NextResponse.json({ ok: false, error: `Máximo ${MAX_CAMPAIGNS} exit-intents.` }, { status: 400 });
    }
    for (const c of body.campaigns) {
      if (typeof c.imagenUrl === "string" && c.imagenUrl.startsWith("data:") && c.imagenUrl.length > MAX_IMAGE_LENGTH) {
        return NextResponse.json({ ok: false, error: "Una de las imágenes es demasiado grande." }, { status: 413 });
      }
      if (typeof c.maxPorSesion === "number" && (c.maxPorSesion < 1 || c.maxPorSesion > 10)) {
        return NextResponse.json({ ok: false, error: "Las veces por sesión deben estar entre 1 y 10." }, { status: 400 });
      }
    }
  }

  const config = await saveExitIntentConfig(body);

  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "exitintents",
    entidad: "exitintent", entidadId: "config", resumen: "Actualizó los exit-intent de la web general.",
  });

  return NextResponse.json({ ok: true, config });
}
