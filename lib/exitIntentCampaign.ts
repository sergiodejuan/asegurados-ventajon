// Exit-intent de la web general (home, landings, blog...), editable desde
// /admin/exit-intents — NO se muestra dentro de los tarificadores ni de la
// comparativa ni del formulario "quiero que me llamen", que ya tienen su
// propio exit-intent independiente (ver components/ExitIntentModal.tsx).
// Mismo patrón de almacenamiento que lib/campaign.ts: un único documento con
// una lista de campañas, para poder tener varias (una por producto, por
// ejemplo) y activar/desactivar cada una sin perder las demás.

export type ExitIntentCampaign = {
  id: string;
  nombre: string; // identificador interno (solo se ve en el admin, no en la web)
  activo: boolean;
  orden: number; // si hay varias activas a la vez, se muestra la de menor orden
  // Imagen superior: subida (data URL, comprimida por el admin) o un enlace
  // https:// externo — para no engordar la web con imágenes propias si no
  // hace falta. "" = sin foto (se usa el icono de abajo en su lugar, si lo hay).
  imagenUrl: string;
  iconName: string; // uno de components/icons.tsx (IconByName); "" = ninguno
  colorPanel: "navy" | "red";
  titulo: string;
  ctaTexto: string;
  ctaHref: string;
  // El enlace secundario se compone de un prefijo en texto plano + la parte
  // subrayada que es el link — igual que "Si lo prefieres, te llamamos
  // gratis" en la referencia. Deja ambos en "" para no mostrar esta línea.
  ctaSecundarioPrefijo: string;
  ctaSecundarioTexto: string;
  ctaSecundarioHref: string;
  maxPorSesion: number; // veces que puede llegar a aparecer en una misma sesión de navegador
};

export type ExitIntentConfig = {
  campaigns: ExitIntentCampaign[];
  updatedAt: string;
};

export const DEFAULT_EXIT_INTENT_CONFIG: ExitIntentConfig = {
  campaigns: [
    {
      id: "default",
      nombre: "Salud — genérico",
      activo: true,
      orden: 1,
      imagenUrl: "",
      iconName: "flower",
      colorPanel: "red",
      titulo: "Tu seguro de salud desde 19,90 €/mes y sin copagos",
      ctaTexto: "Calcula tu precio",
      ctaHref: "/tarificador",
      ctaSecundarioPrefijo: "Si lo prefieres, ",
      ctaSecundarioTexto: "te llamamos gratis",
      ctaSecundarioHref: "/quiero-que-me-llamen",
      maxPorSesion: 1,
    },
  ],
  updatedAt: "",
};

export function makeExitIntentId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
