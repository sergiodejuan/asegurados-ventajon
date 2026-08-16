// Landings PAID (/lp/[slug]). Sustituye a la antigua landing única
// /lp/salud: ahora son N registros editables desde /admin/campanas/landings,
// cada uno con su propio slug, ramo, SEO y contenido — pensado para poder
// duplicar la landing de salud y lanzar variantes por ramo o por público
// objetivo sin desplegar código, y compararlas entre sí.
//
// El shape del contenido (hero/porQueElegir/beneficios/bannerIntermedio/
// productos/contrataTelefono/comparativa/rating/resenas/footer/utm) es
// idéntico, campo a campo, al de la antigua PaidLandingSaludConfig — solo se
// le añaden id/slug/status/producto/createdAt al principio.

export type LandingProducto = "salud" | "vida" | "auto" | "decesos" | "hogar";
export type LandingStatus = "borrador" | "publicado";

export type LandingProduct = {
  // Identificador estable — se usa como key del CTA de cada tarjeta y como
  // valor de utm_content al saltar al tarificador (para saber qué tarjeta
  // pulsó el usuario). Solo tiene sentido en landings de producto "salud".
  id: string;
  title: string;
  priceLabel: string; // "Desde" | "Por"
  price: string; // "19,90 €/mes y sin copagos"
  description: string;
  ctaLabel: string; // "Calcula tu seguro" | "Te llamamos gratis"
  ctaAction: "calcular" | "llamar";
  // Imagen de fondo de la tarjeta (opcional). Cuando existe, se pinta como
  // background con overlay oscuro y todo el texto en blanco.
  imageUrl: string;
};

export type LandingComparativaRow = {
  label: string;
  // Un booleano por columna, en el mismo orden que `columns`. Longitudes
  // distintas se manejan como "no incluido" para columnas faltantes.
  incluidoEn: boolean[];
};

export type LandingPartner = {
  name: string;
  // Data URI o URL externa. Se acepta cualquier cadena, la UI valida.
  imageUrl: string;
};

export type LandingBenefit = {
  // Nombre de icono del set de components/icons.tsx (usa el mismo mapping
  // que exit-intents e IconByName). "" = sin icono.
  icon: string;
  text: string;
};

export type Landing = {
  id: string;
  slug: string;
  status: LandingStatus;
  // Determina a qué tarificador apunta el CTA "Calcular precio": "salud"
  // mantiene el wizard embebido (modal, mínima fricción); el resto enlaza al
  // tarificador de página completa ya existente del site principal (o, en
  // el caso de "hogar", a "quiero que me llamen", al no existir tarificador
  // propio de esa rama).
  producto: LandingProducto;

  // Metadata para la etiqueta <title> y descripción SEO — aunque va con
  // noindex, algunos partners de anuncios sí muestran el title cuando el
  // usuario hace preview del enlace en WhatsApp / redes.
  metaTitle: string;
  metaDescription: string;

  // Ocultar el widget flotante del asistente en esta landing.
  hideAssistant: boolean;

  // Teléfono comercial de la campaña (aparece en las sticky bars y en el
  // bloque "Contrata por teléfono").
  phone: string;

  hero: {
    kicker: string;
    h1: string;
    // Fragmento del H1 que se resalta en rojo (case-insensitive).
    h1Highlight: string;
    priceHighlight: string;
    socialProof: string;
    imageUrl: string;
    ctaCalcularLabel: string;
    ctaLlamarLabel: string;
  };

  porQueElegir: {
    title: string;
    subtitle: string;
    partners: LandingPartner[];
  };

  beneficios: {
    title: string;
    items: LandingBenefit[];
  };

  bannerIntermedio: {
    title: string;
    subtitle: string;
    imageUrl: string;
  };

  // Solo se usa cuando producto === "salud" (es la única rama con un
  // tarificador propio embebido con varias modalidades); para el resto de
  // ramas esta sección se oculta en el render público.
  productos: {
    title: string;
    intro: string;
    items: LandingProduct[];
  };

  contrataTelefono: {
    title: string;
    ctaLabel: string;
  };

  comparativa: {
    title: string;
    subtitle: string;
    columns: string[];
    rows: LandingComparativaRow[];
    // Filas que se muestran de entrada; el resto se ocultan tras "Ver más".
    // 0 = mostrar todas de inicio.
    initialVisibleRows: number;
    verMasLabel: string;
    verMenosLabel: string;
  };

  rating: {
    valor: string; // "9,2/10"
    numValoraciones: string; // "70.207 valoraciones"
  };

  resenas: {
    title: string;
    items: {
      autor: string;
      lugar: string;
      estrellas: number; // 1-5
      texto: string;
    }[];
  };

  footer: {
    disclaimer: string;
    enlaces: { label: string; href: string }[];
    copyright: string;
    notaLegal: string;
  };

  // Atribución auto-inyectada en los CTA "Calcula tu seguro". Ver
  // buildTarificadorHref más abajo.
  utm: {
    source: string;
    medium: string;
    campaign: string;
  };

  createdAt: string;
  updatedAt: string;
};

