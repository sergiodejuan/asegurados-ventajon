// Configuración de la landing "igualación de precio" (/precio-mejor-garantizado).
// Editable desde /admin/campanas/precio-mejor sin desplegar. Este flujo busca
// captar al usuario que YA tiene un presupuesto de otra compañía y ofrecerle
// que se lo estudiemos para buscarle una alternativa igual o mejor.
//
// Importante en el copy: la palabra "garantizado" del título comercial se
// matiza en el disclaimer legal — legalmente prometemos ESTUDIO y RESPUESTA,
// no igualación matemática de cualquier precio (evita reclamaciones AEPD /
// DGSFP por publicidad engañosa).

export type PriceMatchStep = {
  title: string;
  description: string;
  // Nombre de icono del set de components/icons.tsx (mismo mapeo que
  // exit-intents e IconByName). "" = sin icono.
  icon: string;
};

export type PriceMatchFaqItem = {
  q: string;
  a: string;
};

export type PriceMatchLandingConfig = {
  metaTitle: string;
  metaDescription: string;
  // Si va con noindex: sirve solo a paid ads. Si va indexable: aparece en
  // Google (más tráfico orgánico long-tail pero compite con SEO propio de
  // /seguro-de-salud). Configurable — por defecto INDEXABLE porque el
  // valor SEO de "igualamos precio seguro salud" no lo tiene ninguna
  // otra ruta del sitio.
  robotsIndex: boolean;

  hero: {
    kicker: string; // "MEJOR PRECIO GARANTIZADO", "IGUALACIÓN DE PRIMA"...
    h1: string;
    // Fragmento del H1 que va en rojo (mismo mecanismo que lp/salud).
    h1Highlight: string;
    subtitle: string;
    imageUrl: string;
  };

  compromisoBadges: {
    label: string;
    // Icono opcional del set IconByName. "" = solo texto.
    icon: string;
  }[];

  comoFunciona: {
    title: string;
    steps: PriceMatchStep[];
  };

  socialProof: {
    title: string;
    // Datos honestos: en X% de casos igualamos o mejoramos. Nunca
    // "siempre igualamos" — sería engañoso.
    valor: string;
    numValoraciones: string;
    testimonios: { texto: string; autor: string }[];
  };

  formularioTitle: string;
  formularioSubtitle: string;

  faq: {
    title: string;
    items: PriceMatchFaqItem[];
  };

  // Disclaimer legal cuidadoso: se puede editar pero el default ya está
  // redactado para minimizar riesgo legal (compromiso de estudio, no de
  // precio garantizado matemáticamente).
  disclaimer: string;

  footer: {
    enlaces: { label: string; href: string }[];
    copyright: string;
  };

  utm: {
    source: string;
    medium: string;
    campaign: string;
  };

  updatedAt: string;
};

