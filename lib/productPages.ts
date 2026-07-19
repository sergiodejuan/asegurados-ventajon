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

const TESTIMONIALS_NOTE =
  "Reseñas de ejemplo mientras recopilamos las de nuestros clientes reales — dinos si prefieres esperar a tenerlas antes de publicar esta sección.";

export const TESTIMONIALS_PLACEHOLDER_NOTE = TESTIMONIALS_NOTE;

export const PRODUCT_PAGES: ProductPage[] = [
  {
    slug: "salud",
    path: "/seguro-de-salud",
    metaTitle: "Seguro de salud: compara y ahorra — Asegurados Ventajon",
    metaDescription: "Comparamos tu seguro de salud entre las mejores compañías para que pagues lo justo. Sin trucos, sin letra pequeña. Comparativa gratuita.",
    badge: "Seguro de salud",
    h1: "Seguro de salud a tu medida, comparado por un experto",
    subheadline: "Comparamos entre las mejores compañías de salud para que pagues lo justo, con o sin copago. Sin trucos, sin letra pequeña.",
    heroIcon: "shield",
    cta: { label: "Calcula tu precio", href: "/tarificador" },
    ctaSecondary: { label: "Que te llamen gratis", href: "/quiero-que-me-llamen?producto=salud" },
    benefits: [
      { icon: "shield", t: "De tu lado", d: "Somos tu asesor, no el vendedor de la compañía." },
      { icon: "compare", t: "Comparamos por ti", d: "Entre las mejores aseguradoras de salud del país." },
      { icon: "doc", t: "Sin letra pequeña", d: "Te explicamos lo que cubre y lo que no, en claro." },
      { icon: "pin", t: "Cerca de ti", d: "Trabajamos en toda España, con cercanía especial en Canarias y Baleares." },
    ],
    coverage: {
      title: "Qué puede incluir tu seguro de salud",
      bullets: [
        "Hospitalización y cirugía sin listas de espera",
        "Amplio cuadro médico y especialistas",
        "Cobertura dental disponible como opción",
        "Con copago o sin copago: tú eliges según cuánto uses el médico",
        "Cobertura internacional en algunas pólizas",
      ],
    },
    faq: [
      { q: "¿Cuánto cuesta un seguro de salud?", a: "Depende del perfil: edad, número de asegurados, si incluye dental o cobertura internacional, y si es con o sin copago. Calculamos tu precio real con el formulario de arriba en un minuto." },
      { q: "¿Qué diferencia hay entre un seguro con copago y sin copago?", a: "Con copago, la prima mensual es más baja pero pagas una pequeña cantidad cada vez que usas el médico. Sin copago, la prima es algo más alta pero no pagas nada extra. Te ayudamos a calcular cuál compensa según tu uso." },
      { q: "¿Puedo cambiarme de compañía si ya tengo seguro de salud?", a: "Sí. Cuéntanos qué tienes contratado ahora (precio y servicios incluidos) y lo comparamos con las alternativas para ver si te conviene cambiar." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No. La comparativa y el asesoramiento son gratuitos y sin compromiso de contratación." },
    ],
    seo: {
      intro: "Contratar un seguro de salud a ciegas, con el primero que te ofrezcan, suele salir caro. Asegurados Ventajon es una correduría de seguros: comparamos tu perfil entre varias compañías y te ayudamos a elegir la póliza que de verdad se ajusta a lo que necesitas, no la que más comisión deja.",
      sections: [
        { h2: "¿Qué influye en el precio de un seguro de salud?", p: "La edad y el número de personas a asegurar son los factores que más pesan, seguidos de la cobertura elegida (dental incluido o no, cuadro médico, cobertura internacional…). Por eso una comparativa genérica dice poco: lo que importa es tu comparativa, con tus datos." },
        { h2: "¿Por qué comparar con Asegurados Ventajon?", p: "Somos correduría, no agentes de una única aseguradora: estamos de tu lado, no del de la compañía. Trabajamos en toda España, con cercanía especial en Canarias y Baleares, dentro del ecosistema Ventajon." },
      ],
    },
  },
  {
    slug: "vida",
    path: "/seguro-de-vida",
    metaTitle: "Seguro de vida: protege a los tuyos — Asegurados Ventajon",
    metaDescription: "Comparamos tu seguro de vida entre las mejores compañías para que tu familia esté cubierta al precio justo. Comparativa gratuita en un minuto.",
    badge: "Seguro de vida",
    h1: "Protege a los tuyos con el seguro de vida adecuado",
    subheadline: "Comparamos entre las mejores compañías para que tu familia y tu hipoteca estén cubiertas al precio justo.",
    heroIcon: "life",
    cta: { label: "Calcula tu precio", href: "/tarificador-vida" },
    ctaSecondary: { label: "Que te llamen gratis", href: "/quiero-que-me-llamen?producto=vida" },
    benefits: [
      { icon: "shield", t: "De tu lado", d: "Comparamos por ti, no vendemos un único producto." },
      { icon: "compare", t: "Precio a tu medida", d: "Tu precio depende de tu edad y tu situación, no de una tarifa genérica." },
      { icon: "doc", t: "Sin letra pequeña", d: "Te explicamos qué cubre cada póliza antes de que decidas." },
      { icon: "pin", t: "Cerca de ti", d: "Trabajamos en toda España, con cercanía especial en Canarias y Baleares." },
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
      { q: "¿Cuánto cuesta un seguro de vida?", a: "Depende sobre todo de tu edad, si fumas y el capital que quieras asegurar. Calcula tu precio real con el formulario de arriba en un minuto." },
      { q: "¿Necesito un seguro de vida si ya tengo hipoteca?", a: "Muchas hipotecas exigen o recomiendan un seguro de vida vinculado al préstamo. Podemos comparar tanto esa opción como una póliza independiente." },
      { q: "¿A partir de qué edad puedo contratarlo?", a: "Depende de cada compañía, pero la mayoría de pólizas de vida se pueden contratar desde la mayoría de edad. Te lo confirmamos según tu caso." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No. Comparar y recibir asesoramiento es gratuito y sin compromiso de contratación." },
    ],
    seo: {
      intro: "Un seguro de vida protege a las personas que dependen de ti —tu familia, tu hipoteca— si a ti te faltara. Asegurados Ventajon compara tu perfil entre varias compañías para encontrar la cobertura adecuada al precio justo, sin venderte de más.",
      sections: [
        { h2: "¿Qué influye en el precio de un seguro de vida?", p: "Sobre todo la edad y si eres fumador o no. También influyen el capital que quieras asegurar y el motivo principal —proteger a tu familia, cubrir la hipoteca o combinarlo con ahorro." },
        { h2: "¿Por qué comparar con Asegurados Ventajon?", p: "Comparamos por ti entre las mejores compañías del país y te explicamos en claro lo que cubre cada póliza, sin letra pequeña." },
      ],
    },
  },
  {
    slug: "decesos",
    path: "/seguro-de-decesos",
    metaTitle: "Seguro de decesos: tranquilidad para tu familia — Asegurados Ventajon",
    metaDescription: "Comparamos tu seguro de decesos entre las mejores compañías, sin tabúes y sin compromiso. Un asesor te ayuda a elegir.",
    badge: "Seguro de decesos",
    h1: "Seguro de decesos: tranquilidad para tu familia, sin tabúes",
    subheadline: "Un asesor compara por ti entre las mejores compañías para que tu familia no tenga que preocuparse de nada, sin coste ni compromiso.",
    heroIcon: "flower",
    cta: { label: "Calcula tu precio", href: "/tarificador-decesos" },
    ctaSecondary: { label: "Que te llamen gratis", href: "/quiero-que-me-llamen?producto=decesos" },
    benefits: [
      { icon: "shield", t: "De tu lado", d: "Te acompañamos en un tema delicado, sin prisas ni presión." },
      { icon: "compare", t: "Comparamos por ti", d: "Entre las mejores compañías de decesos del país." },
      { icon: "doc", t: "Sin letra pequeña", d: "Te explicamos qué cubre cada póliza, con calma y en claro." },
      { icon: "pin", t: "Cerca de ti", d: "Trabajamos en toda España, con cercanía especial en Canarias y Baleares." },
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
      { q: "¿Qué cubre exactamente un seguro de decesos?", a: "Los gastos del sepelio, el traslado y la gestión de trámites, para que la familia no tenga que ocuparse de nada en un momento difícil. El detalle exacto depende de la póliza y compañía; te lo explicamos sin prisas." },
      { q: "¿Puedo contratarlo a cualquier edad?", a: "Sí, se puede contratar a cualquier edad, aunque el precio varía según la edad de la persona asegurada. Te ayudamos a comparar la opción que mejor se ajuste." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No. Comparar y recibir asesoramiento es gratuito y sin compromiso de contratación." },
    ],
    seo: {
      intro: "Hablar de un seguro de decesos no siempre es fácil, pero tenerlo resuelto es una tranquilidad para toda la familia. Asegurados Ventajon compara entre las mejores compañías para que encuentres la cobertura adecuada, sin tabúes y sin presión.",
      sections: [
        { h2: "¿Por qué contratar un seguro de decesos?", p: "Evita que tu familia tenga que afrontar gastos y gestiones en un momento ya de por sí difícil. La póliza se encarga de organizarlo todo, desde el sepelio hasta el traslado si hiciera falta." },
        { h2: "¿Por qué comparar con Asegurados Ventajon?", p: "Somos correduría, no agentes de una única aseguradora: comparamos por ti y te acompañamos con calma, sin prisas ni letra pequeña." },
      ],
    },
  },
  {
    slug: "hogar",
    path: "/seguro-de-hogar",
    metaTitle: "Seguro de hogar al mejor precio — Asegurados Ventajon",
    metaDescription: "Comparamos tu seguro de hogar entre las mejores aseguradoras para proteger tu vivienda sin renunciar a cobertura.",
    badge: "Seguro de hogar",
    h1: "Seguro de hogar al mejor precio, sin renunciar a cobertura",
    subheadline: "Comparamos entre las mejores aseguradoras para proteger tu vivienda y lo que hay dentro, pagando lo justo.",
    heroIcon: "home",
    cta: { label: "Que te llamen gratis", href: "/quiero-que-me-llamen?producto=hogar" },
    ctaSecondary: { label: "Escríbenos por WhatsApp", href: "/quiero-que-me-llamen?producto=hogar" },
    benefits: [
      { icon: "shield", t: "De tu lado", d: "Comparamos por ti, no vendemos un único producto." },
      { icon: "compare", t: "Comparamos por ti", d: "Entre las mejores aseguradoras de hogar del país." },
      { icon: "doc", t: "Sin letra pequeña", d: "Te explicamos qué cubre continente, contenido y responsabilidad civil." },
      { icon: "pin", t: "Cerca de ti", d: "Trabajamos en toda España, con cercanía especial en Canarias y Baleares." },
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
      { q: "¿Qué diferencia hay entre continente y contenido?", a: "El continente es la vivienda en sí (paredes, suelos, instalaciones fijas); el contenido son tus pertenencias dentro de ella (muebles, electrodomésticos, ropa). Puedes asegurar uno, otro o ambos según tu situación." },
      { q: "¿Es obligatorio el seguro de hogar?", a: "No es obligatorio por ley, salvo que tu hipoteca lo exija. Aun así, es muy recomendable para cubrir daños, robos o responsabilidad civil frente a terceros." },
      { q: "¿Puedo cambiarme de aseguradora en cualquier momento?", a: "Normalmente sí, respetando el plazo de preaviso de tu póliza actual. Te ayudamos a comparar y a hacer el cambio sin complicaciones." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No. Comparar y recibir asesoramiento es gratuito y sin compromiso de contratación." },
    ],
    seo: {
      intro: "Tu vivienda es probablemente tu mayor inversión: protegerla con el seguro adecuado, sin pagar de más, marca la diferencia. Asegurados Ventajon compara entre las mejores aseguradoras de hogar para encontrar la cobertura que necesitas al precio justo.",
      sections: [
        { h2: "¿Qué influye en el precio de un seguro de hogar?", p: "La ubicación, el tamaño y el uso de la vivienda (habitual, segunda residencia o alquiler), y las coberturas elegidas —continente, contenido, responsabilidad civil— son los factores que más pesan." },
        { h2: "¿Por qué comparar con Asegurados Ventajon?", p: "Comparamos por ti entre las mejores compañías del país y te explicamos en claro qué cubre cada póliza, sin letra pequeña." },
      ],
    },
  },
  {
    slug: "auto",
    path: "/seguro-de-auto",
    metaTitle: "Seguro de coche comparado por un experto — Asegurados Ventajon",
    metaDescription: "Comparamos tu seguro de auto entre las mejores compañías para que pagues lo justo, a todo riesgo o a terceros.",
    badge: "Seguro de auto",
    h1: "Seguro de coche comparado por un experto, no por un algoritmo",
    subheadline: "Comparamos entre las mejores compañías de auto para que pagues lo justo, elijas terceros o todo riesgo.",
    heroIcon: "car",
    cta: { label: "Calcula tu precio", href: "/tarificador-auto" },
    ctaSecondary: { label: "Que te llamen gratis", href: "/quiero-que-me-llamen?producto=auto" },
    benefits: [
      { icon: "shield", t: "De tu lado", d: "Comparamos por ti, no vendemos un único producto." },
      { icon: "compare", t: "Comparamos por ti", d: "Entre las mejores aseguradoras de auto del país." },
      { icon: "doc", t: "Sin letra pequeña", d: "Te explicamos la diferencia entre terceros y todo riesgo." },
      { icon: "pin", t: "Cerca de ti", d: "Trabajamos en toda España, con cercanía especial en Canarias y Baleares." },
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
      { q: "¿Qué diferencia hay entre terceros y todo riesgo?", a: "El seguro a terceros cubre los daños que causes a otros; el todo riesgo cubre además los daños de tu propio coche. La opción adecuada depende de la antigüedad y el valor de tu vehículo." },
      { q: "¿Cuánto cuesta un seguro de coche?", a: "Depende del conductor (edad, años de carné, siniestralidad) y del vehículo. Un asesor te da tu propuesta personalizada tras conocer tu perfil, sin compromiso." },
      { q: "¿Puedo comparar si ya tengo seguro contratado?", a: "Sí. Cuéntanos qué tienes contratado ahora y lo comparamos con las alternativas para ver si te conviene cambiar antes de tu renovación." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No. Comparar y recibir asesoramiento es gratuito y sin compromiso de contratación." },
    ],
    seo: {
      intro: "Renovar el seguro del coche sin comparar suele significar pagar de más. Asegurados Ventajon compara tu perfil entre varias compañías de auto para encontrar la cobertura adecuada —terceros o todo riesgo— al precio justo.",
      sections: [
        { h2: "¿Qué influye en el precio de un seguro de auto?", p: "La edad y experiencia del conductor, el historial de siniestros, el modelo y antigüedad del coche, y la modalidad elegida (terceros o todo riesgo) son los factores que más pesan." },
        { h2: "¿Por qué comparar con Asegurados Ventajon?", p: "Comparamos por ti entre las mejores compañías del país y te explicamos en claro qué cubre cada póliza, sin letra pequeña." },
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