export type LandingDraft = Partial<Omit<Landing, "id" | "createdAt" | "updatedAt">>;

// Slugs que no se pueden usar como slug de landing porque chocan con rutas
// propias del admin (el sentinela "nueva" del editor, el dashboard de
// comparación) o del propio namespace /lp/api si algún día existiera.
// "salud" NO está en esta lista: es un slug normal, como cualquier otro.
export const RESERVED_LANDING_SLUGS = ["nueva", "comparar", "api"];

export function slugifyLandingTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export const PRODUCTO_TARIFICADOR_HREF: Record<Exclude<LandingProducto, "salud">, string> = {
  vida: "/tarificador-vida",
  auto: "/tarificador-auto",
  decesos: "/tarificador-decesos",
  // Sin tarificador propio: el CTA "Calcular precio" de una landing de
  // hogar lleva directamente al flujo genérico de "que me llamen".
  hogar: "/quiero-que-me-llamen",
};

// URL del tarificador con la UTM (+ slug de la landing, para atribución) de
// esta landing auto-inyectada. Para producto !== "salud" apunta al
// tarificador de página completa ya existente del site (o a "quiero que me
// llamen" para hogar); para "salud" se usa el wizard embebido propio
// (ver app/lp/[slug]/tarificador/page.tsx), que no pasa por esta función.
export function buildTarificadorHref(landing: Pick<Landing, "producto" | "slug" | "utm">, productId?: string): string {
  const base = landing.producto === "salud" ? "/tarificador" : PRODUCTO_TARIFICADOR_HREF[landing.producto];
  const params = new URLSearchParams({
    utm_source: landing.utm.source,
    utm_medium: landing.utm.medium,
    utm_campaign: landing.utm.campaign,
    lp: landing.slug,
  });
  if (productId) params.set("utm_content", productId);
  return `${base}?${params.toString()}`;
}

const DEFAULT_HERO: Landing["hero"] = {
  kicker: "",
  h1: "El Seguro de Salud para que tu salud no espere",
  h1Highlight: "Seguro de Salud",
  priceHighlight: "Desde 19,90 €/mes y sin copagos",
  socialProof: "Más de 350.000 personas ya comparan con nosotros",
  imageUrl: "",
  ctaCalcularLabel: "Calcula tu seguro",
  ctaLlamarLabel: "Te llamamos gratis",
};

