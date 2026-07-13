// Banners de campaña de la home, editables desde /admin/campana. Ahora es un
// slide-show: varias diapositivas (imagen + precio + textos + CTA propios)
// con avance automático a un intervalo configurable. Se guarda como un único
// documento en el almacén (lib/store.ts), igual que el catálogo de productos.

export type CampaignSlide = {
  id: string;
  imageDataUrl: string; // data URL (subida y comprimida desde admin) o "" si no hay imagen
  price: string;
  headline: string;
  sub: string;
  ctaLabel: string;
  ctaHref: string;
  activo: boolean;
};

export type CampaignConfig = {
  slides: CampaignSlide[];
  intervalMs: number; // tiempo de avance automático entre diapositivas
  updatedAt: string;
};

export const DEFAULT_CAMPAIGN_CONFIG: CampaignConfig = {
  slides: [
    {
      id: "default",
      imageDataUrl: "",
      price: "Desde 35€/mes",
      headline: "Tu seguro de salud, en oferta",
      sub: "Comparamos entre las mejores compañías para que pagues lo justo este mes.",
      ctaLabel: "Calcula tu precio",
      ctaHref: "/tarificador",
      activo: true,
    },
  ],
  intervalMs: 6000,
  updatedAt: "",
};

export function makeSlideId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
