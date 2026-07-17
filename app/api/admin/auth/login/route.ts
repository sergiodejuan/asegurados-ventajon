import { NextResponse } from "next/server";
import { getAgentByEmail, touchAgentLogin, createAuditLog } from "@/lib/store";
import { verifyPassword, setAgentSessionCookie } from "@/lib/agentAuth";
import { toPublicAgent } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login propio de cada agente (email + contraseña). Coexiste con el
// ADMIN_TOKEN maestro, que sigue funcionando igual que siempre en la
// pantalla de acceso de /admin.
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body.email || !body.password) {
    return NextResponse.json({ ok: false, error: "Introduce tu email y contraseña." }, { status: 400 });
  }

  const agent = await getAgentByEmail(body.email);
  if (!agent || !agent.activo || !agent.passwordHash) {
    return NextResponse.json({ ok: false, error: "Email o contraseña incorrectos." }, { status: 401 });
  }
  const valid = await verifyPassword(body.password, agent.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  setAgentSessionCookie(agent.id);
  await touchAgentLogin(agent.id);
  await createAuditLog({
    agenteId: agent.id, agenteNombre: agent.nombre, action: "login", modulo: "auth",
    entidad: "agente", entidadId: agent.id, resumen: `${agent.nombre} ha iniciado sesión.`,
  });

  return NextResponse.json({ ok: true, agent: toPublicAgent(agent) });
}
