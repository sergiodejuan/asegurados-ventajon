// Landings de captación pura (SEO / AEO / GEO) del seguro de salud —
// ocultas del menú de navegación a propósito: se llega a ellas por
// buscadores, IA generativa o enlaces directos, no navegando por la web.
// Cada una embebe el tarificador completo y una calculadora de ahorro en la
// misma página (ver components/SeoLandingPage.tsx), sin enlazar a otra URL
// para completar el proceso.
//
// "priceMode" resuelve el precio que se muestra: "fixed" usa el dato de
// referencia dado por Sergio para Canarias (35 €/mes por asegurado, con
// todas las coberturas); "dynamic" calcula el precio real más bajo entre
// las compañías activas en /admin/productos (ver getStartingSaludPrice en
// lib/store.ts), para no depender de una cifra que se quede desactualizada.

import { getStartingSaludPrice } from "./store";
import { getProductPage } from "./productPages";

export type PriceMode =
  | { kind: "fixed"; perAsegurado: number }
  | { kind: "dynamic"; tipo: "con_copago" | "sin_copago" };

export type SeoFaqItem = { q: string; a: string };

export type SeoLandingPageData = {
  slug: string;
  path: string;
  metaTitle: string;
  metaDescription: string;
  badge: string;
  h1: string;
  subheadline: string;
  // Caja de "respuesta rápida" justo bajo el hero: 2-3 frases que responden
  // directamente a la pregunta principal de la página, en el formato que
  // motores de respuesta (Google SGE, Perplexity, ChatGPT…) suelen citar
  // literalmente. "{precio}" se sustituye por el precio ya resuelto.
  quickAnswerTemplate: string;
  priceMode: PriceMode;
  geo?: { islandName: string; localidades: string[]; localIntro: string };
  faq: SeoFaqItem[];
  seoIntro: string;
  seoSections: { h2: string; p: string }[];
};

const FALLBACK_PRICE = 35;

export async function resolvePrice(page: SeoLandingPageData): Promise<number> {
  if (page.priceMode.kind === "fixed") return page.priceMode.perAsegurado;
  const precio = await getStartingSaludPrice(page.priceMode.tipo);
  return precio ?? FALLBACK_PRICE;
}

export function priceLine(precio: number): string {
  return `Desde ${precio} €/mes asegurado, con todas las coberturas`;
}

const CANARIAS_ISLA_FAQ_BASE: SeoFaqItem[] = [
  { q: "¿Qué pasa si necesito un especialista que no está disponible en la isla?", a: "Algunas pólizas incluyen cobertura de traslado sanitario a otra isla o a la península cuando una prueba o especialista no está disponible donde vives. Te lo confirmamos según la compañía antes de que decidas." },
];