export const DEFAULT_PRICE_MATCH_LANDING: PriceMatchLandingConfig = {
  metaTitle: "Enséñanos tu precio y te ofrecemos la mejor alternativa del mercado — Asegurados Ventajon",
  metaDescription:
    "¿Ya tienes un presupuesto de seguro? Envíanoslo y estudiamos la mejor alternativa del mercado sin compromiso, en menos de 24 horas.",
  robotsIndex: true,

  hero: {
    kicker: "SIN COMPROMISO · RESPUESTA EN 24 H",
    h1: "Enséñanos tu precio y te ofrecemos la mejor alternativa del mercado",
    h1Highlight: "la mejor alternativa del mercado",
    subtitle:
      "Sube tu presupuesto actual — de cualquier aseguradora — y nuestro equipo te busca la opción más ajustada entre las principales compañías. Gratis y sin cambiar nada hasta que digas sí.",
    imageUrl: "",
  },

  compromisoBadges: [
    { label: "Respuesta en menos de 24 h", icon: "compare" },
    { label: "Gratis y sin compromiso", icon: "shield" },
    { label: "Sin cambiar de aseguradora hasta que decidas", icon: "doc" },
  ],

  comoFunciona: {
    title: "Cómo funciona",
    steps: [
      {
        icon: "doc",
        title: "1. Sube tu presupuesto o cuéntanos el precio",
        description: "Envíanos una foto o el PDF de tu presupuesto actual (o simplemente el precio y la compañía). Toda la información va cifrada y solo la ve tu asesor.",
      },
      {
        icon: "compare",
        title: "2. Estudiamos el mercado por ti",
        description: "Un asesor humano compara tu perfil entre nuestras aseguradoras aliadas y te propone la alternativa más ajustada en precio y coberturas.",
      },
      {
        icon: "shield",
        title: "3. Tú decides sin compromiso",
        description: "Recibes la propuesta por email o WhatsApp en menos de 24 h. Si te encaja, gestionamos el cambio; si no, no pasa nada.",
      },
    ],
  },

  socialProof: {
    title: "Miles de personas ya nos han encargado que les busquemos precio",
    valor: "4,7/5",
    numValoraciones: "según los clientes ya asesorados",
    testimonios: [
      {
        texto: "Me llamaron a las pocas horas con una propuesta más ajustada que la renovación que me habían mandado. Cerré con ellos sin papeleo.",
        autor: "Marta P., Las Palmas",
      },
      {
        texto: "Me dijeron con franqueza que no podían bajar de lo que ya tenía, pero me explicaron por qué. Transparencia total.",
        autor: "Carlos R., Palma de Mallorca",
      },
    ],
  },

  formularioTitle: "Envíanos tu presupuesto",
  formularioSubtitle:
    "Rellénalo en menos de 1 minuto. Te contactamos en las próximas 24 horas.",

  faq: {
    title: "Preguntas frecuentes",
    items: [
      {
        q: "¿Vais a igualar exactamente el precio que tengo?",
        a: "No prometemos igualar cualquier precio de forma automática. Lo que hacemos es estudiar tu perfil concreto entre las principales aseguradoras del mercado y proponerte la mejor alternativa posible en cuanto a precio y coberturas. En muchos casos igualamos o mejoramos; en otros, os explicamos con transparencia por qué no es posible y qué recomendamos.",
      },
      {
        q: "¿Cuánto tiempo tarda la respuesta?",
        a: "Nuestro compromiso es responderte en menos de 24 horas laborables (lunes a viernes, 9:00 a 20:00 hora canaria). En la mayoría de casos te llegamos con propuesta en el mismo día.",
      },
      {
        q: "¿Es gratis?",
        a: "Sí, el estudio es totalmente gratuito y sin compromiso. Solo cobramos la comisión estándar de la aseguradora si finalmente contratas a través de nosotros — nunca te cobramos por el estudio.",
      },
      {
        q: "¿Qué pasa si mi renovación caduca en breve?",
        a: "Prioridad absoluta. Márcanoslo en el campo de comentarios y trabajamos tu caso el mismo día. Podemos gestionar la baja de tu póliza actual sin que tengas periodos sin cobertura.",
      },
      {
        q: "¿Con qué aseguradoras trabajáis?",
        a: "Trabajamos con las principales aseguradoras del mercado español: Mapfre, Adeslas, Asisa, Zurich, Generali y otras — el catálogo depende del producto (salud, vida, auto, decesos, hogar).",
      },
      {
        q: "¿Qué pasa con mis datos?",
        a: "Cumplimos el RGPD al 100%. Tus datos solo los ve el asesor asignado y las aseguradoras que consultamos con tu autorización explícita. Nunca los cedemos a terceros con fines publicitarios sin tu consentimiento expreso.",
      },
    ],
  },

  disclaimer:
    "El compromiso ofrecido en esta página es de ESTUDIO gratuito y sin compromiso, y de RESPUESTA en menos de 24 horas laborables. La cotización final concreta que ofrezcamos depende del perfil del asegurado, del producto elegido y de las normas de suscripción de cada aseguradora aliada — no garantizamos igualar ni mejorar todos los precios de forma automática. La contratación de cualquier póliza queda supeditada a la aceptación previa de la aseguradora correspondiente.",

  footer: {
    enlaces: [
      { label: "Aviso Legal", href: "/legal" },
      { label: "Política de Cookies", href: "/legal#cookies" },
      { label: "Política de Privacidad", href: "/legal#privacidad" },
    ],
    copyright: "© Asegurados Ventajon",
  },

  utm: {
    source: "paid_ads",
    medium: "landing",
    campaign: "price-match",
  },

  updatedAt: "",
};
