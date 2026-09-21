import { SOURCE_LABELS } from "./crm";

// Configuración de avisos al equipo cuando entra un lead a la web.
// Un único documento en KV — un solo "responsable de guardia" gestiona toda
// la bandeja: no hace falta granularidad por agente aquí, para eso ya está
// la asignación de leads en el CRM.

export type TeamNotificationChannelConfig = {
  enabled: boolean;
  // Qué origins disparan aviso. Lista vacía [] = todos los origins.
  sources: string[];
  // Extra: no avisar si el lead llegó SIN casilla comercial marcada — evita
  // ruido en pruebas y en formularios legacy sin consentimiento.
  soloConComercial: boolean;
};

export type TeamNotificationsConfig = {
  version: 1;
  email: TeamNotificationChannelConfig & {
    // Destinatarios (uno por línea en el editor). Un correo → todo el equipo
    // suele preferir un alias tipo comercial@… al que ellos mismos redirigen.
    recipients: string[];
  };
  push: TeamNotificationChannelConfig;
  updatedAt: string;
};

export const DEFAULT_TEAM_NOTIFICATIONS: TeamNotificationsConfig = {
  version: 1,
  email: {
    enabled: false,
    recipients: [],
    sources: [],
    soloConComercial: false,
  },
  push: {
    enabled: false,
    sources: [],
    soloConComercial: false,
  },
  updatedAt: "",
};

// Utilidad compartida por el helper de envío y por el editor admin: decide si
// una entrada de lead debe disparar aviso por este canal según la configuración.
export function shouldNotify(cfg: TeamNotificationChannelConfig, ctx: { source: string; aceptaComercial?: boolean }): boolean {
  if (!cfg.enabled) return false;
  if (cfg.soloConComercial && !ctx.aceptaComercial) return false;
  if (cfg.sources.length > 0 && !cfg.sources.includes(ctx.source)) return false;
  return true;
}

// Etiquetas para el editor admin — reutiliza SOURCE_LABELS de crm.ts para
// que las opciones coincidan siempre con las fuentes reales del sistema.
export function availableSourceOptions(): { value: string; label: string }[] {
  return Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }));
}