export const SEO_LANDING_PAGES: SeoLandingPageData[] = [
  {
    slug: "las-palmas",
    path: "/seguro-de-salud-las-palmas",
    metaTitle: "Seguro de salud en Las Palmas de Gran Canaria desde 35 €/mes — Asegurados Ventajon",
    metaDescription: "Compara tu seguro de salud en Las Palmas de Gran Canaria. Desde 35 €/mes por asegurado, con todas las coberturas. Calcula tu precio real en 1 minuto, sin compromiso.",
    badge: "Seguro de salud en Las Palmas",
    h1: "Seguro de salud en Las Palmas de Gran Canaria desde 35 €/mes",
    subheadline: "Comparamos entre las mejores compañías de salud para que pagues lo justo, con cuadro médico pensado para la capital y su área metropolitana.",
    quickAnswerTemplate: "Un seguro de salud en Las Palmas de Gran Canaria cuesta {precio}, según edad, número de asegurados y si incluye dental o cobertura internacional. Asegurados Ventajon compara entre las principales compañías (Mapfre, Adeslas, Asisa, Zurich, Generali) y te da tu precio real en menos de 1 minuto, sin compromiso.",
    priceMode: { kind: "fixed", perAsegurado: FALLBACK_PRICE },
    geo: {
      islandName: "Las Palmas de Gran Canaria",
      localidades: ["Las Palmas de Gran Canaria", "Vegueta", "Triana", "Ciudad Alta", "Tafira", "Telde", "Santa Brígida"],
      localIntro:
        "En la capital, la oferta de centros médicos privados es más amplia que en el resto de la isla, pero no todas las compañías tienen el mismo cuadro médico concertado en cada zona. Comparamos el cuadro médico y las especialidades disponibles cerca de ti, y revisamos si tu póliza cubre el traslado sanitario a otra isla o a la península si alguna prueba o especialista no está disponible en Las Palmas.",
    },
    faq: [
      { q: "¿Cuánto cuesta un seguro de salud en Las Palmas de Gran Canaria?", a: "Desde 35 €/mes por asegurado, con todas las coberturas. El precio final depende de tu edad, el número de personas a asegurar y si añades dental o cobertura internacional. Calcula tu precio exacto en el formulario de esta misma página." },
      { q: "¿Hay diferencias de cobertura entre Las Palmas y el resto de Gran Canaria?", a: "Sí, algunas compañías tienen más especialistas concertados en la capital que en el sur o el norte de la isla. Te ayudamos a comparar el cuadro médico real de tu zona antes de contratar." },
      ...CANARIAS_ISLA_FAQ_BASE,
    ],
    seoIntro:
      "Contratar un seguro de salud en Las Palmas de Gran Canaria a ciegas, con el primero que te ofrezcan, suele salir caro. Asegurados Ventajon es una correduría de seguros: comparamos tu perfil entre varias compañías y te ayudamos a elegir la póliza que de verdad se ajusta a lo que necesitas, no la que más comisión deja.",
    seoSections: [
      { h2: "¿Qué influye en el precio de un seguro de salud en Las Palmas?", p: "La edad y el número de personas a asegurar son los factores que más pesan, seguidos de la cobertura elegida (dental incluido o no, cuadro médico, cobertura internacional…). Vivir en la capital no encarece la póliza en sí, pero sí conviene revisar qué centros médicos concretos están concertados en tu barrio." },
      { h2: "¿Por qué comparar con Asegurados Ventajon en Las Palmas?", p: "Somos correduría, no agentes de una única aseguradora: estamos de tu lado, no del de la compañía. Trabajamos en toda Gran Canaria, con atención especial a la capital y su área metropolitana." },
    ],
  },
  {
    slug: "tenerife",
    path: "/seguro-de-salud-tenerife",
    metaTitle: "Seguro de salud en Tenerife desde 35 €/mes — Asegurados Ventajon",
    metaDescription: "Compara tu seguro de salud en Tenerife. Desde 35 €/mes por asegurado, con todas las coberturas. Calcula tu precio real en 1 minuto, sin compromiso.",
    badge: "Seguro de salud en Tenerife",
    h1: "Seguro de salud en Tenerife desde 35 €/mes",
    subheadline: "Comparamos entre las mejores compañías de salud para que pagues lo justo, con cuadro médico y cobertura pensados para vivir en la isla.",
    quickAnswerTemplate: "Un seguro de salud en Tenerife cuesta {precio}, según edad, número de asegurados y si incluye dental o cobertura internacional. Asegurados Ventajon compara entre las principales compañías (Mapfre, Adeslas, Asisa, Zurich, Generali) y te da tu precio real en menos de 1 minuto, sin compromiso.",
    priceMode: { kind: "fixed", perAsegurado: FALLBACK_PRICE },
    geo: {
      islandName: "Tenerife",
      localidades: ["Santa Cruz de Tenerife", "La Laguna", "Puerto de la Cruz", "Adeje", "Los Cristianos", "Arona"],
      localIntro:
        "En Tenerife, la disponibilidad real de especialistas y hospitales concertados no es la misma en Santa Cruz o La Laguna que en el sur de la isla. Comparamos el cuadro médico de cada compañía en tu zona —norte o sur— y revisamos si tu póliza cubre el traslado sanitario a otra isla o a la península cuando una prueba o especialista no está disponible cerca de ti.",
    },
    faq: [
      { q: "¿Cuánto cuesta un seguro de salud en Tenerife?", a: "Desde 35 €/mes por asegurado, con todas las coberturas. El precio final depende de tu edad, el número de personas a asegurar y si añades dental o cobertura internacional. Calcula tu precio exacto en el formulario de esta misma página." },
      { q: "¿Tenéis cobertura de seguros de salud en toda la isla de Tenerife?", a: "Sí, trabajamos con tu código postal exacto, tanto si vives en el área metropolitana (Santa Cruz, La Laguna) como en el sur (Adeje, Los Cristianos, Arona) o el norte de la isla." },
      ...CANARIAS_ISLA_FAQ_BASE,
    ],
    seoIntro:
      "Contratar un seguro de salud en Tenerife a ciegas, con el primero que te ofrezcan, suele salir caro. Asegurados Ventajon es una correduría de seguros: comparamos tu perfil entre varias compañías y te ayudamos a elegir la póliza que de verdad se ajusta a lo que necesitas, no la que más comisión deja.",
    seoSections: [
      { h2: "¿Qué influye en el precio de un seguro de salud en Tenerife?", p: "La edad y el número de personas a asegurar son los factores que más pesan, seguidos de la cobertura elegida (dental incluido o no, cuadro médico, cobertura internacional…). Por eso una comparativa genérica dice poco: lo que importa es tu comparativa, con tus datos." },
      { h2: "¿Por qué comparar con Asegurados Ventajon en Tenerife?", p: "Somos correduría, no agentes de una única aseguradora: estamos de tu lado, no del de la compañía. Trabajamos en toda la isla, norte y sur, dentro del ecosistema Ventajon." },
    ],
  },
  {
    slug: "mallorca",
    path: "/seguro-de-salud-mallorca",
    metaTitle: "Seguro de salud en Mallorca — Asegurados Ventajon",
    metaDescription: "Compara tu seguro de salud en Mallorca entre las mejores compañías. Calcula tu precio real en 1 minuto, sin compromiso.",
    badge: "Seguro de salud en Mallorca",
    h1: "Seguro de salud en Mallorca, comparado por un experto",
    subheadline: "Comparamos entre las mejores compañías de salud para que pagues lo justo, con cuadro médico pensado para vivir en la isla.",
    quickAnswerTemplate: "Un seguro de salud en Mallorca cuesta {precio}, según edad, número de asegurados y si incluye dental o cobertura internacional. Asegurados Ventajon compara entre las principales compañías (Mapfre, Adeslas, Asisa, Zurich, Generali) y te da tu precio real en menos de 1 minuto, sin compromiso.",
    priceMode: { kind: "dynamic", tipo: "con_copago" },
    geo: {
      islandName: "Mallorca",
      localidades: ["Palma de Mallorca", "Calvià", "Manacor", "Inca", "Llucmajor", "Marratxí"],
      localIntro:
        "En Mallorca, la mayor parte del cuadro médico privado se concentra en Palma, pero conviene revisar la cobertura disponible si vives en otros municipios de la isla. Si tienes que desplazarte a Menorca, Ibiza o Formentera, o incluso a la península, para una prueba o especialista concreto, también revisamos si tu póliza cubre ese traslado.",
    },
    faq: [
      { q: "¿Cuánto cuesta un seguro de salud en Mallorca?", a: "El precio depende de tu edad, el número de personas a asegurar y si añades dental o cobertura internacional. Calcula tu precio exacto y actualizado en el formulario de esta misma página, sin compromiso." },
      { q: "¿Tenéis cobertura de seguros de salud en toda Mallorca?", a: "Sí, trabajamos con tu código postal exacto, tanto si vives en Palma como en el resto de municipios de la isla." },
      { q: "¿Qué pasa si necesito un especialista que no está en Mallorca?", a: "Algunas pólizas cubren el traslado sanitario a otra isla del archipiélago balear o a la península cuando una prueba o especialista no está disponible donde vives. Te lo confirmamos según la compañía antes de que decidas." },
    ],
    seoIntro:
      "Contratar un seguro de salud en Mallorca a ciegas, con el primero que te ofrezcan, suele salir caro. Asegurados Ventajon es una correduría de seguros: comparamos tu perfil entre varias compañías y te ayudamos a elegir la póliza que de verdad se ajusta a lo que necesitas, no la que más comisión deja.",
    seoSections: [
      { h2: "¿Qué influye en el precio de un seguro de salud en Mallorca?", p: "La edad y el número de personas a asegurar son los factores que más pesan, seguidos de la cobertura elegida (dental incluido o no, cuadro médico, cobertura internacional…). Por eso una comparativa genérica dice poco: lo que importa es tu comparativa, con tus datos." },
      { h2: "¿Por qué comparar con Asegurados Ventajon en Mallorca?", p: "Somos correduría, no agentes de una única aseguradora: estamos de tu lado, no del de la compañía. Trabajamos en toda España, con cercanía especial en Canarias y Baleares." },
    ],
  },
  {
    slug: "barato",
    path: "/seguro-de-salud-barato",
    metaTitle: "Seguro de salud barato: compara precios reales — Asegurados Ventajon",
    metaDescription: "Compara tu seguro de salud barato entre las mejores compañías, sin letra pequeña. Calcula tu precio real en 1 minuto, sin compromiso.",
    badge: "Seguro de salud barato",
    h1: "Seguro de salud barato, comparado sin letra pequeña",
    subheadline: "Comparamos entre las mejores compañías de salud para encontrar tu precio más bajo real, sin recortar coberturas por sorpresa.",
    quickAnswerTemplate: "El seguro de salud más barato entre nuestras compañías comparadas está {precio}, según edad, número de asegurados y coberturas elegidas. Un precio bajo no tiene por qué significar menos cobertura: comparamos entre varias aseguradoras para encontrar el equilibrio justo entre precio y lo que realmente cubre tu póliza.",
    priceMode: { kind: "dynamic", tipo: "con_copago" },
    faq: [
      { q: "¿Cuál es el seguro de salud más barato?", a: "Depende de tu perfil: edad, número de asegurados y coberturas elegidas. No existe un \"más barato\" igual para todos — comparamos tu caso concreto entre varias compañías y te damos tu precio real en el formulario de esta página." },
      { q: "¿Un seguro de salud barato tiene menos cobertura?", a: "No necesariamente. El precio varía sobre todo por si es con o sin copago, la edad del asegurado y si incluye extras como dental. Te explicamos exactamente qué cubre cada opción antes de que decidas, sin sorpresas." },
      { q: "¿Qué es un seguro de salud con copago y por qué es más barato?", a: "Con copago, pagas una prima mensual más baja pero aportas una pequeña cantidad cada vez que usas el médico. Sin copago, la prima es algo más alta pero no pagas nada extra. Te ayudamos a calcular cuál compensa según cuánto uses el médico." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No. La comparativa y el asesoramiento son gratuitos y sin compromiso de contratación." },
    ],
    seoIntro:
      "Buscar el seguro de salud \"barato\" con el primer buscador de precios suele salir caro a la larga: muchas comparativas genéricas no tienen en cuenta tu perfil real ni te explican qué te estás dejando fuera. Asegurados Ventajon es una correduría de seguros: comparamos tu perfil entre varias compañías para encontrar el precio más bajo real, sin letra pequeña.",
    seoSections: [
      { h2: "¿Cómo encontrar un seguro de salud barato sin perder cobertura?", p: "La clave está en comparar con tus datos reales (edad, número de asegurados, si necesitas dental) en vez de fiarte de un precio genérico de anuncio. Con copago suele ser la opción más económica si usas poco el médico; sin copago compensa si lo usas con frecuencia." },
      { h2: "¿Por qué comparar con Asegurados Ventajon?", p: "Somos correduría, no agentes de una única aseguradora: comparamos por ti entre las mejores compañías del país y te explicamos en claro qué cubre cada póliza, sin trucos ni letra pequeña." },
    ],
  },
  {
    slug: "barato-sin-copagos",
    path: "/seguro-de-salud-barato-sin-copagos",
    metaTitle: "Seguro de salud barato sin copagos desde 35 €/mes — Asegurados Ventajon",
    metaDescription: "Compara tu seguro de salud sin copagos al mejor precio. Desde 35 €/mes por asegurado, con todas las coberturas. Calcula tu precio real en 1 minuto.",
    badge: "Seguro de salud sin copagos",
    h1: "Seguro de salud barato sin copagos, desde 35 €/mes",
    subheadline: "Comparamos entre las mejores compañías de salud sin copago para que no pagues nada extra cada vez que vas al médico.",
    quickAnswerTemplate: "Un seguro de salud sin copagos cuesta {precio}, con todas las coberturas y sin pagar nada extra cada vez que usas el médico. Asegurados Ventajon compara entre las principales compañías (Mapfre, Adeslas, Asisa, Zurich, Generali) y te da tu precio real en menos de 1 minuto, sin compromiso.",
    priceMode: { kind: "fixed", perAsegurado: FALLBACK_PRICE },
    faq: [
      { q: "¿Qué significa un seguro de salud \"sin copagos\"?", a: "Que no pagas ninguna cantidad extra cada vez que vas al médico, haces una prueba o te ingresan: la prima mensual lo incluye todo. A cambio, la cuota suele ser algo más alta que la modalidad con copago." },
      { q: "¿Cuánto cuesta un seguro de salud sin copagos?", a: "Desde 35 €/mes por asegurado, con todas las coberturas. El precio final depende de tu edad, el número de personas a asegurar y si añades dental o cobertura internacional. Calcula tu precio exacto en el formulario de esta misma página." },
      { q: "¿Compensa pagar sin copago si voy poco al médico?", a: "Si usas poco el médico, un seguro con copago suele salir más barato en el cómputo anual. Sin copago compensa si vas con frecuencia o prefieres no tener ningún gasto sorpresa. Te ayudamos a calcular cuál te conviene según tu caso." },
      { q: "¿Tiene algún coste comparar con vosotros?", a: "No. La comparativa y el asesoramiento son gratuitos y sin compromiso de contratación." },
    ],
    seoIntro:
      "Un seguro de salud sin copagos te da tranquilidad: sabes exactamente lo que pagas cada mes, sin sorpresas cada vez que usas el médico. Asegurados Ventajon compara tu perfil entre varias compañías para encontrar la opción sin copago más ajustada a tu presupuesto, sin letra pequeña.",
    seoSections: [
      { h2: "¿Qué influye en el precio de un seguro de salud sin copagos?", p: "La edad y el número de personas a asegurar son los factores que más pesan, seguidos de la cobertura elegida (dental incluido o no, cuadro médico, cobertura internacional…). Al no haber copago, toda esa cobertura va incluida en la cuota mensual." },
      { h2: "¿Por qué comparar con Asegurados Ventajon?", p: "Somos correduría, no agentes de una única aseguradora: comparamos por ti entre las mejores compañías del país y te explicamos en claro qué cubre cada póliza, sin trucos ni letra pequeña." },
    ],
  },
];

export function getSeoLandingPage(slug: string): SeoLandingPageData | undefined {
  return SEO_LANDING_PAGES.find((p) => p.slug === slug);
}

// FAQ propio de la landing + FAQ base del seguro de salud, en ese orden
// (lo más específico primero) — usado tanto por el componente visual como
// por el JSON-LD, para que ambos digan siempre lo mismo.
export function getCombinedFaq(page: SeoLandingPageData): SeoFaqItem[] {
  return [...page.faq, ...getProductPage("salud")!.faq];
}

// JSON-LD compartido por las 5 landings: InsuranceAgency (+ areaServed si es
// geo), Product/Offer con el precio ya resuelto (nunca un precio inventado,
// siempre el mismo número que se ve en pantalla), FAQPage con el FAQ
// combinado, y BreadcrumbList — todo pensado para motores de respuesta de
// IA (AEO/GEO) además del SEO tradicional.
export function buildJsonLd(page: SeoLandingPageData, precio: number, faq: SeoFaqItem[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "InsuranceAgency",
        name: "Asegurados Ventajon",
        url: `${siteUrl}${page.path}`,
        description: page.metaDescription,
        ...(page.geo ? { areaServed: page.geo.localidades.map((l) => ({ "@type": "City", name: l })) } : {}),
      },
      {
        "@type": "Product",
        name: page.badge,
        description: page.subheadline,
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: String(precio),
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: String(precio),
            priceCurrency: "EUR",
            unitText: "MON", // mensual, por asegurado
          },
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Seguro de salud", item: `${siteUrl}/seguro-de-salud` },
          { "@type": "ListItem", position: 3, name: page.badge, item: `${siteUrl}${page.path}` },
        ],
      },
    ],
  };
}
