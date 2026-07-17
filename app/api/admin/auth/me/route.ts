import { NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/agentAuth";
import { ADMIN_MODULES } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Identidad de quien está usando el panel ahora mismo: acceso maestro
// (ADMIN_TOKEN) o un agente con su propia sesión. AdminShell la usa para
// mostrar nombre/foto reales y filtrar la navegación por permisos.
export async function GET(request: Request) {
  const identity = await resolveIdentity(request);
  if (!identity) return NextResponse.json({ ok: false }, { status: 401 });

  if (identity.kind === "master") {
    return NextResponse.json({
      ok: true,
      identity: { kind: "master", id: "master", nombre: "Admin (acceso maestro)", fotoUrl: "", rol: "admin", permisos: ADMIN_MODULES },
    });
  }

  const a = identity.agent;
  return NextResponse.json({
    ok: true,
    identity: { kind: "agent", id: a.id, nombre: a.nombre, fotoUrl: a.fotoUrl, rol: a.rol, permisos: a.rol === "admin" ? ADMIN_MODULES : a.permisos },
  });
}
