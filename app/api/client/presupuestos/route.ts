import { NextResponse } from "next/server";
import { findClientPresupuestos } from "@/lib/store";
import { presupuestoToClientQuote } from "@/lib/clientQuote";
import { setClientSessionCookie } from "@/lib/clientSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint público (sin token admin) para que un cliente recupere sus
// presupuestos desde cualquier dispositivo, identificándose con tres datos
// que solo él conoce: el número de presupuesto (id único y corto), el
// correo y el teléfono usados al tarificar. No se expone información
// interna del CRM (notas del agente, quién lo cerró, etc.). Al verificar
// correctamente, deja una sesión (cookie httpOnly) para que en próximas
// visitas desde ese mismo navegador no haga falta volver a identificarse.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const codigo = typeof body.codigo === "string" ? body.codigo.slice(0, 20) : "";
  const email = typeof body.email === "string" ? body.email.slice(0, 160) : "";
  const telefono = typeof body.telefono === "string" ? body.telefono.slice(0, 20) : "";

  if (!codigo.trim() || !email.trim() || !telefono.trim()) {
    return NextResponse.json({ ok: false, error: "Faltan datos: número de presupuesto, correo y teléfono." }, { status: 400 });
  }

  const presupuestos = await findClientPresupuestos({ codigo, email, telefono });
  if (!presupuestos || !presupuestos.length) {
    return NextResponse.json({ ok: false, error: "No encontramos ningún presupuesto con esos datos. Revisa el número, el correo y el teléfono." });
  }

  setClientSessionCookie(presupuestos[0].leadId);

  return NextResponse.json({ ok: true, presupuestos: presupuestos.map(presupuestoToClientQuote) });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