export const DEFAULT_LANDING_SALUD: Landing = {
  id: "seed-salud",
  slug: "salud",
  status: "publicado",
  producto: "salud",

  metaTitle: "Seguro de Salud para que tu salud no espere — Asegurados Ventajon",
  metaDescription:
    "Compara y elige tu Seguro de Salud desde 19,90 €/mes y sin copagos. Más de 1.000 centros y hospitales, 50.000 especialistas en toda España.",

  hideAssistant: false,

  phone: "919 151 151",

  hero: DEFAULT_HERO,

  porQueElegir: {
    title: "¿Por qué elegir el Seguro de Salud de Asegurados Ventajon?",
    subtitle:
      "Elige entre más de 1.000 centros y hospitales y más de 50.000 especialistas en toda España.",
    partners: [
      { name: "HM Hospitales", imageUrl: "" },
      { name: "Vithas", imageUrl: "" },
      { name: "VIAmed", imageUrl: "" },
      { name: "Clínica Corachan", imageUrl: "" },
      { name: "San Rafael", imageUrl: "" },
      { name: "Ribera", imageUrl: "" },
      { name: "CreuBlanca", imageUrl: "" },
    ],
  },

  beneficios: {
    title: "Porque tu salud no entiende de esperas:",
    items: [
      { icon: "life", text: "Más de 50.000 médicos especialistas." },
      { icon: "home", text: "Más de 1.000 centros y hospitales en toda España." },
      { icon: "flower", text: "Tecnología diagnóstica avanzada." },
      { icon: "doc", text: "Precio justo y transparente: desde 19,90 €/mes y sin copagos." },
      { icon: "compare", text: "Servicio Médico Online, sin salir de casa." },
      { icon: "pin", text: "Gestiones ágiles desde el móvil." },
      { icon: "shield", text: "Acceso directo a médicos especialistas sin pasar por el médico de cabecera." },
      { icon: "flower", text: "Te premiamos con bonificaciones en tu renovación, si llevas una vida saludable." },
    ],
  },

  bannerIntermedio: {
    title: "Accede ya a la sanidad privada",
    subtitle: "Únete a las miles de personas que ya confían en Asegurados Ventajon.",
    imageUrl: "",
  },

  productos: {
    title: "Tipos de Seguros de Salud",
    intro:
      "Porque no todos tenemos las mismas necesidades, contamos con diversos tipos de seguros médicos. Acercamos la sanidad privada a las circunstancias económicas y familiares de cada uno.",
    items: [
      {
        id: "especialistas",
        title: "Especialistas",
        priceLabel: "Desde",
        price: "19,90 €/mes y sin copagos",
        description: "Acceso directo a consultas médicas y pruebas diagnósticas.",
        ctaLabel: "Calcula tu seguro",
        ctaAction: "calcular",
        imageUrl: "",
      },
      {
        id: "completo",
        title: "Completo",
        priceLabel: "Desde",
        price: "38,90 €/mes y sin copagos",
        description: "Acceso a urgencias, intervenciones quirúrgicas y tratamientos complejos.",
        ctaLabel: "Calcula tu seguro",
        ctaAction: "calcular",
        imageUrl: "",
      },
      {
        id: "dental",
        title: "Dental",
        priceLabel: "Por",
        price: "4,84 €/mes",
        description: "Tu sonrisa en las mejores manos, a un precio muy económico.",
        ctaLabel: "Te llamamos gratis",
        ctaAction: "llamar",
        imageUrl: "",
      },
    ],
  },

  contrataTelefono: {
    title: "Contrata por teléfono",
    ctaLabel: "Llamadme gratis",
  },

  comparativa: {
    title: "Comparativa de nuestros Seguros de Salud para que elegir sea muy fácil",
    subtitle: "",
    columns: ["Salud Especialistas", "Salud Completo"],
    rows: [
      { label: "Urgencias médicas", incluidoEn: [false, true] },
      { label: "Hospitalización e intervenciones quirúrgicas", incluidoEn: [false, true] },
      { label: "Medicina primaria", incluidoEn: [true, true] },
      { label: "Especialidades médicas y quirúrgicas", incluidoEn: [true, true] },
      { label: "Médico Online: atención inmediata 24/7", incluidoEn: [true, true] },
      { label: "Medios diagnósticos simples", incluidoEn: [true, true] },
      { label: "Tratamientos especiales básicos", incluidoEn: [true, true] },
      { label: "Asistencia médica telefónica y psicológica 24/7", incluidoEn: [true, true] },
      { label: "Segunda opinión médica por enfermedades graves", incluidoEn: [true, true] },
      { label: "Dental básico", incluidoEn: [true, true] },
    ],
    initialVisibleRows: 6,
    verMasLabel: "Ver más",
    verMenosLabel: "Ver menos",
  },

  rating: {
    valor: "4,7/5",
    numValoraciones: "según los clientes ya asesorados",
  },

  resenas: {
    title: "Lo que dicen nuestros clientes",
    items: [
      {
        autor: "Marta P.",
        lugar: "Las Palmas",
        estrellas: 5,
        texto: "Llamé a media mañana y por la tarde ya tenía tres presupuestos comparados. Cerré con el más ajustado y con dental incluido.",
      },
      {
        autor: "Carlos R.",
        lugar: "Palma de Mallorca",
        estrellas: 5,
        texto: "Me explicaron con claridad lo que cubría cada opción, sin letra pequeña. Ahorré 240 € al año respecto a mi seguro anterior.",
      },
      {
        autor: "Lucía G.",
        lugar: "Tenerife",
        estrellas: 4,
        texto: "El asesor entendió lo que necesitaba (una consulta rápida con especialista) y me buscó una póliza sin copagos súper económica.",
      },
      {
        autor: "Javier M.",
        lugar: "Ibiza",
        estrellas: 5,
        texto: "Tenía 60 años y pensaba que era imposible encontrar un seguro decente. Me sacaron uno muy competitivo en 24 h.",
      },
      {
        autor: "Andrea N.",
        lugar: "Gran Canaria",
        estrellas: 5,
        texto: "Cambié de compañía sin lío. Ellos gestionaron la baja del anterior y la alta del nuevo. Cero papeleos por mi parte.",
      },
      {
        autor: "Iván D.",
        lugar: "Fuerteventura",
        estrellas: 4,
        texto: "Comparé precios con otras webs y con ellos me hicieron el mejor precio y con más coberturas. Súper recomendable.",
      },
      {
        autor: "Nuria S.",
        lugar: "Menorca",
        estrellas: 5,
        texto: "Con tres asegurados en casa el precio bajó una barbaridad. Sin copagos y con acceso a los hospitales que quería.",
      },
      {
        autor: "Rubén A.",
        lugar: "Lanzarote",
        estrellas: 5,
        texto: "La atención en WhatsApp fue rápida y humana. Me resolvieron dudas al momento y sin presionar para contratar.",
      },
    ],
  },

  footer: {
    disclaimer:
      "Solo para nuevas contrataciones. El precio mostrado \"desde 19,90 €/mes y sin copagos\" es orientativo y corresponde a una póliza individual del Seguro de Salud Especialistas. Sujeto a normas de suscripción de cada compañía aseguradora.",
    enlaces: [
      { label: "Aviso Legal", href: "/legal" },
      { label: "Política de Cookies", href: "/legal#cookies" },
      { label: "Política de Privacidad", href: "/legal#privacidad" },
    ],
    copyright: "© Asegurados Ventajon",
    notaLegal:
      "Asegurados Ventajon es una correduría de seguros independiente que compara ofertas de las principales aseguradoras del mercado.",
  },

  utm: {
    source: "paid_ads",
    medium: "landing",
    campaign: "lp-salud",
  },

  createdAt: "",
  updatedAt: "",
};

