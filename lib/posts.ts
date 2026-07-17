// Contenido de "Actualidad" (blog). Tipos y datos por defecto — no JSX.
// El contenido real vive en el KV store (lib/store.ts, mismo patrón que el
// catálogo de productos) y es editable desde /admin/blog; estos tres
// artículos son la semilla inicial (se insertan solo si el store está
// vacío o no los tiene todavía, igual que el catálogo de productos).

// Contenido por bloques, al estilo de un editor de bloques tipo WordPress:
// una entrada es una secuencia de bloques que se renderizan en orden. El
// bloque "promo" es la inserción de CTA a mitad de artículo; puede colocarse
// en cualquier punto de la secuencia.
export type PostBlock =
  | { type: "h2"; id: string; text: string }
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "promo"; headline: string; sub: string; ctaLabel: string; ctaHref: string };

export type Post = {
  id: string;
  slug: string;
  status: "publicado" | "borrador";
  category: string;
  title: string;
  dek: string;
  featuredImageUrl: string; // tarjeta del listado y "también podría interesarte"
  headerImageUrl: string; // cabecera del artículo; vacío = degradado de marca por defecto
  metaTitle: string;
  metaDescription: string;
  readMinutes: number;
  publishedAt: string; // ISO (fecha, yyyy-mm-dd)
  updatedAt: string; // ISO completo
  cta: { label: string; href: string };
  intro: string;
  blocks: PostBlock[];
};

export type PostDraft = Partial<Omit<Post, "id" | "updatedAt">>;

const now = new Date().toISOString();

