import { NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/agentAuth";
import { removeTeamPushSubscription, saveTeamPushSubscription } from "@/lib/store";
import { webPushConfigured } from "@/lib/webPush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cada agente puede activar/desactivar avisos push desde el propio panel.
// Requiere una sesión de agente real (no sirve el ADMIN_TOKEN maestro:
// no está atado a una persona y sus avisos no podrían atribuirse).

export async function POST(request: Request) {
  if (!webPushConfigured()) {
    return NextResponse.json({ ok: false, error: "Los avisos push no están configurados (faltan claves VAPID)." }, { status: 503 });
  }
  const identity = await resolveIdentity(request);
  if (!identity || identity.kind !== "agent") {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ ok: false, error: "Suscripción no válida." }, { status: 400 });
  }
  await saveTeamPushSubscription(identity.agentId, {
    endpoint: body.endpoint,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const identity = await resolveIdentity(request);
  if (!identity || identity.kind !== "agent") {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  let body: { endpoint?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }
  if (!body.endpoint) return NextResponse.json({ ok: false, error: "Falta el endpoint." }, { status: 400 });
  await removeTeamPushSubscription(identity.agentId, body.endpoint);
  return NextResponse.json({ ok: true });
}
