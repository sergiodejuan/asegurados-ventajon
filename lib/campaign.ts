// Banner de campaña editable desde /admin/campana (imagen + precio + textos).
// Se guarda como un único documento en el almacén (lib/store.ts), igual que
// el catálogo de productos.

export type CampaignBanner = {
  imageDataUrl: string; // data URL (subida y comprimida desde admin) o "" si no hay imagen
  price: string;
  headline: string;
  sub: string;
  ctaLabel: string;
  ctaHref: string;
  updatedAt: string;
};

export const DEFAULT_CAMPAIGN_BANNER: CampaignBanner = {
  imageDataUrl: "",
  price: "Desde 35€/mes",
  headline: "Tu seguro de salud, en oferta",
  sub: "Comparamos entre las mejores compañías para que pagues lo justo este mes.",
  ctaLabel: "Calcula tu precio",
  ctaHref: "/tarificador",
  updatedAt: "",
};