export const DEFAULT_POSTS: Post[] = [
  {
    id: "seed-copago-salud",
    slug: "que-es-el-copago-seguro-salud",
    status: "publicado",
    category: "Seguros de salud",
    title: "Qué es el copago en un seguro de salud: ventajas e inconvenientes",
    dek: "El copago no es una letra pequeña que debas temer: bien entendido, puede ser la diferencia entre pagar de más o ajustar tu seguro a lo que de verdad necesitas.",
    featuredImageUrl: "",
    headerImageUrl: "",
    metaTitle: "Qué es el copago en un seguro de salud: ventajas e inconvenientes — Asegurados Ventajon",
    metaDescription: "Te explicamos qué es el copago en un seguro de salud, cuándo compensa y cuándo no, para que elijas con cabeza entre con copago o sin copago.",
    readMinutes: 6,
    publishedAt: "2026-06-02",
    updatedAt: now,
    cta: { label: "Calcula tu precio", href: "/tarificador" },
    intro: "De entrada, la palabra «copago» suena a gasto añadido que conviene evitar. Sin embargo, cada vez más personas eligen un seguro de salud con copago porque, bien entendido, puede suponer un ahorro real en la factura anual del seguro. Te explicamos qué es exactamente, cuándo compensa y cuándo no.",
    blocks: [
      { type: "h2", id: "que-es", text: "¿Qué es el copago en un seguro de salud?" },
      { type: "p", text: "El copago es la pequeña cantidad que abonas cada vez que usas alguno de los servicios incluidos en tu póliza, en lugar de tenerlo todo cubierto por la prima mensual. El importe depende del tipo de visita: una consulta con el médico de cabecera suele costar menos que una prueba diagnóstica o una intervención con hospitalización." },
      { type: "p", text: "A cambio de este pequeño coste por uso, las pólizas con copago suelen tener una prima mensual más baja que las que no lo incluyen. Por eso, antes de decidir, conviene sumar dos cosas: lo que pagas todos los meses y lo que pagarías a lo largo del año si usas el seguro con cierta frecuencia." },
      { type: "h2", id: "cuando-conviene", text: "Seguro médico con copago: ¿cuándo conviene contratarlo?" },
      { type: "p", text: "El copago suele compensar a quienes acuden poco al médico: si solo necesitas una revisión puntual al año, pagar una prima más baja el resto de meses sale a cuenta, aunque tengas que abonar algo cuando uses el servicio." },
      { type: "bullets", items: [
        "Familias jóvenes y sin patologías previas conocidas.",
        "Personas que ya tienen cubierta la atención primaria por otra vía y solo quieren el seguro para pruebas o especialistas puntuales.",
        "Quien prioriza pagar menos cada mes, aunque eso implique un pequeño coste cuando use el servicio.",
      ] },
      { type: "promo", headline: "Compara tu seguro de salud, con o sin copago", sub: "Te decimos cuál compensa según tu perfil real: edad, personas a asegurar y cuánto usas el médico. Gratis y sin compromiso.", ctaLabel: "Calcula tu precio", ctaHref: "/tarificador" },
      { type: "h2", id: "inconveniente", text: "El inconveniente del copago" },
      { type: "p", text: "La cara menos amable del copago aparece si acabas usando el seguro más de lo previsto: varias visitas al especialista, alguna prueba diagnóstica y una revisión de seguimiento pueden sumar más de lo que habrías pagado de más con una póliza sin copago. Por eso no hay una respuesta universal —depende de tu historial y del uso que le des al seguro—, y conviene calcularlo con datos reales, no a ojo." },
      { type: "h2", id: "como-decidir", text: "Cómo decidir entre con copago y sin copago" },
      { type: "p", text: "La forma más fiable de decidir es comparar tu propio perfil —edad, número de personas a asegurar, si necesitas cobertura dental— entre varias compañías y ambas modalidades, en lugar de guiarte por lo que le convino a otra persona. Un asesor que compare por ti, sin venderte un único producto, te ayuda a ver el número real antes de firmar nada." },
    ],
  },
  {
    id: "seed-precio-vida",
    slug: "cuanto-cuesta-seguro-de-vida",
    status: "publicado",
    category: "Seguros de vida",
    title: "Cuánto cuesta un seguro de vida y qué debes tener en cuenta antes de contratarlo",
    dek: "La edad y si fumas o no pesan más que casi cualquier otro factor. Te explicamos qué más influye en el precio y qué revisar antes de firmar.",
    featuredImageUrl: "",
    headerImageUrl: "",
    metaTitle: "Cuánto cuesta un seguro de vida y qué debes tener en cuenta — Asegurados Ventajon",
    metaDescription: "Descubre qué factores determinan el precio de un seguro de vida y qué debes revisar antes de contratarlo, tanto si es para tu familia como para tu hipoteca.",
    readMinutes: 7,
    publishedAt: "2026-06-18",
    updatedAt: now,
    cta: { label: "Calcula tu precio", href: "/tarificador-vida" },
    intro: "Un seguro de vida protege a quienes dependen de ti si tú faltaras: tu familia, tu hipoteca, o ambas cosas. El precio varía mucho de una persona a otra, así que antes de comparar cifras conviene entender qué las mueve.",
    blocks: [
      { type: "h2", id: "que-influye", text: "Qué influye en el precio de un seguro de vida" },
      { type: "p", text: "El factor que más pesa es la edad: cuanto más joven te asegures, menor es el riesgo estadístico para la aseguradora y más bajo el precio. El segundo factor determinante es si fumas o no —los fumadores suelen pagar un recargo relevante sobre la prima base—." },
      { type: "bullets", items: [
        "Edad en el momento de contratar (y de renovar).",
        "Si fumas o no.",
        "El capital que quieras asegurar.",
        "El motivo principal: proteger a tu familia, cubrir la hipoteca, o combinarlo con ahorro.",
      ] },
      { type: "h2", id: "vida-e-hipoteca", text: "¿Necesitas un seguro de vida si ya tienes hipoteca?" },
      { type: "p", text: "Muchas entidades exigen o recomiendan un seguro de vida vinculado al préstamo hipotecario, de forma que, si al titular le pasara algo, el capital pendiente quedaría cubierto y la familia no tendría que asumir la deuda. Esto puede resolverse con el seguro que ofrece el propio banco o con una póliza independiente contratada por tu cuenta —y esta segunda opción suele salir más barata, porque no vas atado a las condiciones de una única entidad." },
      { type: "promo", headline: "Calcula tu seguro de vida en un minuto", sub: "Te decimos tu precio real según tu edad, si fumas y el capital que necesitas. Sin compromiso.", ctaLabel: "Calcula tu precio", ctaHref: "/tarificador-vida" },
      { type: "h2", id: "que-revisar", text: "Qué revisar antes de firmar un seguro de vida" },
      { type: "p", text: "Antes de contratar, conviene leer con calma qué cubre exactamente la póliza y qué queda excluido." },
      { type: "bullets", items: [
        "Si cubre fallecimiento por cualquier causa o solo por accidente.",
        "Si incluye invalidez absoluta y en qué condiciones.",
        "Si puedes añadir cobertura de enfermedades graves como opción.",
        "Si el capital se mantiene fijo o disminuye con los años (habitual en pólizas vinculadas a hipoteca).",
      ] },
      { type: "h2", id: "por-que-comparar", text: "Por qué comparar antes de contratar" },
      { type: "p", text: "El mismo perfil puede tener precios muy distintos entre compañías, precisamente porque cada aseguradora pondera de forma distinta la edad, el tabaquismo y el capital asegurado. Comparar entre varias, con tus datos reales, es la única forma fiable de saber si el seguro de vida que te ofrecen tu banco o tu gestoría es realmente competitivo." },
    ],
  },
  {
    id: "seed-correduria-vs-aseguradora",
    slug: "correduria-vs-aseguradora",
    status: "publicado",
    category: "Educación en seguros",
    title: "Correduría de seguros o aseguradora directa: qué diferencia hay y por qué importa",
    dek: "No es lo mismo hablar con quien vende un único producto que con quien compara varios por ti. La diferencia se nota en el precio final y en la información que recibes.",
    featuredImageUrl: "",
    headerImageUrl: "",
    metaTitle: "Correduría de seguros o aseguradora directa: qué diferencia hay — Asegurados Ventajon",
    metaDescription: "Te explicamos la diferencia entre contratar con una correduría de seguros o directamente con una aseguradora, y por qué importa a la hora de comparar precios.",
    readMinutes: 5,
    publishedAt: "2026-07-01",
    updatedAt: now,
    cta: { label: "Te llamamos gratis", href: "/quiero-que-me-llamen" },
    intro: "Cuando buscas seguro, es fácil no reparar en quién hay al otro lado del teléfono: un agente de una única aseguradora o una correduría que compara entre varias. La diferencia no es solo formal —tiene un efecto directo en el precio y en la información que recibes antes de firmar—.",
    blocks: [
      { type: "h2", id: "que-es-correduria", text: "¿Qué es una correduría de seguros?" },
      { type: "p", text: "Una correduría de seguros es un intermediario independiente que trabaja con varias compañías a la vez, no con una sola. Su función es analizar tu perfil y comparar entre las distintas aseguradoras con las que colabora para encontrar la póliza que mejor se ajusta a lo que necesitas, no la que más comisión le deja." },
      { type: "p", text: "Un agente o agencia exclusiva, en cambio, solo puede ofrecerte los productos de la aseguradora a la que representa. Puede ser un buen seguro, pero nunca vas a saber si había otro mejor o más barato para tu caso, porque no te lo van a comparar." },
      { type: "h2", id: "diferencia-precio", text: "¿Se nota en el precio?" },
      { type: "p", text: "Sí, y bastante. El precio de un seguro de salud o de vida depende de variables muy concretas de tu perfil —edad, código postal, coberturas—, y cada aseguradora las pondera de forma distinta. Eso significa que la misma persona puede recibir precios muy diferentes de una compañía a otra. Sin comparar, no hay forma de saber si el primer precio que te ofrecen es competitivo o no." },
      { type: "promo", headline: "Compara gratis entre varias aseguradoras", sub: "Sin vender un único producto: te ayudamos a encontrar la póliza que se ajusta a ti, no la que más comisión deja.", ctaLabel: "Te llamamos gratis", ctaHref: "/quiero-que-me-llamen" },
      { type: "h2", id: "cuando-cambiar", text: "¿Puedo cambiarme si ya tengo un seguro contratado?" },
      { type: "p", text: "En la mayoría de los casos sí, respetando el plazo de preaviso de tu póliza actual. Antes de renovar automáticamente, merece la pena comparar lo que ya pagas —precio y servicios incluidos— con las alternativas disponibles: a veces el cambio compensa, y a veces confirma que tu seguro actual ya era buena opción." },
      { type: "h2", id: "como-elegir", text: "Cómo elegir con quién comparar" },
      { type: "p", text: "Al buscar correduría, comprueba que trabaje con varias aseguradoras conocidas —no solo con una marca blanca propia—, que te explique en claro lo que cubre y lo que no cada póliza, y que comparar no tenga ningún coste ni te comprometa a contratar. Si esas tres condiciones se cumplen, tienes delante a alguien que está de tu lado, no del de la compañía." },
    ],
  },
  {
    id: "seed-salud-islas-canarias",
    slug: "seguro-de-salud-canarias-que-mirar-segun-la-isla",
    status: "publicado",
    category: "Seguros de salud",
    title: "Seguro de salud en Canarias: qué cambia según la isla en la que vivas",
    dek: "El mismo seguro no cubre igual en Santa Cruz que en Puerto del Rosario. Te explicamos qué revisar isla por isla antes de contratar, para no llevarte sorpresas cuando necesites un especialista.",
    featuredImageUrl: "",
    headerImageUrl: "",
    metaTitle: "Seguro de salud en Canarias: qué mirar según tu isla — Asegurados Ventajon",
    metaDescription: "Comparamos el seguro de salud en Canarias isla por isla: cuadro médico, traslados sanitarios interinsulares y qué revisar antes de contratar en Tenerife, Gran Canaria, Lanzarote o Fuerteventura.",
    readMinutes: 7,
    publishedAt: "2026-07-08",
    updatedAt: now,
    cta: { label: "Calcula tu precio", href: "/tarificador" },
    intro: "Vivir en Canarias cambia lo que de verdad importa mirar en un seguro de salud. No es solo cuestión de precio: el cuadro médico disponible, la concentración de especialistas en según qué municipios y la posibilidad de necesitar un traslado a otra isla son factores que en la península casi nunca entran en la ecuación. Te lo explicamos isla por isla.",
    blocks: [
      { type: "h2", id: "por-que-importa-la-isla", text: "Por qué la isla en la que vives condiciona tu seguro de salud" },
      { type: "p", text: "En un archipiélago, la oferta médica privada no se reparte igual que en una comunidad autónoma peninsular. Los grandes hospitales y la mayoría de especialistas concertados suelen concentrarse en las capitales —Santa Cruz de Tenerife, Las Palmas de Gran Canaria— mientras que el resto de municipios, y sobre todo las islas más pequeñas, cuentan con un cuadro médico más reducido. Dos personas con la misma póliza pueden tener una experiencia muy distinta según dónde vivan dentro del archipiélago." },
      { type: "p", text: "Por eso, antes de fijarte solo en el precio, conviene revisar qué compañía tiene mejor cuadro médico concertado en tu zona concreta —no en la isla en general— y si tu póliza contempla qué pasa cuando la prueba o el especialista que necesitas no está disponible donde vives." },
      { type: "h2", id: "cuadro-medico-por-isla", text: "Cuadro médico: qué esperar según dónde vivas" },
      { type: "bullets", items: [
        "Tenerife: buena oferta en el área metropolitana (Santa Cruz, La Laguna), algo más limitada en el sur (Adeje, Los Cristianos, Arona), aunque en general con cuadro médico amplio.",
        "Gran Canaria: la capital concentra la mayoría de especialistas; el sur (Maspalomas, Vecindario) y el norte de la isla suelen tener menos centros concertados por compañía.",
        "Lanzarote y Fuerteventura: cuadro médico más reducido que en las islas mayores, con menos especialistas disponibles en la propia isla para determinadas pruebas.",
        "La Palma, La Gomera y El Hierro: la oferta privada es la más limitada del archipiélago, por lo que el traslado sanitario a otra isla es, en la práctica, más habitual.",
      ] },
      { type: "promo", headline: "Seguro de salud en Tenerife", sub: "Comparamos el cuadro médico de norte y sur de la isla con tu código postal exacto, desde 35 €/mes asegurado.", ctaLabel: "Ver seguro de salud en Tenerife", ctaHref: "/seguro-de-salud-tenerife" },
      { type: "h2", id: "traslado-sanitario", text: "Traslado sanitario interinsular: la letra pequeña que sí importa" },
      { type: "p", text: "Cuando una prueba diagnóstica o un especialista concreto no está disponible en tu isla, algunas pólizas cubren el traslado —tuyo o de la muestra— a otra isla o a la península; otras no, o lo hacen con condiciones. Es, con diferencia, la cobertura que menos se pregunta al contratar y la que más se echa en falta cuando hace falta usarla. Si vives en una isla con cuadro médico reducido, pregúntalo siempre antes de firmar, no después." },
      { type: "promo", headline: "Seguro de salud en Gran Canaria", sub: "Revisamos el cuadro médico de tu zona y si tu póliza cubre el traslado sanitario a otra isla si lo necesitas.", ctaLabel: "Ver seguro de salud en Gran Canaria", ctaHref: "/seguro-de-salud-gran-canaria" },
      { type: "h2", id: "islas-orientales", text: "Lanzarote y Fuerteventura: un caso aparte" },
      { type: "p", text: "En las islas orientales, la diferencia respecto a Tenerife o Gran Canaria es más marcada: menos centros médicos privados y una oferta de especialistas más ajustada. No es un motivo para descartar un buen seguro de salud, pero sí una razón de peso para comparar bien la cobertura de traslado antes de decidir, en lugar de fijarte solo en el precio mensual." },
      { type: "promo", headline: "Seguro de salud en Lanzarote y Fuerteventura", sub: "Cobertura pensada para las islas orientales, con tu código postal exacto. Comparativa gratuita en 1 minuto.", ctaLabel: "Ver seguro en Lanzarote y Fuerteventura", ctaHref: "/seguro-de-salud-lanzarote-fuerteventura" },
      { type: "h2", id: "como-comparar", text: "Cómo comparar tu seguro de salud si vives en Canarias" },
      { type: "p", text: "La forma más fiable no es preguntar «cuál es el mejor seguro de salud en Canarias» en general, sino comparar con tu código postal exacto: el cuadro médico cambia de un municipio a otro incluso dentro de la misma isla. Un asesor que compare por ti entre varias compañías, y no solo te venda la suya, es quien puede decirte con datos reales qué póliza tiene mejor cobertura donde tú vives." },
    ],
  },
  {
    id: "seed-auto-canarias-baleares",
    slug: "seguro-de-coche-canarias-baleares-que-cambia",
    status: "publicado",
    category: "Seguros de auto",
    title: "Seguro de coche en Canarias y Baleares: lo que cambia por vivir en una isla",
    dek: "La asistencia en carretera y el coche de sustitución no siempre funcionan igual en una isla que en la península. Te contamos qué revisar antes de contratar o renovar.",
    featuredImageUrl: "",
    headerImageUrl: "",
    metaTitle: "Seguro de coche en Canarias y Baleares: qué cambia — Asegurados Ventajon",
    metaDescription: "Te explicamos qué es distinto en un seguro de auto si vives en Canarias o Baleares: asistencia en carretera, coche de sustitución y talleres concertados por isla.",
    readMinutes: 6,
    publishedAt: "2026-07-11",
    updatedAt: now,
    cta: { label: "Calcula tu precio", href: "/tarificador-auto" },
    intro: "El seguro de coche obligatorio cubre lo mismo en cualquier punto de España, pero lo que rodea a la póliza —asistencia en carretera, talleres concertados, coche de sustitución— no siempre funciona igual cuando vives en una isla. Te contamos qué conviene revisar si estás en Canarias o Baleares antes de contratar o renovar.",
    blocks: [
      { type: "h2", id: "por-que-cambia-en-una-isla", text: "Por qué el seguro de auto no es exactamente igual en una isla" },
      { type: "p", text: "La red de talleres concertados y de asistencia en carretera de cada aseguradora suele estar pensada para un territorio conectado por carretera. En una isla, esa red se limita al territorio disponible: si tu compañía tiene pocos talleres concertados en tu isla, o ninguno cercano a donde vives, la asistencia en la práctica es peor que la que promete el folleto." },
      { type: "h2", id: "asistencia-en-carretera", text: "Asistencia en carretera: qué revisar antes de contratar" },
      { type: "bullets", items: [
        "Si el taller concertado más cercano está realmente en tu isla, y no solo «en Canarias» o «en Baleares» de forma genérica.",
        "Qué pasa si la avería ocurre en una isla distinta a la de tu residencia habitual (por ejemplo, de viaje entre islas).",
        "Si la grúa incluye el traslado hasta el taller concertado más cercano o solo hasta el más próximo, aunque no esté concertado.",
        "En islas con cuadro de talleres más reducido —Lanzarote, Fuerteventura, La Palma, Menorca, Ibiza o Formentera— conviene preguntarlo de forma explícita, no darlo por hecho.",
      ] },
      { type: "promo", headline: "Compara tu seguro de auto en Canarias o Baleares", sub: "Comparamos entre varias compañías la asistencia en carretera y el cuadro de talleres de tu isla, no solo el precio.", ctaLabel: "Calcula tu precio", ctaHref: "/tarificador-auto" },
      { type: "h2", id: "coche-de-sustitucion", text: "Coche de sustitución: la cobertura que más se da por hecha" },
      { type: "p", text: "Muchas pólizas a todo riesgo incluyen coche de sustitución mientras dura la reparación, pero esa cobertura depende de que exista un proveedor con vehículos disponibles en tu isla. En las islas con menos población, la oferta de coches de sustitución es más limitada, y el tiempo de espera puede ser mayor que el que se anuncia de forma genérica en la póliza." },
      { type: "h2", id: "que-mas-revisar", text: "Qué más conviene revisar si vives en Canarias o Baleares" },
      { type: "bullets", items: [
        "Si la cobertura de lunas incluye el desplazamiento del técnico a tu municipio, o si tienes que llevar el coche hasta el centro concertado.",
        "Si el seguro cubre el traslado del vehículo en barco en caso de siniestro grave que requiera reparación en otra isla.",
        "Si hay descuento por instalar dispositivos antirrobo, algo que algunas compañías valoran más en zonas con menor densidad de talleres.",
      ] },
      { type: "promo", headline: "¿Ya tienes seguro de coche? Te lo revisamos gratis", sub: "Te decimos si tu póliza actual cubre bien la asistencia y el coche de sustitución en tu isla, antes de que renueves sin comparar.", ctaLabel: "Te llamamos gratis", ctaHref: "/quiero-que-me-llamen?producto=auto" },
      { type: "h2", id: "conclusion", text: "La conclusión: compara con tu isla en mente, no en genérico" },
      { type: "p", text: "Un seguro de auto puede parecer idéntico sobre el papel y comportarse de forma muy distinta según la isla en la que se use. La única forma de saberlo con certeza es preguntar por la cobertura real en tu municipio concreto, no por la cobertura «en Canarias» o «en Baleares» en general, y comparar entre varias compañías antes de firmar o renovar." },
    ],
  },
  {
    id: "seed-islas-menores-canarias-baleares",
    slug: "seguros-islas-menores-canarias-baleares",
    status: "publicado",
    category: "Educación en seguros",
    title: "Seguros en La Palma, La Gomera, El Hierro, Menorca, Ibiza y Formentera: lo que debes saber",
    dek: "En las islas más pequeñas del archipiélago, comparar bien antes de contratar importa todavía más. Te explicamos qué tener en cuenta si vives fuera de las islas principales.",
    featuredImageUrl: "",
    headerImageUrl: "",
    metaTitle: "Seguros en La Palma, La Gomera, El Hierro, Menorca, Ibiza y Formentera — Asegurados Ventajon",
    metaDescription: "Guía de seguros de salud, auto y hogar para quien vive en La Palma, La Gomera, El Hierro, Menorca, Ibiza o Formentera. Comparativa gratuita con tu código postal exacto.",
    readMinutes: 6,
    publishedAt: "2026-07-15",
    updatedAt: now,
    cta: { label: "Te llamamos gratis", href: "/quiero-que-me-llamen" },
    intro: "La Palma, La Gomera, El Hierro, Menorca, Ibiza y Formentera comparten un mismo reto a la hora de contratar un seguro: al ser las islas con menos población de sus respectivos archipiélagos, la oferta de centros médicos, talleres y proveedores concertados es más reducida que en Tenerife, Gran Canaria o Mallorca. Eso no significa que tengas peores opciones, sino que comparar bien importa todavía más.",
    blocks: [
      { type: "h2", id: "por-que-son-un-caso-aparte", text: "Por qué estas islas son un caso aparte" },
      { type: "p", text: "Las aseguradoras suelen publicar su cobertura a nivel de comunidad autónoma —«Canarias» o «Illes Balears»— sin distinguir entre islas. En la práctica, eso puede ocultar que una compañía apenas tiene presencia concertada en La Gomera o en Formentera, aunque sí la tenga en Tenerife o en Mallorca. Vivir en una de estas islas más pequeñas hace que valga la pena preguntar por tu municipio concreto, no por la isla o la región en general." },
      { type: "h2", id: "seguro-de-salud", text: "Seguro de salud en las islas menores" },
      { type: "p", text: "El cuadro médico privado en La Palma, La Gomera y El Hierro —y, en Baleares, en Menorca, Ibiza y Formentera— es más reducido que en las islas capitalinas. Por eso, si buscas seguro de salud viviendo en cualquiera de ellas, la cobertura de traslado sanitario a otra isla o a la península para pruebas o especialistas no disponibles cerca de ti es, más que una opción, casi una necesidad. Conviene confirmarla antes de contratar, no cuando ya la necesitas." },
      { type: "h2", id: "seguro-de-auto-y-hogar", text: "Seguro de auto y de hogar: qué revisar" },
      { type: "bullets", items: [
        "Auto: pregunta por el taller concertado más cercano a tu municipio real y qué pasa si tienes una avería en otra isla del mismo archipiélago.",
        "Hogar: confirma que la asistencia urgente (fontanero, cerrajero, electricista) tenga proveedor real en tu isla, no solo cobertura teórica.",
        "En ambos casos, compara varias compañías con tu código postal exacto: la diferencia de cobertura real entre una y otra suele ser mayor en estas islas que en las principales.",
      ] },
      { type: "promo", headline: "Guías gratis de seguros para Canarias y Baleares", sub: "Descarga nuestra guía para elegir bien tu seguro de salud y el checklist para renovar el de auto, pensadas para quien vive en una isla.", ctaLabel: "Descargar guías gratis", ctaHref: "/recursos-seguros-canarias-baleares" },
      { type: "h2", id: "como-comparar-sin-desplazarte", text: "Cómo comparar sin necesidad de desplazarte a otra isla" },
      { type: "p", text: "Todo el proceso de comparar y contratar puede hacerse de forma online, sin necesidad de desplazarte a una oficina en Tenerife, Gran Canaria o Mallorca. Trabajamos con tu código postal exacto, vivas en Valverde, San Sebastián de la Gomera, Santa Cruz de la Palma, Maó, Eivissa o Sant Francesc Xavier, y comparamos entre varias compañías para encontrar la cobertura que de verdad funciona donde vives, no la que suena bien sobre el papel." },
      { type: "promo", headline: "Cuéntanos en qué isla vives y te llamamos gratis", sub: "Comparamos tu seguro de salud, auto u hogar con tu código postal exacto, sin coste ni compromiso.", ctaLabel: "Que me llamen gratis", ctaHref: "/quiero-que-me-llamen" },
    ],
  },
  {
    id: "seed-carencias-seguro-salud",
    slug: "periodo-de-carencia-seguro-de-salud",
    status: "publicado",
    category: "Seguros de salud",
    title: "Periodo de carencia en el seguro de salud: qué es y cómo evitarlo al cambiar de compañía",
    dek: "Es la pregunta que más se hace quien está a punto de cambiar de seguro médico: si tengo una consulta pendiente, ¿tengo que esperar? Te explicamos qué es la carencia y cuándo se puede evitar.",
    featuredImageUrl: "",
    headerImageUrl: "",
    metaTitle: "Periodo de carencia en el seguro de salud: qué es y cómo evitarlo — Asegurados Ventajon",
    metaDescription: "Te explicamos qué es el periodo de carencia en un seguro de salud, cuánto suele durar según la garantía y cómo evitarlo si vienes de otra compañía.",
    readMinutes: 6,
    publishedAt: "2026-07-17",
    updatedAt: now,
    cta: { label: "Calcula tu precio", href: "/tarificador" },
    intro: "«¿Puedo usar el seguro desde el primer día?» es una de las primeras preguntas que surge al contratar un seguro de salud, y la respuesta casi siempre pasa por entender qué es el periodo de carencia. No es un truco ni una letra pequeña pensada para no cubrirte: es un plazo de espera antes de poder usar ciertas garantías, y conocerlo bien evita sustos si tienes algo pendiente.",
    blocks: [
      { type: "h2", id: "que-es-la-carencia", text: "¿Qué es el periodo de carencia?" },
      { type: "p", text: "El periodo de carencia es el tiempo que debe pasar desde que contratas la póliza hasta que puedes usar determinadas garantías. Existe para que la aseguradora no asuma de golpe gastos de personas que contratan el seguro sabiendo ya que van a necesitar una prueba o intervención concreta a corto plazo. Durante la carencia, el resto de coberturas suele funcionar con normalidad; lo que queda en espera son garantías puntuales." },
      { type: "h2", id: "cuanto-dura", text: "¿Cuánto dura la carencia según la garantía?" },
      { type: "p", text: "El plazo exacto varía de una compañía a otra, pero hay un patrón habitual en el mercado que ayuda a hacerse una idea general antes de comparar con datos reales:" },
      { type: "bullets", items: [
        "Consultas de medicina general y pediatría: normalmente sin carencia, o muy reducida.",
        "Pruebas diagnósticas y especialistas: carencia corta, en torno a los primeros meses.",
        "Hospitalización y cirugía programada: suele rondar los 6 meses.",
        "Parto: es la garantía con carencia más larga, habitualmente cerca de los 8 meses.",
        "Urgencias: en la mayoría de pólizas no tiene carencia.",
      ] },
      { type: "promo", headline: "Compara tu seguro de salud con datos reales", sub: "Te decimos qué carencias aplica cada compañía a tu perfil antes de que decidas, no después.", ctaLabel: "Calcula tu precio", ctaHref: "/seguro-de-salud" },
      { type: "h2", id: "como-evitarla", text: "Cómo evitar la carencia si vienes de otra compañía" },
      { type: "p", text: "Si ya tienes un seguro de salud en vigor y quieres cambiar de compañía, muchas aseguradoras respetan las carencias ya superadas en tu póliza anterior para garantías equivalentes —lo que en el sector se conoce como asunción de carencias—, siempre que no haya interrupción entre una póliza y la siguiente y que lo solicites de forma expresa al contratar. No todas las compañías lo aplican igual ni a las mismas garantías, así que conviene preguntarlo antes de dar de baja tu seguro actual." },
      { type: "h2", id: "cita-pendiente", text: "¿Y si tengo una cita o intervención ya programada?" },
      { type: "p", text: "Si sabes que vas a necesitar una prueba, especialista o intervención concreta a corto plazo, dilo con claridad al comparar: no para que te penalicen, sino para que te orienten hacia la compañía cuya carencia ya tengas superada o hacia la opción que mejor se ajuste a tu calendario real, en lugar de descubrirlo cuando ya has contratado." },
      { type: "promo", headline: "Cuéntanos tu situación y comparamos por ti", sub: "Si vienes de otra compañía o tienes algo pendiente, te decimos qué opción evita mejor la carencia. Gratis y sin compromiso.", ctaLabel: "Calcula tu precio", ctaHref: "/tarificador" },
      { type: "h2", id: "conclusion", text: "La carencia no es un motivo para no comparar" },
      { type: "p", text: "Conocer las carencias de antemano es justo lo contrario de una sorpresa desagradable: es la forma de anticiparte a ellas. Comparar entre varias compañías con tu situación real —si vienes de otro seguro, si tienes algo programado— es lo que permite elegir la póliza que de verdad puedes empezar a usar cuando la necesitas." },
    ],
  },
  {
    id: "seed-franquicia-seguro-auto",
    slug: "franquicia-seguro-de-coche-que-es",
    status: "publicado",
    category: "Seguros de auto",
    title: "Franquicia en el seguro de coche: qué es, cómo funciona y cuándo compensa",
    dek: "Una franquicia baja no siempre es la mejor opción. Te explicamos cómo funciona, cómo afecta al precio de tu seguro a todo riesgo y cómo elegir el importe que más te conviene.",
    featuredImageUrl: "",
    headerImageUrl: "",
    metaTitle: "Franquicia en el seguro de coche: qué es y cómo elegirla — Asegurados Ventajon",
    metaDescription: "Te explicamos qué es la franquicia en un seguro de coche a todo riesgo, cómo afecta al precio y cómo elegir el importe que más te conviene.",
    readMinutes: 6,
    publishedAt: "2026-07-20",
    updatedAt: now,
    cta: { label: "Calcula tu precio", href: "/tarificador-auto" },
    intro: "Al comparar seguros de coche a todo riesgo, tarde o temprano aparece la palabra «franquicia», y no siempre queda claro qué significa ni cómo elegirla. No es un coste oculto: es una pieza más del cálculo entre lo que pagas cada mes y lo que pagarías si tienes un siniestro. Te lo explicamos para que la elijas con criterio, no al azar.",
    blocks: [
      { type: "h2", id: "que-es-la-franquicia", text: "¿Qué es la franquicia en un seguro de coche?" },
      { type: "p", text: "La franquicia es la cantidad que asumes tú cuando reparas tu propio coche tras un siniestro del que eres responsable; a partir de esa cantidad, el resto lo cubre la aseguradora. Solo se aplica a los daños propios —la cobertura de terceros, es decir, los daños que causas a otros, no lleva franquicia—. Por eso solo tiene sentido hablar de franquicia dentro de una póliza a todo riesgo, no en un seguro a terceros." },
      { type: "h2", id: "como-afecta-al-precio", text: "Cómo afecta la franquicia al precio de tu seguro" },
      { type: "p", text: "La relación es directa: cuanto más alta es la franquicia que aceptas, más baja suele ser tu prima mensual, porque estás asumiendo tú una parte mayor del riesgo. Una franquicia de 300 € suele salir más barata en la prima que una de 0 €, pero implica que, si tienes un siniestro, pagarás esos primeros 300 € de tu bolsillo." },
      { type: "bullets", items: [
        "Franquicia baja o 0 €: prima más alta, pero no pagas nada (o casi nada) si tienes un siniestro.",
        "Franquicia media (150-300 €, orientativo): equilibrio entre prima y coste en caso de siniestro.",
        "Franquicia alta: prima más baja, pero asumes una parte mayor del coste de la reparación.",
      ] },
      { type: "promo", headline: "Compara franquicias, no solo precios", sub: "Te ayudamos a ver qué franquicia compensa según cuánto usas el coche y tu historial. Comparativa gratuita.", ctaLabel: "Calcula tu precio", ctaHref: "/tarificador-auto" },
      { type: "h2", id: "como-elegirla", text: "Cómo elegir la franquicia que más te conviene" },
      { type: "p", text: "No existe una franquicia «correcta» para todo el mundo: depende de cuánto uso le das al coche, de tu historial de siniestros y de cuánto margen tengas para asumir un gasto imprevisto. Quien conduce poco y con cuidado suele salir ganando con una franquicia alta, porque paga menos cada mes por un riesgo que raramente llega a materializarse. Quien conduce mucho, en ciudad o en zonas con más tráfico, puede preferir una franquicia baja para no exponerse a un gasto grande si el siniestro llega antes de lo previsto." },
      { type: "h2", id: "franquicia-fija-o-porcentual", text: "Franquicia fija o en porcentaje" },
      { type: "p", text: "La mayoría de pólizas aplican una franquicia fija (un importe cerrado, por ejemplo 200 €), pero algunas la calculan como un porcentaje del coste de la reparación, con un mínimo y un máximo. Antes de decidir solo por el número que ves en la prima, conviene preguntar cuál de los dos modelos aplica tu póliza, porque cambia bastante el coste real ante una reparación cara." },
      { type: "promo", headline: "¿Ya tienes seguro a todo riesgo? Te revisamos la franquicia", sub: "Comprobamos si tu franquicia actual sigue siendo la que más te conviene antes de que renueves sin comparar.", ctaLabel: "Ver seguro de auto", ctaHref: "/seguro-de-auto" },
      { type: "h2", id: "conclusion", text: "La franquicia, una decisión más que comparar" },
      { type: "p", text: "La franquicia es una palanca más para ajustar tu seguro a tu forma real de conducir, no una casilla que se marca sin pensar. Comparar entre varias compañías con distintos niveles de franquicia, y no solo el precio final, es la forma de encontrar el equilibrio que de verdad te conviene." },
    ],
  },
  {
    id: "seed-obligatorio-seguro-decesos",
    slug: "es-obligatorio-el-seguro-de-decesos",
    status: "publicado",
    category: "Seguros de decesos",
    title: "¿Es obligatorio el seguro de decesos? Qué cubre y cuánto cuesta",
    dek: "No es obligatorio por ley, pero conviene entender qué resuelve y qué no resuelve para decidir con calma, sin dejarlo para cuando ya hace falta.",
    featuredImageUrl: "",
    headerImageUrl: "",
    metaTitle: "¿Es obligatorio el seguro de decesos? Qué cubre y cuánto cuesta — Asegurados Ventajon",
    metaDescription: "Te explicamos si el seguro de decesos es obligatorio, qué cubre exactamente y qué influye en su precio, para decidir con información, sin prisas.",
    readMinutes: 5,
    publishedAt: "2026-07-23",
    updatedAt: now,
    cta: { label: "Te llamamos gratis", href: "/quiero-que-me-llamen?producto=decesos" },
    intro: "El seguro de decesos es de los pocos seguros que casi nadie contrata pensando en sí mismo, sino en no dejarle una carga a su familia. Aun así, sigue habiendo dudas básicas sobre si es obligatorio, qué cubre realmente y cuánto cuesta. Te lo explicamos sin rodeos.",
    blocks: [
      { type: "h2", id: "es-obligatorio", text: "¿Es obligatorio el seguro de decesos?" },
      { type: "p", text: "No, el seguro de decesos no es obligatorio por ley en España, a diferencia de otros seguros como el de auto. Es una decisión voluntaria, aunque muy extendida: buena parte de las familias españolas lo tienen contratado precisamente porque los gastos de un sepelio, si no están cubiertos, hay que afrontarlos de golpe y sin margen de tiempo para pensarlo." },
      { type: "h2", id: "que-cubre", text: "¿Qué cubre exactamente?" },
      { type: "bullets", items: [
        "Gastos de sepelio: féretro, tanatorio, ceremonia y, según la póliza, cremación o inhumación.",
        "Traslado del fallecido, incluso desde otra ciudad o desde el extranjero en algunas pólizas.",
        "Gestión de los trámites administrativos, para que la familia no tenga que ocuparse de todo el papeleo.",
        "Asistencia jurídica y, en algunas compañías, apoyo psicológico para la familia.",
        "Un capital adicional en efectivo, como opción, en determinadas pólizas.",
      ] },
      { type: "promo", headline: "Seguro de decesos, sin tabúes ni presión", sub: "Un asesor te explica con calma qué cubre cada póliza y compara entre varias compañías por ti.", ctaLabel: "Que te llamen gratis", ctaHref: "/seguro-de-decesos" },
      { type: "h2", id: "que-pasa-sin-el", text: "¿Qué pasa si no tienes seguro de decesos?" },
      { type: "p", text: "Sin póliza, la familia debe asumir los gastos del sepelio de su bolsillo, en un momento en el que hay poco margen para comparar precios entre funerarias o esperar a tener liquidez. Existen ayudas puntuales según la comunidad autónoma o el convenio funerario, pero no sustituyen a una cobertura contratada de antemano, ni cubren todo lo que cubre una póliza completa." },
      { type: "h2", id: "cuanto-cuesta", text: "¿Cuánto cuesta y a partir de qué edad se puede contratar?" },
      { type: "p", text: "El precio depende sobre todo de la edad de la persona asegurada —cuanto antes se contrata, más bajo suele ser—, y en menor medida del capital y las coberturas adicionales elegidas. Se puede contratar prácticamente a cualquier edad, aunque cuanto más se espera, más sube la prima. Por eso muchas familias deciden asegurar a todos sus miembros, incluidos los más jóvenes, desde el principio." },
      { type: "promo", headline: "Compara tu seguro de decesos gratis", sub: "Te ayudamos a elegir la cobertura adecuada para tu familia, sin coste ni compromiso de contratación.", ctaLabel: "Te llamamos gratis", ctaHref: "/quiero-que-me-llamen?producto=decesos" },
      { type: "h2", id: "conclusion", text: "Decidir con calma, no bajo presión" },
      { type: "p", text: "No hacer falta decidirlo en un mal momento es, precisamente, la razón por la que tiene sentido contratarlo con tiempo. Comparar entre varias compañías, entender qué cubre cada una y decidir sin prisa es la mejor forma de que, cuando haga falta, la familia solo tenga que ocuparse de despedirse." },
    ],
  },
];

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function emptyBlock(type: PostBlock["type"]): PostBlock {
  switch (type) {
    case "h2": return { type: "h2", id: `s-${Date.now()}`, text: "" };
    case "p": return { type: "p", text: "" };
    case "bullets": return { type: "bullets", items: [""] };
    case "promo": return { type: "promo", headline: "", sub: "", ctaLabel: "Calcula tu precio", ctaHref: "/tarificador" };
  }
}
