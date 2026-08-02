import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { storageMode } from "@/lib/store";
import { retellConfigured } from "@/lib/retell";
import { blandConfigured } from "@/lib/bland";
import { turnstileConfigured } from "@/lib/turnstile";
import { CODESCOPIC_ENV_VARS } from "@/lib/integrationsCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Estado "real" (derivado de variables de entorno presentes, no de lo que
// diga la documentación) de cada integración del panel /admin/integraciones.
export async function GET(request: Request) {
  const auth = await requireModule(request, "integraciones");
  if (!auth.ok) return auth.response;

  const codescopicMissing = CODESCOPIC_ENV_VARS.map((v) => v.nombre).filter((name) => !process.env[name]);

  return NextResponse.json({
    ok: true,
    codescopic: {
      configured: codescopicMissing.length === 0,
      missing: codescopicMissing,
    },
    apiPropia: {
      storageMode: storageMode(),
      turnstileConfigured: turnstileConfigured(),
      adminTokenSet: !!process.env.ADMIN_TOKEN,
    },
    webhooks: {
      saliente: { configured: !!process.env.LEAD_WEBHOOK_URL },
      retell: { configured: retellConfigured() },
      bland: { configured: blandConfigured() },
    },
  });
}

export function POST() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
