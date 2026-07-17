import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAgent } from "./store";
import { hasPermission, type Agent, type AdminModule } from "./crm";
export { hashPassword, verifyPassword } from "./password";

export const AGENT_SESSION_COOKIE = "ventajon_agent_session";
const AGENT_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_TOKEN || "ventajon-dev-secret-change-me";
}
function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

/* -------------------------------- Sesión --------------------------------- */

export function createAgentSessionToken(agentId: string): string {
  const expires = Date.now() + AGENT_SESSION_MAX_AGE * 1000;
  const payload = `${agentId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}
export function verifyAgentSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [agentId, expiresStr, sig] = parts;
  const payload = `${agentId}.${expiresStr}`;
  let expected: string;
  try { expected = sign(payload); } catch { return null; }
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;
  return agentId;
}
export function setAgentSessionCookie(agentId: string): void {
  cookies().set(AGENT_SESSION_COOKIE, createAgentSessionToken(agentId), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: AGENT_SESSION_MAX_AGE,
  });
}
export function clearAgentSessionCookie(): void {
  cookies().set(AGENT_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/* ------------------------ Resolución de identidad ------------------------ */
// Dos formas de entrar, coexistiendo:
//  1. ADMIN_TOKEN (acceso maestro heredado): igual que siempre, nunca se
//     puede quedar el equipo sin poder entrar al panel aunque no haya
//     todavía ningún agente dado de alta.
//  2. Sesión de agente (email + contraseña, propia de cada persona): además
//     de identificar quién hace cada acción, aplica sus permisos modulares.

export type ResolvedIdentity =
  | { kind: "master"; agentId: string; agentNombre: string }
  | { kind: "agent"; agentId: string; agentNombre: string; agent: Agent };

export async function resolveIdentity(request: Request): Promise<ResolvedIdentity | null> {
  const masterSecret = process.env.ADMIN_TOKEN;
  const token = request.headers.get("x-admin-token") || new URL(request.url).searchParams.get("token");
  if (masterSecret && token === masterSecret) {
    return { kind: "master", agentId: "master", agentNombre: "Admin" };
  }
  const sessionToken = cookies().get(AGENT_SESSION_COOKIE)?.value;
  const agentId = verifyAgentSessionToken(sessionToken);
  if (!agentId) return null;
  const agent = await getAgent(agentId);
  if (!agent || !agent.activo) return null;
  return { kind: "agent", agentId: agent.id, agentNombre: agent.nombre, agent };
}

// Guarda de autenticación + permisos para las rutas /api/admin/*. Sustituye
// a adminAuthFail: además de autenticar, resuelve QUIÉN hace la acción (para
// poder atribuirla) y comprueba que tiene acceso al módulo.
export async function requireModule(request: Request, modulo: AdminModule): Promise<
  { ok: true; agentId: string; agentNombre: string } | { ok: false; response: NextResponse }
> {
  if (!process.env.ADMIN_TOKEN) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Configura ADMIN_TOKEN en las variables de entorno." }, { status: 503 }) };
  }
  const identity = await resolveIdentity(request);
  if (!identity) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 }) };
  }
  if (identity.kind === "agent" && !hasPermission(identity.agent, modulo)) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "No tienes permiso para acceder a esta sección." }, { status: 403 }) };
  }
  return { ok: true, agentId: identity.agentId, agentNombre: identity.agentNombre };
}

// Gestionar agentes y permisos es sensible (un agente podría, si no, darse a
// sí mismo más acceso): a propósito NO se controla por el módulo "agentes"
// de la lista de permisos de cada uno, sino exclusivamente por rol "admin"
// (o el ADMIN_TOKEN maestro), sin excepciones.
export async function requireAdminRole(request: Request): Promise<
  { ok: true; agentId: string; agentNombre: string } | { ok: false; response: NextResponse }
> {
  if (!process.env.ADMIN_TOKEN) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Configura ADMIN_TOKEN en las variables de entorno." }, { status: 503 }) };
  }
  const identity = await resolveIdentity(request);
  if (!identity) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 }) };
  }
  if (identity.kind === "agent" && identity.agent.rol !== "admin") {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Solo un administrador puede gestionar agentes y permisos." }, { status: 403 }) };
  }
  return { ok: true, agentId: identity.agentId, agentNombre: identity.agentNombre };
}
