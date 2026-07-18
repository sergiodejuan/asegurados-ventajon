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
  // Si la promoción ya tiene su propia landing en la web (p.ej. "/mes-gratis"),
  // indícalo aquí: la tarjeta del listado enlaza directamente ahí y su página
  // en /promociones/[slug] redirige a esa URL, en vez de generar una página
  // propia genérica y duplicar contenido. "" = usa su propia página.
  linkExterno: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string; // yyyy-mm-dd
  // Fecha de fin (yyyy-mm-dd), opcional: pasada esa fecha, la promoción deja
  // de mostrarse en el listado y en su propia página sin tener que editarla
  // ni cambiar su estado a mano. "" = no caduca.
  finPromocion: string;
  updatedAt: string;
};

export type PromotionDraft = Partial<Omit<Promotion, "id" | "updatedAt">>;

// Activa = publicada y (sin fecha de fin, o todavía no ha llegado). Se usa
// tanto para el listado público como para la página propia de cada
// promoción, así la caducidad automática es consistente en toda la web.
export function isPromotionActive(promo: Pick<Promotion, "status" | "finPromocion">, today = new Date().toISOString().slice(0, 10)): boolean {
  if (promo.status !== "publicado") return false;
  if (promo.finPromocion && promo.finPromocion < today) return false;
  return true;
}

// UTM automático por promoción (no hace falta escribirlo a mano ni en las
// promociones actuales ni en las que se creen luego): utm_campaign se
// deriva siempre del slug, con el prefijo "promo-" para poder distinguir en
// el lead de qué promoción concreta vino (ver promotionSourceFromUtm).
export function promotionUtmCampaign(slug: string): string {
  return `promo-${slug}`;
}

// Si el propio ctaHref ya trae un UTM suyo (p.ej. el de "1 mes gratis", que
// arrastra una campaña antigua propia) se sobrescribe, no se concatena: el
// UTM de la promoción debe ganar siempre para que promotionSourceFromUtm
// pueda leerlo (URLSearchParams.get() solo devuelve la primera aparición de
// cada parámetro, así que dos utm_campaign en la misma URL sería un bug).
export function withPromotionUtm(href: string, slug: string): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("utm_source", "promociones");
  params.set("utm_medium", "promocion");
  params.set("utm_campaign", promotionUtmCampaign(slug));
  return `${path}?${params.toString()}`;
}

// Si el envío llega con el utm_campaign que generan las promociones, esa es
// la fuente que se guarda en la ficha del lead (en vez del origen genérico
// del tarificador/formulario), para saber de qué promoción concreta vino.
export function promotionSourceFromUtm(utm: { campaign?: string } | null | undefined): string | null {
  const campaign = utm?.campaign;
  return campaign && campaign.startsWith("promo-") ? campaign : null;
}

const now = new Date().toISOString();

