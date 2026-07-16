import { NextResponse } from "next/server";
import { findClientPresupuestos } from "@/lib/store";
import { presupuestoToClientQuote } from "@/lib/clientQuote";
import { setClientSessionCookie } from "@/lib/clientSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint público (sin token admin) para que un cliente recupere sus
// presupuestos desde cualquier dispositivo, identificándose con UN solo
// dato que solo él conoce: su correo, su móvil (con o sin +34) o su número
// de presupuesto. No se expone información interna del CRM (notas del
// agente, quién lo cerró, etc.). Al verificar correctamente, deja una
// sesión (cookie httpOnly) para que en próximas visitas desde ese mismo
// navegador no haga falta volver a identificarse.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const identifier = typeof body.identifier === "string" ? body.identifier.slice(0, 160) : "";
  if (!identifier.trim()) {
    return NextResponse.json({ ok: false, error: "Introduce tu correo, tu teléfono o tu número de presupuesto." }, { status: 400 });
  }

  const found = await findClientPresupuestos(identifier);
  if (!found) {
    return NextResponse.json({ ok: false, error: "No hemos encontrado ningún presupuesto con ese dato. Revisa que esté bien escrito." });
  }

  setClientSessionCookie(found.leadId);

  return NextResponse.json({ ok: true, presupuestos: found.presupuestos.map(presupuestoToClientQuote) });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
