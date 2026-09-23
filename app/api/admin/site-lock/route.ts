import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { hashPassword } from "@/lib/password";
import { getSiteLockConfig, saveSiteLockConfig } from "@/lib/siteLock";
import { createAuditLog } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gestión del bloqueo público de la web: a propósito exige el módulo
// "desarrollador" (no "configuracion", que tienen muchos más agentes) — es
// una acción de alto impacto (deja fuera a cualquier visitante) y el permiso
// granular pedido es justo "admin o desarrollo", que es lo que ya modela
// ADMIN_MODULES para /portal-desarrollo.

function publicConfig(config: Awaited<ReturnType<typeof getSiteLockConfig>>) {
  return {
    enabled: config.enabled,
    hasPassword: !!config.passwordHash,
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
  };
}

export async function GET(request: Request) {
  const auth = await requireModule(request, "desarrollador");
  if (!auth.ok) return auth.response;
  const config = await getSiteLockConfig();
  return NextResponse.json({ ok: true, ...publicConfig(config) });
}

export async function PATCH(request: Request) {
  const auth = await requireModule(request, "desarrollador");
  if (!auth.ok) return auth.response;

  let body: { enabled?: boolean; password?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const current = await getSiteLockConfig();
  const patch: Partial<Pick<typeof current, "enabled" | "passwordHash">> = {};

  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }
    patch.passwordHash = await hashPassword(body.password);
  }

  const willHavePassword = !!(patch.passwordHash || current.passwordHash);
  if (typeof body.enabled === "boolean") {
    if (body.enabled && !willHavePassword) {
      return NextResponse.json({ ok: false, error: "Configura antes una contraseña de acceso." }, { status: 400 });
    }
    patch.enabled = body.enabled;
  }

  const config = await saveSiteLockConfig(patch, auth.agentNombre);

  const resumen = body.enabled !== undefined
    ? (config.enabled ? "Activó el bloqueo público de la web." : "Desactivó el bloqueo público de la web.")
    : "Actualizó la contraseña de acceso público de la web.";
  await createAuditLog({
    agenteId: auth.agentId, agenteNombre: auth.agentNombre, action: "actualizar", modulo: "desarrollador",
    entidad: "config", entidadId: "site-lock", resumen,
  });

  return NextResponse.json({ ok: true, ...publicConfig(config) });
}
