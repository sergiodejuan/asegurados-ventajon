// Configuración de la landing del programa "Amigos Ventajon" (/referidos).
// Editable desde /admin/campanas/referidos sin desplegar. Este flujo capta
// nuevos leads a través de la recomendación de clientes YA contratados —
// el CAC objetivo es la mitad del de paid ads.
//
// Doble incentivo simétrico:
//   · El REFERIDO (el amigo) recibe 20€ Amazon eGift al completar una
//     cotización + doble opt-in por email.
//   · El REFERIDOR (el cliente contratado que invita) recibe 20€ Amazon
//     eGift cuando el amigo contrata una póliza y supera 30 días de
//     vigencia (evita cancelaciones fake).
//
// Los importes son EDITABLES desde admin porque estacionalmente pueden
// subir (verano familia, back-to-school) — no hardcodear en el frontend.

export type ReferralFaqItem = {
  q: string;
  a: string;
};

export type ReferralStep = {
  // Nombre de icono del set de components/icons.tsx (mismo mapeo que
  // exit-intents e IconByName). "" = sin icono.
  icon: string;
  title: string;
  description: string;
};

export type ReferralLandingConfig = {
  // Interruptor global: si el programa está PAUSADO, la landing muestra
  // un mensaje "vuelve pronto" y el modal de invitación queda bloqueado.
  // Útil para pausar en periodos donde el equipo no puede procesar bonos
  // o mientras se refina la campaña.
  programaActivo: boolean;

  metaTitle: string;
  metaDescription: string;
  // La landing pública genérica /referidos ES INDEXABLE (SEO valor
  // "programa referidos seguros"). Las landings personalizadas /r/[slug]
  // siempre van noindex (no queremos que Google indexe páginas con
  // nombre del referidor).
  robotsIndex: boolean;

  // Cifra de incentivo — editable para poder subir/bajar en promos
  // estacionales sin desplegar. Se muestran en el hero y en "cómo
  // funciona". Formato: número puro (sin símbolo €), la UI lo pinta.
  incentivo: {
    // Cuánto recibe el amigo al cotizar + opt-in.
    montoReferido: number;
    // Cuánto recibe el cliente que refiere cuando el amigo contrata.
    montoReferidor: number;
    // Tipo de recompensa mostrada al usuario (por si en el futuro cambiamos
    // a Bizum o descuento en cuota). Solo copy — el motor de pago está
    // acoplado en /api/referral/*.
    tipo: string; // "Amazon eGift", "Bizum", etc.
    // Días de gracia tras contratación del amigo antes de pagar al
    // referidor. 30 días es el estándar del sector (Línea Directa 60d,
    // Amazon Prime 14d).
    graciaContratacionDias: number;
    // Cap anual de conversiones por referidor (protección anti-farming).
    capAnualPorReferidor: number;
  };

  hero: {
    kicker: string; // "PROGRAMA AMIGOS VENTAJON", etc.
    h1: string;
    // Fragmento del H1 que va en rojo (mismo mecanismo que lp/salud y
    // price-match — busca coincidencia literal y la resalta).
    h1Highlight: string;
    subtitle: string;
    imageUrl: string;
  };

  compromisoBadges: {
    label: string;
    icon: string;
  }[];

  comoFunciona: {
    title: string;
    steps: ReferralStep[];
  };

  socialProof: {
    title: string;
    valor: string; // "4,7/5" o similar
    numValoraciones: string;
    testimonios: { texto: string; autor: string }[];
  };

  // Bloque del CTA principal. En la landing genérica /referidos aparece
  // debajo del hero e invita al usuario a "generar mi enlace personal".
  // Si el usuario ya es cliente contratado, el CTA le lleva directo al
  // modal de invitación. Si no lo es, le lleva a login/cotizar (no
  // puede referir sin ser cliente — política del programa).
  cta: {
    tituloClienteContratado: string; // "Genera tu enlace y llévate 20€ por amigo"
    tituloNoCliente: string; // "Primero conviértete en cliente Ventajon"
    subtituloClienteContratado: string;
    subtituloNoCliente: string;
    botonClienteContratado: string; // "Invitar a un amigo"
    botonNoCliente: string; // "Calcular mi seguro"
  };

  // Mensaje pre-rellenado que se abre al hacer clic en el botón de
  // WhatsApp del modal. Placeholders: {nombre}, {link}, {monto}.
  // El usuario puede editarlo antes de enviar (no lo bloqueamos).
  mensajeCompartir: {
    whatsapp: string;
    email: {
      asunto: string;
      cuerpo: string;
    };
  };

  faq: {
    title: string;
    items: ReferralFaqItem[];
  };

  // Disclaimer legal claro: 20€ Amazon eGift NO es dinero en metálico
  // (fiscalidad diferente — no computa como rendimiento del trabajo hasta
  // cierto umbral), y los términos del programa pueden cambiar. Redactado
  // para minimizar riesgo AEPD / Consumo.
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

export const DEFAULT_REFERRAL_LANDING: ReferralLandingConfig = {
  programaActivo: true,

  metaTitle: "Programa Amigos — Invita a un amigo y llévate 20€ · Asegurados Ventajon",
  metaDescription:
    "¿Ya eres cliente? Recomienda Asegurados Ventajon a un amigo. Vosotros os lleváis 20€ Amazon cada uno cuando contrate. Sin límite de amigos hasta 10 al año.",
  robotsIndex: true,

  incentivo: {
    montoReferido: 20,
    montoReferidor: 20,
    tipo: "Amazon eGift",
    graciaContratacionDias: 30,
    capAnualPorReferidor: 10,
  },

  hero: {
    kicker: "PROGRAMA AMIGOS VENTAJON",
    h1: "Invita a un amigo y os lleváis 20€ Amazon cada uno",
    h1Highlight: "20€ Amazon cada uno",
    subtitle:
      "Recomienda a un amigo o familiar. Cuando pida su presupuesto en Ventajon, él recibe 20€ Amazon al momento; tú, otros 20€ cuando contrate su póliza. Hasta 10 amigos al año.",
    imageUrl: "",
  },

  compromisoBadges: [
    { label: "20€ Amazon para tu amigo al cotizar", icon: "gift" },
    { label: "20€ Amazon para ti al contratar", icon: "gift" },
    { label: "Hasta 10 amigos al año — 400€ posibles", icon: "shield" },
  ],

  comoFunciona: {
    title: "Cómo funciona",
    steps: [
      {
        icon: "compare",
        title: "1. Genera tu enlace personal",
        description:
          "Desde tu área de cliente o en esta página, con un clic. Recibirás un enlace único como ventajon.com/r/tu-codigo y un código corto para WhatsApp.",
      },
      {
        icon: "chat",
        title: "2. Compártelo con tu amigo",
        description:
          "Por WhatsApp, email o el canal que prefieras. Tu amigo entra, pide su comparativa de precios y recibe 20€ Amazon al validar su email.",
      },
      {
        icon: "gift",
        title: "3. Cobrad los dos",
        description:
          "Cuando tu amigo contrate su póliza y supere 30 días de vigencia, te enviamos tus 20€ Amazon por email automáticamente. Sin papeleo.",
      },
    ],
  },

  socialProof: {
    title: "Ya somos muchas familias asegurando juntas",
    valor: "4,7/5",
    numValoraciones: "según los clientes que ya han recomendado",
    testimonios: [
      {
        texto:
          "Recomendé Ventajon a mi hermana en Tenerife. Llegó su vale de Amazon el mismo día que firmó la póliza. Ella cobró el suyo al pedir el presupuesto. Cero rollos.",
        autor: "Marta P., Las Palmas",
      },
      {
        texto:
          "Comparto Ventajon con quien me pregunta por seguros. En un año ya he invitado a 4 amigos: pagas mucho menos por la comida del sábado con lo que gano.",
        autor: "Carlos R., Palma de Mallorca",
      },
    ],
  },

  cta: {
    tituloClienteContratado: "Tu enlace personal está listo",
    tituloNoCliente: "Solo los clientes Ventajon pueden invitar",
    subtituloClienteContratado:
      "Compártelo con quien creas que puede ahorrarnos con nosotros. Cobras 20€ por cada amigo que contrate.",
    subtituloNoCliente:
      "Primero calcula tu seguro con nosotros. Cuando tengas una póliza contratada, se activa automáticamente tu programa de referidos.",
    botonClienteContratado: "Invitar a un amigo",
    botonNoCliente: "Calcular mi seguro",
  },

  mensajeCompartir: {
    whatsapp:
      "Te recomiendo Asegurados Ventajon para tu seguro — a mí me ha ido muy bien. Con este enlace te regalan {monto}€ Amazon al pedir tu presupuesto: {link}",
    email: {
      asunto: "Te regalan 20€ Amazon si pides presupuesto con Asegurados Ventajon",
      cuerpo:
        "Hola,\n\nTe recomiendo Asegurados Ventajon para tu próximo seguro. Yo ya soy cliente y estoy contento con el trato y el precio.\n\nCon este enlace personal, te regalan {monto}€ Amazon solo por pedir tu comparativa de precios (sin compromiso, sin contratar nada):\n\n{link}\n\nUn abrazo,\n{nombre}",
    },
  },

  faq: {
    title: "Preguntas frecuentes",
    items: [
      {
        q: "¿Puedo referir aunque no sea cliente todavía?",
        a: "No. El programa está reservado a clientes con al menos una póliza contratada en Ventajon. Si aún no lo eres, calcula tu seguro primero — cuando contrates se activa automáticamente tu programa de referidos.",
      },
      {
        q: "¿Cuándo cobra mi amigo sus 20€?",
        a: "Al completar la comparativa de precios en la web y validar su email (le llega un correo de confirmación). Le enviamos el vale Amazon por email en 24-48 horas laborables.",
      },
      {
        q: "¿Cuándo cobro yo mis 20€?",
        a: "Cuando tu amigo contrate su póliza y ésta esté vigente durante 30 días (evitamos así cancelaciones inmediatas). Te enviamos el vale Amazon automáticamente al email que tengas registrado con nosotros.",
      },
      {
        q: "¿Hay un límite de amigos?",
        a: "Sí, puedes cobrar por hasta 10 amigos convertidos al año (hasta 400€ Amazon anuales). Puedes invitar a más personas, pero solo las 10 primeras que contraten cuentan para el pago del bono.",
      },
      {
        q: "¿Puedo darle mi enlace a mi pareja/familia que vive conmigo?",
        a: "Sí, sin problema. La única condición es que la persona no haya sido cliente Ventajon anteriormente (no cuentan renovaciones ni reactivaciones). Tampoco puedes usar tu propio código para pedirte un seguro tú mismo.",
      },
      {
        q: "¿Y si mi amigo cancela después?",
        a: "Si cancela en los primeros 30 días desde la contratación (los que llamamos periodo de gracia), el bono no se abona ni a ti ni a él. Después de esos 30 días, el bono es firme aunque cambie luego de seguro.",
      },
      {
        q: "¿Los 20€ Amazon tributan en el IRPF?",
        a: "Los vales-regalo pueden considerarse rendimiento en especie por la Agencia Tributaria si superas ciertos umbrales anuales por persona. En cualquier caso, la responsabilidad fiscal de declarar es del receptor. Consulta a tu asesor si tienes dudas.",
      },
      {
        q: "¿Qué pasa con los datos de mi amigo?",
        a: "Nosotros no le pedimos NADA a tu amigo hasta que él mismo entra en la web y decide compartir sus datos. Cumplimos el art. 21 LSSI: tú compartes el enlace solo con quien te consta que quiere recibirlo. Nunca añadimos su email a nuestras listas sin su consentimiento explícito.",
      },
    ],
  },

  disclaimer:
    "Programa promocional operado por Asegurados Ventajon. Los importes ofrecidos se abonan mediante vale-regalo Amazon.es enviado por email. Sujeto a los términos del programa, disponibles en /legal#referidos. El programa puede modificarse o cancelarse en cualquier momento sin efecto retroactivo sobre los bonos ya devengados. La responsabilidad fiscal del receptor de los vales-regalo es individual. Ventajon no tiene relación con Amazon más allá de ser un canal de entrega del incentivo. Solo pueden participar como referidores los clientes con al menos una póliza vigente contratada con Ventajon; solo pueden participar como referidos personas mayores de edad que no hayan sido clientes de Ventajon anteriormente.",

  footer: {
    enlaces: [
      { label: "Aviso Legal", href: "/legal" },
      { label: "Política de Cookies", href: "/legal#cookies" },
      { label: "Política de Privacidad", href: "/legal#privacidad" },
      { label: "Términos del programa", href: "/legal#referidos" },
    ],
    copyright: "© Asegurados Ventajon",
  },

  utm: {
    source: "referral",
    medium: "friend",
    campaign: "amigos-ventajon",
  },

  updatedAt: "",
};
