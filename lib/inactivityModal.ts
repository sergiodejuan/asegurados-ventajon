// Modal de inactividad de la comparativa: si el usuario pasa N segundos sin
// interactuar (ratón, teclado, scroll, toque…) se le muestra un modal de
// re-enganche con una oferta y un CTA. Totalmente configurable desde
// /admin/marketing/modal-inactividad. Mismo patrón de almacenamiento que el
// exit-intent (lib/exitIntentCampaign.ts): un único documento singleton.

export type InactivityModalConfig = {
  // Interruptor general: si está desactivado, la comparativa no lo muestra.
  activo: boolean;
  // Segundos de inactividad antes de mostrarlo.
  segundos: number;
  // Veces que puede aparecer en una misma sesión de navegador (para no ser
  // insistente). 1 = solo una vez por sesión.
  maxPorSesion: number;
  // Imagen de fondo de la tarjeta: data URL (subida y comprimida en el admin)
  // o un enlace https:// externo. "" = sin imagen (fondo de color de marca).
  imagenUrl: string;
  // Textos, siguiendo la estructura de la tarjeta de referencia.
  eyebrow: string;      // pequeño rótulo sobre el precio, p.ej. "DESDE"
  titulo: string;       // p.ej. "Salud Especialistas"
  precioTexto: string;  // p.ej. "35 €/mes y sin copagos"
  descripcion: string;  // línea(s) de apoyo
  ctaTexto: string;     // texto del botón, p.ej. "Ver mi precio"
  ctaHref: string;      // destino del botón; "" = solo cierra el modal
  updatedAt: string;
};

export const DEFAULT_INACTIVITY_MODAL: InactivityModalConfig = {
  activo: false,
  segundos: 15,
  maxPorSesion: 1,
  imagenUrl: "",
  eyebrow: "DESDE",
  titulo: "Salud Especialistas",
  precioTexto: "35 €/mes y sin copagos",
  descripcion: "Acceso directo a consultas médicas y pruebas diagnósticas.",
  ctaTexto: "Ver mi precio",
  ctaHref: "/tarificador",
  updatedAt: "",
};

// Saneado + límites de los valores editables (se usa en el PATCH del admin).
export function clampInactivityModal(patch: Partial<InactivityModalConfig>): Partial<InactivityModalConfig> {
  const out: Partial<InactivityModalConfig> = { ...patch };
  if (typeof out.segundos === "number") out.segundos = Math.max(3, Math.min(600, Math.round(out.segundos)));
  if (typeof out.maxPorSesion === "number") out.maxPorSesion = Math.max(1, Math.min(10, Math.round(out.maxPorSesion)));
  const trim = (s: unknown, max: number) => (typeof s === "string" ? s.slice(0, max) : undefined);
  const eyebrow = trim(out.eyebrow, 40); if (eyebrow !== undefined) out.eyebrow = eyebrow;
  const titulo = trim(out.titulo, 120); if (titulo !== undefined) out.titulo = titulo;
  const precioTexto = trim(out.precioTexto, 120); if (precioTexto !== undefined) out.precioTexto = precioTexto;
  const descripcion = trim(out.descripcion, 400); if (descripcion !== undefined) out.descripcion = descripcion;
  const ctaTexto = trim(out.ctaTexto, 60); if (ctaTexto !== undefined) out.ctaTexto = ctaTexto;
  const ctaHref = trim(out.ctaHref, 400); if (ctaHref !== undefined) out.ctaHref = ctaHref;
  return out;
}
