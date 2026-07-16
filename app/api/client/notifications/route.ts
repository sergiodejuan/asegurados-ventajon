import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listClientNotifications, markNotificationsRead } from "@/lib/store";
import { CLIENT_SESSION_COOKIE, verifySessionToken } from "@/lib/clientSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Avisos sobre las llamadas del cliente (reprogramada/hecha/cancelada),
// visibles en su área de cliente. Requiere sesión (mismo mecanismo que el
// resto de /api/client/*): sin cookie válida, no hay a quién mostrárselos.
export async function GET() {
  const token = cookies().get(CLIENT_SESSION_COOKIE)?.value;
  const leadId = verifySessionToken(token);
  if (!leadId) return NextResponse.json({ ok: false }, { status: 401 });

  const notifications = await listClientNotifications(leadId);
  return NextResponse.json({ ok: true, notifications });
}

export async function PATCH(request: Request) {
  const token = cookies().get(CLIENT_SESSION_COOKIE)?.value;
  const leadId = verifySessionToken(token);
  if (!leadId) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { ids?: string[] };
  try { body = await request.json(); }
  catch { body = {}; }

  await markNotificationsRead(leadId, body.ids);
  return NextResponse.json({ ok: true });
}
