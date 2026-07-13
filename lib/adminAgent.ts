// Identidad ligera del agente que usa el panel admin: un nombre libre
// guardado en localStorage (no hay login por agente, sigue compartiéndose
// un único ADMIN_TOKEN). Sirve para atribuir notas, contactos y cierres de
// presupuesto a una persona, y así poder construir el ranking de agentes en
// /admin/informes.

const AGENT_KEY = "ventajon:admin:agent";

export function getAgentName(): string {
  try { return localStorage.getItem(AGENT_KEY) ?? ""; } catch { return ""; }
}

export function setAgentName(name: string) {
  try { localStorage.setItem(AGENT_KEY, name.trim()); } catch { /* localStorage no disponible */ }
}
