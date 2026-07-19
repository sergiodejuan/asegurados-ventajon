// Testimonios ("/testimonios" y "/testimonios/[slug]"): historias reales de
// clientes asegurados, contadas en formato scrollytelling (una página propia
// por historia, con foto destacada + galería repartida entre los capítulos
// del relato). Mismo patrón que promociones/blog: un documento JSON en el
// store, editable como un CMS desde /admin/testimonios.
//
// ⚠️ A diferencia de /promociones, aquí NO hay historias publicadas de
// ejemplo: publicar una "historia de cliente" inventada como si fuera real
// sería una reseña falsa presentada como genuina (riesgo legal de
// competencia desleal, además de una falta de confianza hacia quien lee).
// Las 3 semillas de abajo son ilustrativas, quedan siempre en status
// "borrador" (nunca visibles en /testimonios ni en su propia página) y
// están pensadas como plantilla de formato/tono — sustitúyelas por casos
// reales, con el consentimiento de la familia protagonista, antes de
// cambiarles el estado a "publicado" desde /admin/testimonios.

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

const now = new Date().toISOString();

export const DEFAULT_TESTIMONIOS: Testimonio[] = [
  {
    id: "seed-familia-suarez-salud",
    slug: "familia-suarez",
    status: "borrador",
    nombre: "Familia Suárez",
    ubicacion: "Las Palmas de Gran Canaria",
    producto: "salud",
    resumen: "Después de un susto de salud, decidieron comparar y encontraron un seguro que de verdad se ajustaba a ellos.",
    cita: "Antes pagábamos un seguro sin saber muy bien qué cubría. Ahora sabemos exactamente con qué contamos.",
    fotoDestacada: "",
    galeria: [],
    capitulos: [
      {
        id: "suarez-1", titulo: "Un aviso que lo cambió todo",
        texto: "Llevaban años con el mismo seguro de salud, contratado casi sin pensarlo cuando nació su primer hijo.\n\nUn ingreso hospitalario inesperado les hizo darse cuenta de que no tenían tan claro como creían qué cubría su póliza ni cuánto les iba a suponer.",
      },
      {
        id: "suarez-2", titulo: "Comparar sin prisas",
        texto: "Se pusieron en contacto con Asegurados Ventajon para comparar opciones. Un asesor les explicó la diferencia entre modalidades con y sin copago, y les ayudó a ver qué encajaba mejor con cómo usaban realmente la sanidad privada.\n\nNo hubo prisa ni presión: pudieron comparar varias compañías con calma antes de decidir.",
      },
      {
        id: "suarez-3", titulo: "La tranquilidad de hoy",
        texto: "Hoy tienen un seguro que entienden de verdad, con un precio ajustado a su situación real. Y, sobre todo, la tranquilidad de saber exactamente qué pasaría si algo similar volviera a ocurrir.",
      },
    ],
    ctaTexto: "Calcula tu precio",
    ctaHref: "/tarificador",
    metaTitle: "Familia Suárez: su historia con el seguro de salud — Asegurados Ventajon",
    metaDescription: "Cómo la familia Suárez, en Las Palmas de Gran Canaria, encontró un seguro de salud que de verdad entendían y se ajustaba a ellos.",
    publishedAt: now.slice(0, 10),
    updatedAt: now,
  },
  {
    id: "seed-marta-y-nico-vida",
    slug: "marta-y-nico",
    status: "borrador",
    nombre: "Marta y Nico",
    ubicacion: "Palma de Mallorca",
    producto: "vida",
    resumen: "Al convertirse en padres, quisieron asegurarse de que su hija estaría protegida pasara lo que pasara.",
    cita: "Queríamos que, decidiera lo que decidiera la vida, ella nunca se quedara desprotegida.",
    fotoDestacada: "",
    galeria: [],
    capitulos: [
      {
        id: "martanico-1", titulo: "La llegada de su hija",
        texto: "Cuando nació su hija, Marta y Nico empezaron a mirar con otros ojos cosas en las que antes no pensaban demasiado: entre ellas, qué pasaría con la hipoteca y con su hija si a alguno de los dos le faltara.",
      },
      {
        id: "martanico-2", titulo: "Una decisión meditada, no impulsiva",
        texto: "No querían contratar el primer seguro de vida que les ofrecieran. Compararon capital asegurado, coberturas y precio entre varias aseguradoras, con la ayuda de un asesor que les explicó cada opción sin tecnicismos.\n\nAl final, eligieron la que mejor cubría tanto la hipoteca como el día a día de la familia.",
      },
      {
        id: "martanico-3", titulo: "Un peso menos",
        texto: "Ahora saben que, pase lo que pase, su hija y la casa donde crece están cubiertas. Fue una conversación incómoda de tener, pero se alegran de haberla tenido.",
      },
    ],
    ctaTexto: "Calcula tu precio",
    ctaHref: "/tarificador-vida",
    metaTitle: "Marta y Nico: su historia con el seguro de vida — Asegurados Ventajon",
    metaDescription: "Cómo Marta y Nico, en Palma de Mallorca, decidieron proteger a su hija y su hipoteca con un seguro de vida a su medida.",
    publishedAt: now.slice(0, 10),
    updatedAt: now,
  },
  {
    id: "seed-familia-hernandez-decesos",
    slug: "familia-hernandez",
    status: "borrador",
    nombre: "Familia Hernández",
    ubicacion: "Santa Cruz de Tenerife",
    producto: "decesos",
    resumen: "Hablar de decesos no es fácil, pero dejarlo resuelto les quitó un peso de encima a toda la familia.",
    cita: "No queríamos que nuestros hijos tuvieran que preocuparse de nada en un momento así.",
    fotoDestacada: "",
    galeria: [],
    capitulos: [
      {
        id: "hernandez-1", titulo: "Una conversación pendiente",
        texto: "Después de acompañar a un familiar cercano en un momento difícil, la familia Hernández se dio cuenta de cuánto ayuda tenerlo todo resuelto de antemano, y cuánto complica las cosas no tenerlo.",
      },
      {
        id: "hernandez-2", titulo: "Sin tabúes, con calma",
        texto: "Contactaron con Asegurados Ventajon para comparar opciones de seguro de decesos para toda la familia. Nadie les metió prisa: pudieron preguntar todo lo que necesitaban, sin sentirse incómodos por el tema.",
      },
      {
        id: "hernandez-3", titulo: "Resuelto, para todos",
        texto: "Hoy toda la familia está cubierta con la misma póliza. Sienten que le han quitado a sus hijos una carga que ellos mismos conocen bien: la de tener que organizarlo todo en el peor momento.",
      },
    ],
    ctaTexto: "Calcula tu precio",
    ctaHref: "/tarificador-decesos",
    metaTitle: "Familia Hernández: su historia con el seguro de decesos — Asegurados Ventajon",
    metaDescription: "Cómo la familia Hernández, en Santa Cruz de Tenerife, resolvió su seguro de decesos para toda la familia, sin tabúes.",
    publishedAt: now.slice(0, 10),
    updatedAt: now,
  },
];

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