export const PRODUCTOS_VALIDOS: LandingProducto[] = ["salud", "vida", "auto", "decesos", "hogar"];

// Cotas duras sobre las estructuras que se serializan al KV (arrays con
// máximos, longitudes de dataURL) para que un formulario mal escrito no
// rompa el store ni deje una landing imposible de renderizar. Compartida
// entre POST (crear) y PATCH (actualizar) en app/api/admin/landings/*.
const MAX_IMAGE_LENGTH = 900_000;
const MAX_PARTNERS = 20;
const MAX_BENEFICIOS = 20;
const MAX_PRODUCTOS = 6;
const MAX_COMPARATIVA_COLUMNS = 6;
const MAX_COMPARATIVA_ROWS = 40;

export function validateLandingContent(body: LandingDraft): string | null {
  const partners = Array.isArray(body.porQueElegir?.partners) ? body.porQueElegir.partners : [];
  if (partners.length > MAX_PARTNERS) return `Máximo ${MAX_PARTNERS} logos de partners.`;
  for (const p of partners) {
    if (typeof p.imageUrl === "string" && p.imageUrl.length > MAX_IMAGE_LENGTH) return `El logo de "${p.name}" es demasiado grande.`;
  }

  const beneficios = Array.isArray(body.beneficios?.items) ? body.beneficios.items : [];
  if (beneficios.length > MAX_BENEFICIOS) return `Máximo ${MAX_BENEFICIOS} beneficios.`;

  const productos = Array.isArray(body.productos?.items) ? body.productos.items : [];
  if (productos.length > MAX_PRODUCTOS) return `Máximo ${MAX_PRODUCTOS} tipos de producto.`;

  const columns = Array.isArray(body.comparativa?.columns) ? body.comparativa.columns : [];
  if (columns.length > MAX_COMPARATIVA_COLUMNS) return `Máximo ${MAX_COMPARATIVA_COLUMNS} columnas en la comparativa.`;
  const rows = Array.isArray(body.comparativa?.rows) ? body.comparativa.rows : [];
  if (rows.length > MAX_COMPARATIVA_ROWS) return `Máximo ${MAX_COMPARATIVA_ROWS} filas en la comparativa.`;

  const imageFields = [body.hero?.imageUrl, body.bannerIntermedio?.imageUrl];
  for (const url of imageFields) {
    if (typeof url === "string" && url.length > MAX_IMAGE_LENGTH) return "Una de las imágenes principales es demasiado grande.";
  }
  return null;
}

// Plantilla usada por el admin al crear una landing nueva de un ramo
// distinto a salud: mismo shape con copy neutro/genérico y sin tarjetas de
// producto (no aplican fuera de salud).
export function blankLandingFor(producto: LandingProducto): LandingDraft {
  return {
    producto,
    status: "borrador",
    metaTitle: "",
    metaDescription: "",
    hideAssistant: false,
    phone: DEFAULT_LANDING_SALUD.phone,
    hero: { ...DEFAULT_HERO, h1: "", h1Highlight: "", priceHighlight: "", socialProof: "", imageUrl: "" },
    porQueElegir: { title: "", subtitle: "", partners: [] },
    beneficios: { title: "", items: [] },
    bannerIntermedio: { title: "", subtitle: "", imageUrl: "" },
    productos: { title: "", intro: "", items: [] },
    contrataTelefono: { title: "Contrata por teléfono", ctaLabel: "Llamadme gratis" },
    comparativa: { title: "", subtitle: "", columns: [], rows: [], initialVisibleRows: 0, verMasLabel: "Ver más", verMenosLabel: "Ver menos" },
    rating: { valor: "", numValoraciones: "" },
    resenas: { title: "Lo que dicen nuestros clientes", items: [] },
    footer: { ...DEFAULT_LANDING_SALUD.footer },
    utm: { source: "paid_ads", medium: "landing", campaign: "" },
  };
}
