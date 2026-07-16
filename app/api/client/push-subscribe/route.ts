import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { savePushSubscription, removePushSubscription } from "@/lib/store";
import { CLIENT_SESSION_COOKIE, verifySessionToken } from "@/lib/clientSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Guarda la suscripción push del navegador del cliente (Web Push estándar),
// para poder avisarle cuando gestionamos una de sus llamadas. Requiere
// sesión activa: solo tiene sentido asociada a un lead conocido.
export async function POST(request: Request) {
  const token = cookies().get(CLIENT_SESSION_COOKIE)?.value;
  const leadId = verifySessionToken(token);
  if (!leadId) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ ok: false, error: "Suscripción no válida." }, { status: 400 });
  }

  await savePushSubscription(leadId, { endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const token = cookies().get(CLIENT_SESSION_COOKIE)?.value;
  const leadId = verifySessionToken(token);
  if (!leadId) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { endpoint?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }
  if (!body.endpoint) return NextResponse.json({ ok: false, error: "Falta el endpoint." }, { status: 400 });

  await removePushSubscription(leadId, body.endpoint);
  return NextResponse.json({ ok: true });
}
