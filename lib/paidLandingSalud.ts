// Configuración de la landing de captación PAID de salud (/lp/salud).
// Réplica del layout de la landing de Línea Directa Salud, adaptada a la
// marca Asegurados Ventajon. Toda su copia, imágenes, precios y filas de la
// comparativa se editan desde /admin/campanas/lp-salud sin desplegar.
//
// A diferencia de las landings SEO (lib/seoLandingPages.ts), esta va con
// robots noindex/nofollow: se sirve solo a tráfico de campañas de Paid Ads
// para no canibalizar el posicionamiento orgánico de /seguro-de-salud.

export type PaidLandingProduct = {
  // Identificador estable — se usa como key del CTA de cada tarjeta y como
  // valor de utm_content al saltar al tarificador (para saber qué tarjeta
  // pulsó el usuario).
  id: string;
  title: string;
  priceLabel: string; // "Desde" | "Por"
  price: string; // "19,90 €/mes y sin copagos"
  description: string;
  ctaLabel: string; // "Calcula tu seguro" | "Te llamamos gratis"
  ctaAction: "calcular" | "llamar";
};

export type PaidLandingComparativaRow = {
  label: string;
  // Un booleano por columna, en el mismo orden que `columns`. Longitudes
  // distintas se manejan como "no incluido" para columnas faltantes.
  incluidoEn: boolean[];
};

export type PaidLandingPartner = {
  name: string;
  // Data URI o URL externa. Se acepta cualquier cadena, la UI valida.
  imageUrl: string;
};

export type PaidLandingBenefit = {
  // Nombre de icono del set de components/icons.tsx (usa el mismo mapping
  // que exit-intents e IconByName). "" = sin icono.
  icon: string;
  text: string;
};

export type PaidLandingSaludConfig = {
  // Metadata para la etiqueta <title> y descripción SEO — aunque va con
  // noindex, algunos partners de anuncios sí muestran el title cuando el
  // usuario hace preview del enlace en WhatsApp / redes.
  metaTitle: string;
  metaDescription: string;

  // Teléfono comercial de la campaña (aparece en las sticky bars y en el
  // bloque "Contrata por teléfono"). Debe ser el número al que el equipo
  // reciba las llamadas de esta landing concreta — si es distinto del
  // general, se puede medir por separado.
  phone: string;

  hero: {
    kicker: string;
    h1: string;
    priceHighlight: string;
    socialProof: string;
    imageUrl: string;
    ctaCalcularLabel: string;
    ctaLlamarLabel: string;
  };

  porQueElegir: {
    title: string;
    subtitle: string;
    partners: PaidLandingPartner[];
  };

  beneficios: {
    title: string;
    items: PaidLandingBenefit[];
  };

  bannerIntermedio: {
    title: string;
    subtitle: string;
    imageUrl: string;
  };

  productos: {
    title: string;
    intro: string;
    items: PaidLandingProduct[];
  };

  contrataTelefono: {
    title: string;
    ctaLabel: string;
  };

  comparativa: {
    title: string;
    subtitle: string;
    columns: string[]; // ej: ["Salud Especialistas", "Salud Completo"]
    rows: PaidLandingComparativaRow[];
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

  footer: {
    disclaimer: string;
    enlaces: { label: string; href: string }[];
    copyright: string;
    notaLegal: string;
  };

  // Atribución auto-inyectada en los CTA "Calcula tu seguro". El link al
  // tarificador se compone como
  //   /tarificador?utm_source=UTM_SOURCE&utm_medium=UTM_MEDIUM&utm_campaign=UTM_CAMPAIGN&utm_content=<productId>
  // Ese UTM lo captura lib/attribution.ts y viaja con el lead al CRM.
  utm: {
    source: string;
    medium: string;
    campaign: string;
  };

  updatedAt: string;
};

export const DEFAULT_PAID_LANDING_SALUD: PaidLandingSaludConfig = {
  metaTitle: "Seguro de Salud para que tu salud no espere — Asegurados Ventajon",
  metaDescription:
    "Compara y elige tu Seguro de Salud desde 19,90 €/mes y sin copagos. Más de 1.000 centros y hospitales, 50.000 especialistas en toda España.",

  phone: "919 151 151",

  hero: {
    kicker: "",
    h1: "El Seguro de Salud para que tu salud no espere",
    priceHighlight: "Desde 19,90 €/mes y sin copagos",
    socialProof: "Más de 350.000 personas ya comparan con nosotros",
    imageUrl: "",
    ctaCalcularLabel: "Calcula tu seguro",
    ctaLlamarLabel: "Te llamamos gratis",
  },

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
      },
      {
        id: "completo",
        title: "Completo",
        priceLabel: "Desde",
        price: "38,90 €/mes y sin copagos",
        description: "Acceso a urgencias, intervenciones quirúrgicas y tratamientos complejos.",
        ctaLabel: "Calcula tu seguro",
        ctaAction: "calcular",
      },
      {
        id: "dental",
        title: "Dental",
        priceLabel: "Por",
        price: "4,84 €/mes",
        description: "Tu sonrisa en las mejores manos, a un precio muy económico.",
        ctaLabel: "Te llamamos gratis",
        ctaAction: "llamar",
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

  updatedAt: "",
};

// URL del tarificador con la UTM auto-inyectada. Reutilizable desde el
// componente público y desde el editor (para mostrar la URL final que verá
// el usuario al pulsar cualquier CTA "Calcula tu seguro").
export function buildTarificadorHref(config: PaidLandingSaludConfig, productId?: string): string {
  const params = new URLSearchParams({
    utm_source: config.utm.source,
    utm_medium: config.utm.medium,
    utm_campaign: config.utm.campaign,
  });
  if (productId) params.set("utm_content", productId);
  return `/tarificador?${params.toString()}`;
}
