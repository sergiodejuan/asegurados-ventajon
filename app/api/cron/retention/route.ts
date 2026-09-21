import crypto from "crypto";
import { NextResponse } from "next/server";
import { purgeStaleLeads, expireStalePresupuestos, createAuditLog } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Plazo de conservación anunciado en /legal §3.5: 24 meses sin actividad y
// sin haber contratado. Vercel Cron llama a este endpoint según el
// calendario de vercel.json, con la cabecera Authorization que añade
// automáticamente a partir de la variable de entorno CRON_SECRET.
const RETENTION_DAYS = 730;

// Auto-caducidad de presupuestos fríos (higiene de pipeline, NO borrado):
// los que siguen en "nuevo" y llevan este plazo sin actividad pasan a
// "caducado" (ver expireStalePresupuestos en lib/store.ts). Se conserva todo
// el histórico y la analítica; es reversible. 90 días es conservador para no
// caducar leads templados que aún están decidiendo.
const PRESUPUESTO_CADUCIDAD_DAYS = 90;

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  // Cierra en falso si no hay secreto configurado: mejor que este endpoint
  // de borrado de datos quede inactivo por defecto a que quede abierto sin
  // proteger por un despiste de configuración.
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado." }, { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (!safeEquals(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const result = await purgeStaleLeads(RETENTION_DAYS);

  if (result.purged > 0) {
    await createAuditLog({
      agenteId: "sistema", agenteNombre: "Sistema (retención automática)", action: "actualizar", modulo: "rgpd",
      entidad: "lead", entidadId: "batch",
      resumen: `Anonimizó automáticamente ${result.purged} lead(s) sin actividad en más de ${RETENTION_DAYS} días y sin contratar (política de retención RGPD).`,
    });
  }

  const caducados = await expireStalePresupuestos(PRESUPUESTO_CADUCIDAD_DAYS);

  if (caducados.expired > 0) {
    await createAuditLog({
      agenteId: "sistema", agenteNombre: "Sistema (retención automática)", action: "actualizar", modulo: "presupuestos",
      entidad: "presupuesto", entidadId: "batch",
      resumen: `Caducó automáticamente ${caducados.expired} presupuesto(s) en estado "nuevo" sin actividad en más de ${PRESUPUESTO_CADUCIDAD_DAYS} días (higiene de pipeline; no se borran datos).`,
    });
  }

  return NextResponse.json({
    ok: true,
    ...result,
    retentionDays: RETENTION_DAYS,
    presupuestosCaducados: caducados.expired,
    presupuestosCaducidadDays: PRESUPUESTO_CADUCIDAD_DAYS,
  });
}
