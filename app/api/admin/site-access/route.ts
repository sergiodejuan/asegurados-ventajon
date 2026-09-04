import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { getSiteAccessConfig, saveSiteAccessConfig } from "@/lib/store";
import { hashPassword } from "@/lib/password";
import { validateHardPassword } from "@/lib/siteAccess";
import { invalidateSiteAccessCacheEdge } from "@/lib/siteAccessEdge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/site-access — lee la config del bloqueo global.
// Nunca devuelve el hash; sólo si hay contraseña configurada y desde
// cuándo. El módulo "configuracion" ya es el permiso más restringido del
// panel — quien puede tocarlo puede administrar toda la web.
export async function GET(request: Request) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;

  const cfg = await getSiteAccessConfig();
  return NextResponse.json({
    ok: true,
    config: {
      enabled: cfg.enabled,
      hasPassword: !!cfg.passwordHash,
      updatedAt: cfg.updatedAt,
      updatedBy: cfg.updatedBy,
    },
  });
}

// PUT /api/admin/site-access
// Body: { enabled?: boolean, password?: string }
//
// Reglas:
//   - Si `password` viene, se valida y sustituye al hash actual.
//   - Si `enabled=true` y NO hay hash (ni existente ni en este mismo
//     body), rechazamos: no tiene sentido activar el bloqueo sin
//     contraseña — nadie podría entrar.
export async function PUT(request: Request) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;

  let body: { enabled?: unknown; password?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const current = await getSiteAccessConfig();
  const patch: { enabled?: boolean; passwordHash?: string } = {};

  if (typeof body.password === "string" && body.password.length > 0) {
    const check = validateHardPassword(body.password);
    if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
    patch.passwordHash = await hashPassword(body.password);
  }

  if (typeof body.enabled === "boolean") {
    if (body.enabled && !patch.passwordHash && !current.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "Configura una contraseña antes de activar el bloqueo." },
        { status: 400 },
      );
    }
    patch.enabled = body.enabled;
  }

  const next = await saveSiteAccessConfig({
    enabled: patch.enabled ?? current.enabled,
    passwordHash: patch.passwordHash ?? current.passwordHash,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.agentNombre,
  });

  // Este edge worker verá la nueva config inmediatamente; los demás
  // esperan al TTL (30s) de su caché.
  invalidateSiteAccessCacheEdge();

  return NextResponse.json({
    ok: true,
    config: {
      enabled: next.enabled,
      hasPassword: !!next.passwordHash,
      updatedAt: next.updatedAt,
      updatedBy: next.updatedBy,
    },
  });
}
