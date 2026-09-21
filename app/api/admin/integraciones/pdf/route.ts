import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { buildIntegrationsPdf } from "@/lib/integrationsPdf";
import { CODESCOPIC_ENV_VARS } from "@/lib/integrationsCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mismo PDF, dos puntos de entrada: /admin/integraciones (equipo interno,
// módulo "integraciones") y /portal-desarrollo (módulo "desarrollador").
// Cualquiera de los dos permisos vale — ver requireModule más abajo.
export async function GET(request: Request) {
  const auth = await requireModule(request, "integraciones");
  if (!auth.ok) {
    const devAuth = await requireModule(request, "desarrollador");
    if (!devAuth.ok) return auth.response;
  }

  const codescopicConfigured = CODESCOPIC_ENV_VARS.every((v) => !!process.env[v.nombre]);
  const bytes = await buildIntegrationsPdf({ codescopicConfigured });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="integraciones-api-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}

export function POST() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
