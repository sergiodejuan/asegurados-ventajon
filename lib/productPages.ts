// Contenido de las páginas de producto (una por seguro). Datos, no JSX, para
// que una sola plantilla (components/ProductLandingPage.tsx) renderice las
// cinco páginas de forma consistente.
//
// ⚠️ Los testimonios están marcados explícitamente como "de ejemplo" en la
// propia página (no se presentan como reseñas reales). Sustituir por
// reseñas reales (Google Business Profile, etc.) antes de publicar.

export type ProductSlug = "salud" | "vida" | "decesos" | "hogar" | "auto";

export type ProductPage = {
  slug: ProductSlug;
  path: string;
  metaTitle: string;
  metaDescription: string;
  badge: string;
  h1: string;
  subheadline: string;
  heroIcon: string;
  cta: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  benefits: { icon: string; t: string; d: string }[];
  coverage: { title: string; bullets: string[] };
  faq: { q: string; a: string }[];
  seo: { intro: string; sections: { h2: string; p: string }[] };
};

export const PRODUCT_PAGES: ProductPage[] = [
  {
    slug: "salud",
    path: "/seguro-de-salud",
    metaTitle: "Seguro de salud: compara precios con o sin copago | Ventajon",
    metaDescription: "Compara tu seguro de salud entre las mejores aseguradoras de España. Con o sin copago, cuadro médico amplio y hospitalización. Calcula tu precio gratis.",
    badge: "Seguro de salud",
    h1: "Seguro de salud al precio real de tu perfil, con o sin copago",
    subheadline: "Comparamos entre las aseguradoras de salud líderes del país para que elijas cuadro médico, hospitalización y coberturas sin pagar de más.",
    heroIcon: "shield",
    cta: { label: "Calcula tu precio", href: "/tarificador" },
    ctaSecondary: { label: "Que te llamen gratis", href: "/quiero-que-me-llamen?producto=salud" },
    benefits: [
      { icon: "shield", t: "Tu precio, no una tarifa genérica", d: "La edad y las personas a asegurar cambian mucho el precio; te lo calculamos con tus datos reales." },
      { icon: "compare", t: "Con o sin copago, tú decides", d: "Te explicamos la diferencia en euros al mes, no solo en teoría." },
      { icon: "doc", t: "Cuadro médico comparado", d: "Vemos qué especialistas y hospitales tiene cada compañía en tu zona." },
      { icon: "pin", t: "Cercanía en Canarias y Baleares", d: "Conocemos las particularidades de cobertura isla a isla." },
    ],
    coverage: {
      title: "Qué puede incluir tu seguro de salud",
      bullets: [
        "Hospitalización y cirugía sin listas de espera",
        "Amplio cuadro médico y especialistas",
        "Cobertura dental opcional",
        "Con copago o sin copago, según cuánto uses el médico",
        "Cobertura internacional en algunas pólizas",
      ],
    },
    faq: [
      { q: "¿Cuánto cuesta un seguro de salud?", a: "Depende de tu edad, del número de asegurados y de si eliges copago; te damos el precio exacto en menos de 2 minutos." },
      { q: "¿Qué diferencia hay entre un seguro con copago y sin copago?", a: "El copago es una cantidad fija que pagas cada vez que usas ciertos servicios a cambio de una cuota mensual más baja." },
      { q: "¿Hay periodo de carencia si cambio de compañía?", a: "Sí, algunas pruebas o especialistas pueden tener un plazo de espera al empezar una póliza nueva; te decimos cuál aplica antes de firmar." },
      { q: "¿Puedo cambiarme de compañía si ya tengo seguro de salud?", a: "Sí, en cualquier momento; comparamos tu situación actual sin coste." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No, comparar es siempre gratis y sin compromiso." },
    ],
    seo: {
      intro: "Elegir un seguro de salud a ciegas suele salir caro: la diferencia entre la primera oferta que recibes y la que de verdad encaja con tu perfil puede ser de decenas de euros de cuota. Como correduría, comparamos tu situación —edad, personas a asegurar, si quieres dental o cobertura internacional— entre varias aseguradoras y te explicamos en euros qué cambia entre con copago y sin copago.",
      sections: [
        { h2: "¿Copago o sin copago, qué me conviene?", p: "Si vas poco al médico, el copago suele bajar tu cuota mensual; si tienes hijos pequeños o visitas frecuentes, el sin copago compensa a medio plazo. Te lo calculamos con tu caso, no con una media genérica." },
        { h2: "¿Puedo cambiarme si ya tengo seguro de salud?", p: "Sí, y es el momento habitual en que más se ahorra: comparamos tu póliza actual con las alternativas del mercado y solo cambias si sale a cuenta." },
      ],
    },
  },
  {
    slug: "vida",
    path: "/seguro-de-vida",
    metaTitle: "Seguro de vida: compara precio según tu edad | Ventajon",
    metaDescription: "Compara tu seguro de vida entre las principales aseguradoras. Protege a tu familia y tu hipoteca desde una cuota ajustada a tu perfil. Sin compromiso.",
    badge: "Seguro de vida",
    h1: "Seguro de vida: protege a los tuyos sin pagar de más",
    subheadline: "Comparamos entre las aseguradoras de vida más solventes del país para encontrar el capital y la cuota que de verdad encajan contigo.",
    heroIcon: "life",
    cta: { label: "Calcula tu precio", href: "/tarificador-vida" },
    ctaSecondary: { label: "Que te llamen gratis", href: "/quiero-que-me-llamen?producto=vida" },
    benefits: [
      { icon: "shield", t: "Precio real, no tarifa de folleto", d: "Tu cuota depende sobre todo de tu edad y de si fumas; te lo calculamos sin adivinar." },
      { icon: "compare", t: "Capital ajustado a tu vida", d: "Hipoteca, hijos o ambos: el capital que necesitas cambia según tu situación." },
      { icon: "doc", t: "Sin letra pequeña en exclusiones", d: "Te decimos qué queda fuera de cobertura antes de firmar, no en el momento del siniestro." },
      { icon: "pin", t: "Cercanía en Canarias y Baleares", d: "Asesoramos por teléfono, sin necesidad de desplazarte." },
    ],
    coverage: {
      title: "Qué puede incluir tu seguro de vida",
      bullets: [
        "Fallecimiento e invalidez absoluta",
        "Enfermedades graves, como cobertura opcional",
        "Vinculación del capital a tu hipoteca",
        "Capital asegurado ajustado a tu situación familiar",
      ],
    },
    faq: [
      { q: "¿Cuánto cuesta un seguro de vida?", a: "Depende sobre todo de tu edad y de si fumas; te damos el precio exacto en menos de 2 minutos." },
      { q: "¿Necesito un seguro de vida si ya tengo hipoteca?", a: "Es recomendable: cubre que tu familia no herede la deuda si a ti te faltara, y muchos bancos lo piden o lo premian con mejor tipo de interés." },
      { q: "¿A partir de qué edad puedo contratarlo?", a: "Normalmente desde los 18 años, con límites de edad máxima que varían según la aseguradora." },
      { q: "¿Qué pasa si cambio de trabajo o de país?", a: "Depende de la póliza; te lo confirmamos con tu perfil antes de que decidas." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No, comparar es siempre gratis." },
    ],
    seo: {
      intro: "Un seguro de vida no es un gasto, es una garantía de que quienes dependen de ti no van a cargar con una hipoteca o una pérdida de ingresos si a ti te faltara. El precio varía mucho entre compañías para el mismo perfil, así que comparar antes de firmar suele suponer un ahorro real, no solo teórico.",
      sections: [
        { h2: "¿Cuánto capital debería asegurar?", p: "Una referencia habitual es entre 5 y 10 veces tus ingresos anuales, ajustado si tienes hipoteca pendiente o hijos a cargo. Te ayudamos a calcularlo según tu caso, sin sobrevenderte capital que no necesitas." },
        { h2: "¿Me obliga el banco a tener seguro de vida con la hipoteca?", p: "No por ley, aunque muchos bancos lo piden o lo bonifican. Comparamos si te compensa mantenerlo con el banco o vincularlo a una aseguradora distinta con mejor precio." },
      ],
    },
  },
  {
    slug: "decesos",
    path: "/seguro-de-decesos",
    metaTitle: "Seguro de decesos: compara coberturas y precio | Ventajon",
    metaDescription: "Compara tu seguro de decesos entre las mejores aseguradoras. Sepelio, traslado y gestión de trámites para tu familia. Sin tabúes, sin coste comparar.",
    badge: "Seguro de decesos",
    h1: "Seguro de decesos: que tu familia no tenga que gestionar nada",
    subheadline: "Comparamos entre las compañías de decesos más fiables para que, llegado el momento, todo esté resuelto sin trámites ni gastos inesperados.",
    heroIcon: "flower",
    cta: { label: "Calcula tu precio", href: "/tarificador-decesos" },
    ctaSecondary: { label: "Que te llamen gratis", href: "/quiero-que-me-llamen?producto=decesos" },
    benefits: [
      { icon: "shield", t: "Un tema delicado, sin prisas", d: "Te acompañamos con calma, no con técnicas de venta." },
      { icon: "compare", t: "Comparamos coberturas reales", d: "Sepelio, traslado, asistencia jurídica: vemos qué incluye cada póliza de verdad." },
      { icon: "doc", t: "Sin letra pequeña", d: "Te decimos qué gastos cubre el capital y cuáles no, antes de contratar." },
      { icon: "pin", t: "Cercanía en Canarias y Baleares", d: "Entendemos las particularidades de traslado entre islas y península." },
    ],
    coverage: {
      title: "Qué puede incluir tu seguro de decesos",
      bullets: [
        "Gastos de sepelio y ceremonia",
        "Traslado del fallecido, incluso desde el extranjero",
        "Gestión completa de trámites y papeleo",
        "Asistencia jurídica y psicológica para la familia",
        "Capital adicional en algunas pólizas",
      ],
    },
    faq: [
      { q: "¿Qué cubre exactamente un seguro de decesos?", a: "El sepelio, el traslado del fallecido y la gestión de trámites; algunas pólizas suman asistencia jurídica o psicológica para la familia." },
      { q: "¿Puedo contratarlo a cualquier edad?", a: "Sí, aunque el precio sube con la edad de contratación; empezar joven suele fijar una cuota más baja." },
      { q: "¿Es obligatorio el seguro de decesos?", a: "No por ley, pero evita que la familia adelante gastos y gestiones en un momento difícil." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No, comparar es siempre gratis y sin compromiso." },
    ],
    seo: {
      intro: "No es obligatorio por ley, pero es de los seguros que más se nota cuando falta: sin él, la familia tiene que adelantar dinero y gestionar trámites en los peores días. Comparamos entre varias compañías para que la cuota mensual sea baja y la cobertura, suficiente, sin sorpresas en el momento de usarla.",
      sections: [
        { h2: "¿A qué edad conviene contratarlo?", p: "Cuanto antes, más baja se queda la cuota fija; muchas pólizas la congelan si la contratas joven, aunque el precio del servicio suba con los años." },
        { h2: "¿Qué pasa si ya tengo decesos con otra aseguradora?", p: "Podemos comparar tu póliza actual y decirte si hay una alternativa con mejor cuota o cobertura, sin que tengas que cancelar nada hasta decidir tú." },
      ],
    },
  },
  {
    slug: "hogar",
    path: "/seguro-de-hogar",
    metaTitle: "Seguro de hogar: compara precio y coberturas | Ventajon",
    metaDescription: "Compara tu seguro de hogar entre las principales aseguradoras. Continente, contenido y responsabilidad civil al precio justo. Calcula gratis en 2 minutos.",
    badge: "Seguro de hogar",
    h1: "Seguro de hogar sin renunciar a cobertura por pagar menos",
    subheadline: "Comparamos entre las aseguradoras de hogar más solventes para proteger tu vivienda y lo que hay dentro, con el precio ajustado a tu caso.",
    heroIcon: "home",
    cta: { label: "Que te llamen gratis", href: "/quiero-que-me-llamen?producto=hogar" },
    ctaSecondary: { label: "Escríbenos por WhatsApp", href: "/quiero-que-me-llamen?producto=hogar" },
    benefits: [
      { icon: "shield", t: "Precio según tu vivienda real", d: "Ubicación, tamaño y uso (habitual, alquiler o segunda residencia) cambian mucho la cuota." },
      { icon: "compare", t: "Continente y contenido bien explicados", d: "Te decimos qué diferencia hay y cuánto necesitas asegurar de cada uno." },
      { icon: "doc", t: "Sin letra pequeña en exclusiones", d: "Agua, incendio, robo: revisamos qué queda fuera antes de firmar." },
      { icon: "pin", t: "Cercanía en Canarias y Baleares", d: "Conocemos los riesgos específicos de vivienda en zonas costeras e insulares." },
    ],
    coverage: {
      title: "Qué puede incluir tu seguro de hogar",
      bullets: [
        "Daños por agua, incendio y fenómenos atmosféricos",
        "Robo y expoliación",
        "Responsabilidad civil familiar",
        "Asistencia urgente en el hogar (fontanero, cerrajero, electricista)",
        "Continente y contenido",
      ],
    },
    faq: [
      { q: "¿Qué diferencia hay entre continente y contenido?", a: "El continente es la vivienda en sí; el contenido son tus muebles, electrodomésticos y objetos personales. Conviene asegurar bien ambos." },
      { q: "¿Es obligatorio el seguro de hogar?", a: "No por ley, aunque si tienes hipoteca el banco casi siempre exige un seguro de continente vinculado al préstamo." },
      { q: "¿Puedo cambiarme de aseguradora en cualquier momento?", a: "Sí, puedes cambiar al vencimiento de tu póliza o antes si hay motivo justificado; te decimos cuándo te conviene más." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No, comparar es siempre gratis y sin compromiso." },
    ],
    seo: {
      intro: "Tu vivienda suele ser tu inversión más grande, y el seguro de hogar es de los que menos se revisa una vez contratado: muchas pólizas suben cada año sin que cambie la cobertura. Comparamos tu póliza actual, si ya tienes una, frente a las alternativas del mercado para ver si te conviene seguir o cambiar.",
      sections: [
        { h2: "¿Es obligatorio el seguro de hogar?", p: "Por ley no, salvo que tengas hipoteca: en ese caso, el banco suele exigir al menos un seguro de continente vinculado al préstamo. Te ayudamos a separar lo que el banco exige de lo que realmente necesitas." },
        { h2: "¿Qué es continente y qué es contenido?", p: "El continente es la vivienda en sí (paredes, suelos, instalaciones fijas); el contenido son tus muebles, electrodomésticos y objetos personales. Es importante asegurar bien ambos para no quedarte corto en caso de siniestro." },
      ],
    },
  },
  {
    slug: "auto",
    path: "/seguro-de-auto",
    metaTitle: "Seguro de coche: compara terceros y todo riesgo | Ventajon",
    metaDescription: "Compara tu seguro de coche entre las principales aseguradoras. Terceros o todo riesgo, con o sin franquicia. Calcula tu precio gratis en 2 minutos.",
    badge: "Seguro de auto",
    h1: "Seguro de coche comparado por un experto, no por un algoritmo",
    subheadline: "Comparamos entre las aseguradoras de auto más competitivas para que elijas terceros o todo riesgo al precio justo para tu perfil.",
    heroIcon: "car",
    cta: { label: "Calcula tu precio", href: "/tarificador-auto" },
    ctaSecondary: { label: "Que te llamen gratis", href: "/quiero-que-me-llamen?producto=auto" },
    benefits: [
      { icon: "shield", t: "Precio según tu perfil real", d: "Edad, experiencia y siniestros pesan más que cualquier tarifa genérica; te lo calculamos con tus datos." },
      { icon: "compare", t: "Terceros o todo riesgo, bien explicado", d: "Te decimos qué cambia entre modalidades en euros, no solo en teoría." },
      { icon: "doc", t: "Franquicia a tu medida", d: "Vemos si te compensa una franquicia baja o alta según cuánto uses el coche." },
      { icon: "pin", t: "Cercanía en Canarias y Baleares", d: "Sabemos qué cambia en asistencia y coche de sustitución en las islas." },
    ],
    coverage: {
      title: "Qué puede incluir tu seguro de auto",
      bullets: [
        "Responsabilidad civil obligatoria",
        "Daños propios, en modalidad a todo riesgo",
        "Lunas y asistencia en carretera",
        "Coche de sustitución en talleres concertados",
        "Cobertura por robo e incendio",
      ],
    },
    faq: [
      { q: "¿Qué diferencia hay entre terceros y todo riesgo?", a: "Terceros cubre los daños que causas a otros; todo riesgo añade cobertura de tus propios daños, con o sin franquicia." },
      { q: "¿Cuánto cuesta un seguro de coche?", a: "Depende de tu edad, experiencia, historial de siniestros y el modelo del coche; te damos el precio exacto en menos de 2 minutos." },
      { q: "¿Puedo comparar si ya tengo seguro contratado?", a: "Sí, en cualquier momento, aunque lo habitual es hacerlo cerca de la renovación para evitar penalizaciones." },
      { q: "¿Qué es la franquicia y cómo elijo el importe?", a: "Es la cantidad que asumes tú en caso de siniestro antes de que pague la aseguradora; cuanto más alta, más baja suele ser tu cuota." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No, comparar es siempre gratis y sin compromiso." },
    ],
    seo: {
      intro: "Renovar el seguro del coche sin comparar es de las formas más habituales de pagar de más: muchas aseguradoras suben la prima cada año a los clientes que no revisan su póliza. Comparamos tu perfil —edad, años de carné, siniestros— entre varias compañías para encontrar el mejor precio en la modalidad que necesitas.",
      sections: [
        { h2: "¿Terceros o todo riesgo, qué me conviene?", p: "Si tu coche tiene más de 8-10 años o un valor bajo, terceros ampliado suele ser suficiente; si el coche es nuevo o tiene financiación, todo riesgo protege tu inversión frente a daños propios." },
        { h2: "¿Cómo afecta la franquicia al precio?", p: "Una franquicia más alta baja tu cuota mensual a cambio de asumir tú una parte del coste en caso de siniestro; te ayudamos a calcular el punto que más te compensa según cuánto conduces." },
      ],
    },
  },
];

export function getProductPage(slug: string): ProductPage | undefined {
  return PRODUCT_PAGES.find((p) => p.slug === slug);
}

// Enlace "directo a la acción" de un ramo: su tarificador si lo tiene
// (salud/vida/auto/decesos), o su propia página si no (hogar, que no
// tiene calculadora propia) — usado por el selector de seguros del CTA
// general y por el asistente, para no duplicar este criterio en cada sitio.
export function quoteHref(p: ProductPage): string {
  return p.cta.href.startsWith("/tarificador") ? p.cta.href : p.path;
}

// JSON-LD de las 5 páginas de producto: InsuranceAgency + Service (sin
// Offer/precio — por decisión de marca no se muestran precios cerrados,
// ver lib/brand.ts PROMO) + FAQPage con el FAQ ya visible en la página +
// BreadcrumbList. Mismo espíritu que buildJsonLd en lib/seoLandingPages.ts,
// adaptado a que aquí no hay un precio resuelto que anunciar.
export function buildProductJsonLd(page: ProductPage, brandName: string, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "InsuranceAgency",
        name: brandName,
        url: `${siteUrl}${page.path}`,
        description: page.metaDescription,
      },
      {
        "@type": "Service",
        name: page.badge,
        description: page.subheadline,
        provider: { "@type": "InsuranceAgency", name: brandName },
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
          { "@type": "ListItem", position: 2, name: page.badge, item: `${siteUrl}${page.path}` },
        ],
      },
    ],
  };
}
