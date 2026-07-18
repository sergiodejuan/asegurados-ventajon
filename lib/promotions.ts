// Promociones ("/promociones" y "/promociones/[slug]"). Mismo patrón que el
// blog (lib/posts.ts): un documento JSON en el store, editable como un CMS
// desde /admin/promociones, con página padre (listado, 100% SEO) y páginas
// hija (una por promoción) al estilo de la referencia de Línea Directa.

export type Promotion = {
  id: string;
  slug: string;
  status: "publicado" | "borrador";
  categoria: string; // etiqueta pequeña / migas de pan, p.ej. "Seguro de coche"
  imagenUrl: string; // foto de cabecera: tarjeta del listado + hero de su propia página
  tituloTarjeta: string; // titular superpuesto a la foto en la tarjeta del listado
  h1: string; // titular superpuesto a la foto en el hero de su propia página
  validoHasta: string; // texto libre, p.ej. "Promoción válida hasta el 30/09/2026."
  subtitulo: string; // h2 debajo del hero, p.ej. "Obtén el mejor precio garantizado en tu Seguro de Coche."
  introParrafos: string[];
  bases: string[]; // lista de condiciones ("Bases:")
  ctaTexto: string; // botón principal de la tarjeta flotante, p.ej. "Calcula tu seguro"
  ctaHref: string; // p.ej. "/tarificador-auto"
  producto: string; // ramo, para el enlace de "Llamadme gratis" (?producto=); "" = genérico
  metaTitle: string;
  metaDescription: string;
  publishedAt: string; // yyyy-mm-dd
  updatedAt: string;
};

export type PromotionDraft = Partial<Omit<Promotion, "id" | "updatedAt">>;

const now = new Date().toISOString();

export const DEFAULT_PROMOTIONS: Promotion[] = [
  {
    id: "seed-mejor-precio-auto",
    slug: "mejor-precio-garantizado-seguro-de-coche",
    status: "publicado",
    categoria: "Seguro de coche",
    imagenUrl: "",
    tituloTarjeta: "Obtén el mejor precio garantizado en tu Seguro de Coche",
    h1: "Obtén el mejor precio garantizado",
    validoHasta: "Promoción válida hasta el 31/12/2026.",
    subtitulo: "Obtén con Asegurados Ventajon el mejor precio garantizado en tu Seguro de Coche.",
    introParrafos: [
      "Llega la renovación de tu seguro y un año más ha subido. En Asegurados Ventajon queremos ofrecerte el mejor precio garantizado en tu seguro de coche: si comparamos y el precio que te damos fuera superior al de tu compañía actual, nos comprometemos a igualarlo o mejorarlo.",
      "Así podrás disfrutar del mejor precio y las coberturas que mejor se adapten a tu vehículo, comparando siempre entre las principales aseguradoras del país, sin coste ni compromiso.",
    ],
    bases: [
      "Promoción válida hasta el 31/12/2026.",
      "Aplica a nuevas contrataciones de seguro de coche, comparando entre las aseguradoras con las que trabajamos.",
      "Para que proceda, deberás justificar el precio de renovación de tu compañía actual.",
      "Sujeto a normas de suscripción de cada compañía. Consulta condiciones con tu asesor.",
    ],
    ctaTexto: "Calcula tu seguro",
    ctaHref: "/tarificador-auto",
    producto: "auto",
    metaTitle: "Mejor precio garantizado en tu seguro de coche — Asegurados Ventajon",
    metaDescription: "Comparamos tu seguro de coche entre las principales aseguradoras y te garantizamos el mejor precio. Sin coste ni compromiso.",
    publishedAt: now.slice(0, 10),
    updatedAt: now,
  },
];

export function slugifyPromotionTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
