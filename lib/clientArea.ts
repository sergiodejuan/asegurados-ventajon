import type { QuoteProfile } from "./quote";

// "Sección de clientes" sin registro: todo vive en localStorage del propio
// navegador (persiste entre sesiones, a diferencia de sessionStorage que se
// usa para el perfil "activo" del tarificador). Sirve para recuperar
// presupuestos ya calculados y para no volver a pedir los datos de contacto
// en visitas futuras.

export type ClientProfile = {
  nombre?: string;
  telefono?: string;
  email?: string;
  diaLlamada?: string;
  turnoLlamada?: string;
};

const PROFILE_KEY = "ventajon:clientProfile";
const QUOTES_KEY = "ventajon:clientQuotes";
const MAX_QUOTES = 20;

export function saveClientProfile(patch: ClientProfile) {
  try {
    const current = loadClientProfile() ?? {};
    const next: ClientProfile = { ...current, ...patch };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch { /* localStorage no disponible */ }
}

export function loadClientProfile(): ClientProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as ClientProfile) : null;
  } catch {
    return null;
  }
}

export function addClientQuote(q: QuoteProfile) {
  try {
    const list = loadClientQuotes();
    const next = [q, ...list.filter((x) => x.id !== q.id)].slice(0, MAX_QUOTES);
    localStorage.setItem(QUOTES_KEY, JSON.stringify(next));
  } catch { /* localStorage no disponible */ }
}

export function loadClientQuotes(): QuoteProfile[] {
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    return raw ? (JSON.parse(raw) as QuoteProfile[]) : [];
  } catch {
    return [];
  }
}

export function removeClientQuote(id: string) {
  try {
    const next = loadClientQuotes().filter((q) => q.id !== id);
    localStorage.setItem(QUOTES_KEY, JSON.stringify(next));
  } catch { /* localStorage no disponible */ }
}
