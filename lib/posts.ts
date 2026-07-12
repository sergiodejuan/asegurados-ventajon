// Contenido de "Actualidad" (blog). Datos, no JSX: una sola plantilla
// (app/actualidad/[slug]/page.tsx) renderiza los tres artículos de forma
// consistente, siguiendo la maquetación de referencia (hero a todo el ancho,
// migas de pan, índice, inserción de CTA a mitad de artículo, autoría del
// equipo editorial y "también podría interesarte").

export type PostSection = { id: string; h2: string; paragraphs: string[]; bullets?: string[] };

export type Post = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  category: string;
  title: string;
  dek: string;
  readMinutes: number;
  publishedAt: string; // ISO
  cta: { label: string; href: string };
  intro: string;
  sectionsBeforePromo: PostSection[];
  promo: { headline: string; sub: string; ctaLabel: string; ctaHref: string };
  sectionsAfterPromo: PostSection[];
};

export const POSTS: Post[] = [
  {
    slug: "que-es-el-copago-seguro-salud",
    metaTitle: "Qué es el copago en un seguro de salud: ventajas e inconvenientes — Asegurados Ventajon",
    metaDescription: "Te explicamos qué es el copago en un seguro de salud, cuándo compensa y cuándo no, para que elijas con cabeza entre con copago o sin copago.",
    category: "Seguros de salud",
    title: "Qué es el copago en un seguro de salud: ventajas e inconvenientes",
    dek: "El copago no es una letra pequeña que debas temer: bien entendido, puede ser la diferencia entre pagar de más o ajustar tu seguro a lo que de verdad necesitas.",
    readMinutes: 6,
    publishedAt: "2026-06-02",
    cta: { label: "Calcula tu precio", href: "/tarificador" },
    intro: "De entrada, la palabra «copago» suena a gasto añadido que conviene evitar. Sin embargo, cada vez más personas eligen un seguro de salud con copago porque, bien entendido, puede suponer un ahorro real en la factura anual del seguro. Te explicamos qué es exactamente, cuándo compensa y cuándo no.",
    sectionsBeforePromo: [
      {
        id: "que-es",
        h2: "¿Qué es el copago en un seguro de salud?",
        paragraphs: [
          "El copago es la pequeña cantidad que abonas cada vez que usas alguno de los servicios incluidos en tu póliza, en lugar de tenerlo todo cubierto por la prima mensual. El importe depende del tipo de visita: una consulta con el médico de cabecera suele costar menos que una prueba diagnóstica o una intervención con hospitalización.",
          "A cambio de este pequeño coste por uso, las pólizas con copago suelen tener una prima mensual más baja que las que no lo incluyen. Por eso, antes de decidir, conviene sumar dos cosas: lo que pagas todos los meses y lo que pagarías a lo largo del año si usas el seguro con cierta frecuencia.",
        ],
      },
      {
        id: "cuando-conviene",
        h2: "Seguro médico con copago: ¿cuándo conviene contratarlo?",
        paragraphs: [
          "El copago suele compensar a quienes acuden poco al médico: si solo necesitas una revisión puntual al año, pagar una prima más baja el resto de meses sale a cuenta, aunque tengas que abonar algo cuando uses el servicio.",
        ],
        bullets: [
          "Familias jóvenes y sin patologías previas conocidas.",
          "Personas que ya tienen cubierta la atención primaria por otra vía y solo quieren el seguro para pruebas o especialistas puntuales.",
          "Quien prioriza pagar menos cada mes, aunque eso implique un pequeño coste cuando use el servicio.",
        ],
      },
    ],
    promo: {
      headline: "Compara tu seguro de salud, con o sin copago",
      sub: "Te decimos cuál compensa según tu perfil real: edad, personas a asegurar y cuánto usas el médico. Gratis y sin compromiso.",
      ctaLabel: "Calcula tu precio",
      ctaHref: "/tarificador",
    },
    sectionsAfterPromo: [
      {
        id: "inconveniente",
        h2: "El inconveniente del copago",
        paragraphs: [
          "La cara menos amable del copago aparece si acabas usando el seguro más de lo previsto: varias visitas al especialista, alguna prueba diagnóstica y una revisión de seguimiento pueden sumar más de lo que habrías pagado de más con una póliza sin copago. Por eso no hay una respuesta universal —depende de tu historial y del uso que le des al seguro—, y conviene calcularlo con datos reales, no a ojo.",
        ],
      },
      {
        id: "como-decidir",
        h2: "Cómo decidir entre con copago y sin copago",
        paragraphs: [
          "La forma más fiable de decidir es comparar tu propio perfil —edad, número de personas a asegurar, si necesitas cobertura dental— entre varias compañías y ambas modalidades, en lugar de guiarte por lo que le convino a otra persona. Un asesor que compare por ti, sin venderte un único producto, te ayuda a ver el número real antes de firmar nada.",
        ],
      },
    ],
  },
  {
    slug: "cuanto-cuesta-seguro-de-vida",
    metaTitle: "Cuánto cuesta un seguro de vida y qué debes tener en cuenta — Asegurados Ventajon",
    metaDescription: "Descubre qué factores determinan el precio de un seguro de vida y qué debes revisar antes de contratarlo, tanto si es para tu familia como para tu hipoteca.",
    category: "Seguros de vida",
    title: "Cuánto cuesta un seguro de vida y qué debes tener en cuenta antes de contratarlo",
    dek: "La edad y si fumas o no pesan más que casi cualquier otro factor. Te explicamos qué más influye en el precio y qué revisar antes de firmar.",
    readMinutes: 7,
    publishedAt: "2026-06-18",
    cta: { label: "Calcula tu precio", href: "/tarificador-vida" },
    intro: "Un seguro de vida protege a quienes dependen de ti si tú faltaras: tu familia, tu hipoteca, o ambas cosas. El precio varía mucho de una persona a otra, así que antes de comparar cifras conviene entender qué las mueve.",
    sectionsBeforePromo: [
      {
        id: "que-influye",
        h2: "Qué influye en el precio de un seguro de vida",
        paragraphs: [
          "El factor que más pesa es la edad: cuanto más joven te asegures, menor es el riesgo estadístico para la aseguradora y más bajo el precio. El segundo factor determinante es si fumas o no —los fumadores suelen pagar un recargo relevante sobre la prima base—.",
        ],
        bullets: [
          "Edad en el momento de contratar (y de renovar).",
          "Si fumas o no.",
          "El capital que quieras asegurar.",
          "El motivo principal: proteger a tu familia, cubrir la hipoteca, o combinarlo con ahorro.",
        ],
      },
      {
        id: "vida-e-hipoteca",
        h2: "¿Necesitas un seguro de vida si ya tienes hipoteca?",
        paragraphs: [
          "Muchas entidades exigen o recomiendan un seguro de vida vinculado al préstamo hipotecario, de forma que, si al titular le pasara algo, el capital pendiente quedaría cubierto y la familia no tendría que asumir la deuda. Esto puede resolverse con el seguro que ofrece el propio banco o con una póliza independiente contratada por tu cuenta —y esta segunda opción suele salir más barata, porque no vas atado a las condiciones de una única entidad.",
        ],
      },
    ],
    promo: {
      headline: "Calcula tu seguro de vida en un minuto",
      sub: "Te decimos tu precio real según tu edad, si fumas y el capital que necesitas. Sin compromiso.",
      ctaLabel: "Calcula tu precio",
      ctaHref: "/tarificador-vida",
    },
    sectionsAfterPromo: [
      {
        id: "que-revisar",
        h2: "Qué revisar antes de firmar un seguro de vida",
        paragraphs: [
          "Antes de contratar, conviene leer con calma qué cubre exactamente la póliza y qué queda excluido.",
        ],
        bullets: [
          "Si cubre fallecimiento por cualquier causa o solo por accidente.",
          "Si incluye invalidez absoluta y en qué condiciones.",
          "Si puedes añadir cobertura de enfermedades graves como opción.",
          "Si el capital se mantiene fijo o disminuye con los años (habitual en pólizas vinculadas a hipoteca).",
        ],
      },
      {
        id: "por-que-comparar",
        h2: "Por qué comparar antes de contratar",
        paragraphs: [
          "El mismo perfil puede tener precios muy distintos entre compañías, precisamente porque cada aseguradora pondera de forma distinta la edad, el tabaquismo y el capital asegurado. Comparar entre varias, con tus datos reales, es la única forma fiable de saber si el seguro de vida que te ofrecen tu banco o tu gestoría es realmente competitivo.",
        ],
      },
    ],
  },
  {
    slug: "correduria-vs-aseguradora",
    metaTitle: "Correduría de seguros o aseguradora directa: qué diferencia hay — Asegurados Ventajon",
    metaDescription: "Te explicamos la diferencia entre contratar con una correduría de seguros o directamente con una aseguradora, y por qué importa a la hora de comparar precios.",
    category: "Educación en seguros",
    title: "Correduría de seguros o aseguradora directa: qué diferencia hay y por qué importa",
    dek: "No es lo mismo hablar con quien vende un único producto que con quien compara varios por ti. La diferencia se nota en el precio final y en la información que recibes.",
    readMinutes: 5,
    publishedAt: "2026-07-01",
    cta: { label: "Te llamamos gratis", href: "/quiero-que-me-llamen" },
    intro: "Cuando buscas seguro, es fácil no reparar en quién hay al otro lado del teléfono: un agente de una única aseguradora o una correduría que compara entre varias. La diferencia no es solo formal —tiene un efecto directo en el precio y en la información que recibes antes de firmar—.",
    sectionsBeforePromo: [
      {
        id: "que-es-correduria",
        h2: "¿Qué es una correduría de seguros?",
        paragraphs: [
          "Una correduría de seguros es un intermediario independiente que trabaja con varias compañías a la vez, no con una sola. Su función es analizar tu perfil y comparar entre las distintas aseguradoras con las que colabora para encontrar la póliza que mejor se ajusta a lo que necesitas, no la que más comisión le deja.",
          "Un agente o agencia exclusiva, en cambio, solo puede ofrecerte los productos de la aseguradora a la que representa. Puede ser un buen seguro, pero nunca vas a saber si había otro mejor o más barato para tu caso, porque no te lo van a comparar.",
        ],
      },
      {
        id: "diferencia-precio",
        h2: "¿Se nota en el precio?",
        paragraphs: [
          "Sí, y bastante. El precio de un seguro de salud o de vida depende de variables muy concretas de tu perfil —edad, código postal, coberturas—, y cada aseguradora las pondera de forma distinta. Eso significa que la misma persona puede recibir precios muy diferentes de una compañía a otra. Sin comparar, no hay forma de saber si el primer precio que te ofrecen es competitivo o no.",
        ],
      },
    ],
    promo: {
      headline: "Compara gratis entre varias aseguradoras",
      sub: "Sin vender un único producto: te ayudamos a encontrar la póliza que se ajusta a ti, no la que más comisión deja.",
      ctaLabel: "Te llamamos gratis",
      ctaHref: "/quiero-que-me-llamen",
    },
    sectionsAfterPromo: [
      {
        id: "cuando-cambiar",
        h2: "¿Puedo cambiarme si ya tengo un seguro contratado?",
        paragraphs: [
          "En la mayoría de los casos sí, respetando el plazo de preaviso de tu póliza actual. Antes de renovar automáticamente, merece la pena comparar lo que ya pagas —precio y servicios incluidos— con las alternativas disponibles: a veces el cambio compensa, y a veces confirma que tu seguro actual ya era buena opción.",
        ],
      },
      {
        id: "como-elegir",
        h2: "Cómo elegir con quién comparar",
        paragraphs: [
          "Al buscar correduría, comprueba que trabaje con varias aseguradoras conocidas —no solo con una marca blanca propia—, que te explique en claro lo que cubre y lo que no cada póliza, y que comparar no tenga ningún coste ni te comprometa a contratar. Si esas tres condiciones se cumplen, tienes delante a alguien que está de tu lado, no del de la compañía.",
        ],
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function otherPosts(slug: string): Post[] {
  return POSTS.filter((p) => p.slug !== slug);
}
