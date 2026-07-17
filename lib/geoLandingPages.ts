// Landings geoposicionadas del seguro de salud, una por isla/zona de
// Canarias — mismo producto y contenido base que /seguro-de-salud (ver
// lib/productPages.ts), con la cabecera, el precio y el FAQ adaptados a
// cada isla para SEO local. Sigue el mismo patrón: datos aquí, JSX en
// components/GeoLandingPage.tsx, para que añadir una isla nueva sea solo
// añadir una entrada a este array.
//
// ⚠️ El precio "desde 35 €/mes asegurado, con todas las coberturas" es el
// dato de referencia dado por Sergio para el mercado de Canarias — revísalo
// aquí si cambia, no hace falta tocar el componente.

export type GeoLandingPage = {
  slug: string;
  path: string;
  islandName: string; // para el copy en frases ("en Tenerife")
  metaTitle: string;
  metaDescription: string;
  badge: string;
  h1: string;
  subheadline: string;
  priceLine: string;
  localidades: string[]; // para SEO local y JSON-LD areaServed
  localIntro: string; // sección propia sobre la isla
  localFaq: { q: string; a: string }[]; // se añade al FAQ base de salud
};

const PRICE_LINE = "Desde 35 €/mes asegurado, con todas las coberturas";

export const GEO_LANDING_PAGES: GeoLandingPage[] = [
  {
    slug: "tenerife",
    path: "/seguro-de-salud-tenerife",
    islandName: "Tenerife",
    metaTitle: "Seguro de salud en Tenerife desde 35 €/mes — Asegurados Ventajon",
    metaDescription: "Comparamos tu seguro de salud en Tenerife entre las mejores compañías. Desde 35 €/mes asegurado, con todas las coberturas. Comparativa gratuita en 1 minuto.",
    badge: "Seguro de salud en Tenerife",
    h1: "Seguro de salud en Tenerife, comparado por un experto",
    subheadline: "Comparamos entre las mejores compañías de salud para que pagues lo justo, con cuadro médico y cobertura pensados para vivir en la isla.",
    priceLine: PRICE_LINE,
    localidades: ["Santa Cruz de Tenerife", "La Laguna", "Puerto de la Cruz", "Adeje", "Los Cristianos", "Arona"],
    localIntro:
      "En Tenerife, la disponibilidad real de especialistas y hospitales concertados no es la misma en Santa Cruz o La Laguna que en el sur de la isla. Comparamos el cuadro médico de cada compañía en tu zona —norte o sur— y revisamos si tu póliza cubre el traslado sanitario a otra isla o a la península cuando una prueba o especialista no está disponible cerca de ti.",
    localFaq: [
      { q: "¿Tenéis cobertura de seguros de salud en toda la isla de Tenerife?", a: "Sí, trabajamos con tu código postal exacto, tanto si vives en el área metropolitana (Santa Cruz, La Laguna) como en el sur (Adeje, Los Cristianos, Arona) o el norte de la isla." },
      { q: "¿Qué pasa si necesito un especialista que no está disponible en Tenerife?", a: "Algunas pólizas incluyen cobertura de traslado sanitario a otra isla o a la península cuando una prueba o especialista no está disponible donde vives. Te lo confirmamos según la compañía antes de que decidas." },
    ],
  },
  {
    slug: "gran-canaria",
    path: "/seguro-de-salud-gran-canaria",
    islandName: "Gran Canaria",
    metaTitle: "Seguro de salud en Gran Canaria desde 35 €/mes — Asegurados Ventajon",
    metaDescription: "Comparamos tu seguro de salud en Gran Canaria entre las mejores compañías. Desde 35 €/mes asegurado, con todas las coberturas. Comparativa gratuita en 1 minuto.",
    badge: "Seguro de salud en Gran Canaria",
    h1: "Seguro de salud en Gran Canaria, comparado por un experto",
    subheadline: "Comparamos entre las mejores compañías de salud para que pagues lo justo, con cuadro médico y cobertura pensados para vivir en la isla.",
    priceLine: PRICE_LINE,
    localidades: ["Las Palmas de Gran Canaria", "Telde", "Maspalomas", "Vecindario", "Arucas", "San Bartolomé de Tirajana"],
    localIntro:
      "En Gran Canaria, la capital concentra la mayor parte del cuadro médico privado, pero no todas las compañías cubren igual el sur de la isla (Maspalomas, Vecindario) o los municipios del norte. Comparamos el cuadro médico y los centros concertados en tu zona, y revisamos si tu póliza cubre el traslado sanitario a otra isla o a la península si lo necesitas.",
    localFaq: [
      { q: "¿Tenéis cobertura de seguros de salud en toda Gran Canaria?", a: "Sí, trabajamos con tu código postal exacto, tanto si vives en Las Palmas de Gran Canaria como en el sur (Maspalomas, San Bartolomé de Tirajana) o el resto de municipios de la isla." },
      { q: "¿El cuadro médico es el mismo en la capital que en el sur de la isla?", a: "No siempre. Algunas compañías tienen más especialistas concertados en Las Palmas de Gran Canaria que en el sur. Te ayudamos a comparar el cuadro médico real de tu zona antes de contratar." },
    ],
  },
  {
    slug: "lanzarote-fuerteventura",
    path: "/seguro-de-salud-lanzarote-fuerteventura",
    islandName: "Lanzarote y Fuerteventura",
    metaTitle: "Seguro de salud en Lanzarote y Fuerteventura desde 35 €/mes — Asegurados Ventajon",
    metaDescription: "Comparamos tu seguro de salud en Lanzarote y Fuerteventura entre las mejores compañías. Desde 35 €/mes asegurado, con todas las coberturas. Comparativa gratuita en 1 minuto.",
    badge: "Seguro de salud en Lanzarote y Fuerteventura",
    h1: "Seguro de salud en Lanzarote y Fuerteventura, comparado por un experto",
    subheadline: "Comparamos entre las mejores compañías de salud para que pagues lo justo, con cobertura pensada para las islas orientales.",
    priceLine: PRICE_LINE,
    localidades: ["Arrecife", "Puerto del Rosario", "Playa Blanca", "Costa Teguise", "Corralejo", "Puerto del Carmen"],
    localIntro:
      "En las islas orientales, el cuadro médico especializado es más reducido que en Tenerife o Gran Canaria: lo que en otras islas es una cobertura amplia puede quedarse corto en Lanzarote o Fuerteventura. Por eso conviene revisar especialmente si tu póliza cubre el traslado sanitario a otra isla o a la península cuando una prueba o especialista no está disponible donde vives.",
    localFaq: [
      { q: "¿Tenéis cobertura de seguros de salud en Lanzarote y Fuerteventura?", a: "Sí, trabajamos con tu código postal exacto en ambas islas, ya vivas en Arrecife, Puerto del Rosario, o en zonas más turísticas como Playa Blanca, Costa Teguise o Corralejo." },
      { q: "¿Es habitual necesitar traslado a otra isla para algún especialista?", a: "Al ser islas con un cuadro médico más reducido, es más frecuente que en Tenerife o Gran Canaria. Por eso te ayudamos a elegir una póliza que cubra bien el traslado sanitario interinsular si lo necesitas." },
    ],
  },
];

export function getGeoLandingPage(slug: string): GeoLandingPage | undefined {
  return GEO_LANDING_PAGES.find((g) => g.slug === slug);
}
