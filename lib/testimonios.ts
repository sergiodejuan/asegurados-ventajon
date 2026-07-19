// Testimonios ("/testimonios" y "/testimonios/[slug]"): historias reales de
// clientes asegurados, contadas en formato scrollytelling (una página propia
// por historia, con foto destacada + galería repartida entre los capítulos
// del relato). Mismo patrón que promociones/blog: un documento JSON en el
// store, editable como un CMS desde /admin/testimonios.
//
// ⚠️ A diferencia de /promociones, aquí no hay semilla de ejemplo: publicar
// una "historia de cliente" inventada sería presentar una reseña falsa como
// real. La lista empieza vacía hasta que se cargue una historia real (con
// el consentimiento de la familia protagonista) desde el admin.

export type TestimonioCapitulo = { id: string; titulo: string; texto: string };

export type Testimonio = {
  id: string;
  slug: string;
  status: "publicado" | "borrador";
  nombre: string; // p.ej. "Familia Rodríguez" o "Marta y Javier"
  ubicacion: string; // p.ej. "Las Palmas de Gran Canaria"
  producto: string; // ramo relacionado (para el CTA/"Llamadme gratis"); "" = general
  resumen: string; // teaser de 1-2 líneas para la tarjeta del grid y meta descripción base
  cita: string; // frase destacada (pull-quote), opcional
  fotoDestacada: string; // hero de la página propia + tarjeta del grid
  galeria: string[]; // hasta 3 fotos, repartidas entre los capítulos del relato
  capitulos: TestimonioCapitulo[]; // narrativa por bloques (scrollytelling)
  ctaTexto: string;
  ctaHref: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string; // yyyy-mm-dd
  updatedAt: string;
};

export type TestimonioDraft = Partial<Omit<Testimonio, "id" | "updatedAt">>;

export const DEFAULT_TESTIMONIOS: Testimonio[] = [];

export function slugifyTestimonioTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

// UTM propio del testimonio para los CTA de su página (mismo criterio que
// withPromotionUtm en lib/promotions.ts): el UTM del testimonio siempre
// sobrescribe uno que ya trajera el href.
export function withTestimonioUtm(href: string, slug: string): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("utm_source", "testimonios");
  params.set("utm_medium", "testimonio");
  params.set("utm_campaign", `testimonio-${slug}`);
  return `${path}?${params.toString()}`;
}

export function makeCapituloId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