export const DEFAULT_PROMOTIONS: Promotion[] = [
  {
    // Campaña anual insignia de salud: tarjeta regalo de 20 € por cada
    // nuevo asegurado, pensada para las renovaciones con efecto a inicio de
    // año. Se apaga sola el 31/12 gracias a finPromocion, sin tocar nada.
    id: "seed-tarjeta-regalo-salud-2027",
    slug: "20-euros-nuevo-asegurado-salud",
    status: "publicado",
    categoria: "Seguro de salud",
    imagenUrl: "",
    tituloTarjeta: "20 € en tarjeta regalo por cada nuevo asegurado de salud",
    h1: "20 € de regalo por cada nuevo asegurado",
    validoHasta: "Campaña válida del 1 de octubre al 31 de diciembre de 2026.",
    subtitulo: "La campaña anual de seguro de salud de Asegurados Ventajon: 20 € en tarjeta regalo por cada nuevo asegurado.",
    introParrafos: [
      "Nuestra campaña más importante del año: si contratas o renuevas tu seguro de salud con Asegurados Ventajon entre el 1 de octubre y el 31 de diciembre de 2026, con fecha de efecto a partir del 1 de enero de 2027, te regalamos una tarjeta regalo de 20 € por cada nueva persona asegurada en tu póliza.",
      "Comparamos entre las principales aseguradoras del país para encontrar la póliza que mejor se ajuste a ti y a quienes quieras asegurar contigo, sin coste ni compromiso, y nos encargamos de toda la gestión de la renovación.",
    ],
    bases: [
      "Campaña válida del 1 de octubre al 31 de diciembre de 2026, para pólizas de seguro de salud con fecha de efecto a partir del 1 de enero de 2027.",
      "Aplica a nuevas contrataciones y a renovaciones de póliza anual de seguro de salud formalizadas a través de Asegurados Ventajon durante el periodo de la campaña.",
      "Se entrega una tarjeta regalo de 20 € por cada persona asegurada de nueva incorporación en la póliza contratada; si se aseguran varias personas nuevas en la misma póliza (por ejemplo, una unidad familiar), la tarjeta regalo se entrega por cada una de ellas.",
      "La tarjeta regalo se entrega una vez formalizada la póliza, superado el cuestionario de salud y demás condiciones de suscripción de la aseguradora elegida, y siempre que la póliza continúe en vigor transcurrido el primer mes desde su fecha de efecto.",
      "No acumulable con otras promociones o campañas comerciales vigentes de Asegurados Ventajon; se aplica la que resulte más beneficiosa para el cliente.",
      "Sujeta a las normas de suscripción de cada compañía aseguradora. Tu asesor te confirma las condiciones exactas antes de firmar nada.",
      "La entrega de la tarjeta regalo se realiza conforme a la normativa fiscal vigente en el momento de la entrega.",
    ],
    ctaTexto: "Calcula tu seguro de salud",
    ctaHref: "/tarificador",
    producto: "salud",
    linkExterno: "",
    metaTitle: "20 € de regalo por cada nuevo asegurado de salud — Asegurados Ventajon",
    metaDescription: "Del 1 de octubre al 31 de diciembre, te regalamos una tarjeta de 20 € por cada nuevo asegurado en tu seguro de salud. Renovaciones con efecto desde enero de 2027.",
    publishedAt: now.slice(0, 10),
    finPromocion: "2026-12-31",
    updatedAt: now,
  },
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
    linkExterno: "",
    metaTitle: "Mejor precio garantizado en tu seguro de coche — Asegurados Ventajon",
    metaDescription: "Comparamos tu seguro de coche entre las principales aseguradoras y te garantizamos el mejor precio. Sin coste ni compromiso.",
    publishedAt: now.slice(0, 10),
    finPromocion: "2026-12-31",
    updatedAt: now,
  },
  {
    id: "seed-mes-gratis-salud",
    slug: "mes-gratis-seguro-de-salud",
    status: "publicado",
    categoria: "Seguro de salud",
    imagenUrl: "",
    tituloTarjeta: "1 mes gratis en tu seguro de salud",
    h1: "1 mes gratis en tu seguro de salud",
    validoHasta: "",
    subtitulo: "1 mes gratis en tu seguro de salud, comparando entre las mejores aseguradoras",
    introParrafos: [
      "Contrata tu seguro de salud nuevo a través de Asegurados Ventajon y te regalamos el importe de tu primera mensualidad: comparamos entre las principales aseguradoras del país para encontrar la póliza que mejor se ajuste a ti, sin coste ni compromiso.",
      "La bonificación se aplica directamente sobre tu primera factura una vez formalizada la póliza, sin pasos extra ni letra pequeña: tu asesor se encarga de toda la gestión por ti.",
    ],
    bases: [
      "Promoción válida para nuevas contrataciones de seguro de salud formalizadas a través de Asegurados Ventajon; no es válida para renovaciones, traspasos de póliza ya existente ni pólizas en trámite antes del inicio de la promoción.",
      "El descuento equivale al importe de una mensualidad de la póliza contratada y se aplica sobre la primera factura una vez formalizada la contratación.",
      "Debes ser mayor de edad y residente en España, y superar el cuestionario de salud y demás condiciones de suscripción de la aseguradora elegida.",
      "Aplica a las aseguradoras de salud incluidas en el catálogo vigente de Asegurados Ventajon en el momento de la contratación; tu asesor te confirma cuáles participan antes de firmar nada.",
      "No acumulable con otras promociones o campañas comerciales vigentes de Asegurados Ventajon; se aplica la que resulte más beneficiosa para el cliente.",
    ],
    ctaTexto: "Quiero mi mes gratis",
    ctaHref: "/tarificador?utm_source=campana&utm_medium=landing&utm_campaign=mes-gratis-salud",
    producto: "salud",
    linkExterno: "",
    metaTitle: "1 mes gratis en tu seguro de salud — Asegurados Ventajon",
    metaDescription: "Contrata ahora tu seguro de salud y te regalamos 1 mes. Compara gratis entre las mejores aseguradoras, sin compromiso.",
    publishedAt: now.slice(0, 10),
    finPromocion: "",
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
