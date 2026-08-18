// Catálogo de "ofertas" (compañía × producto) que se muestran en la comparativa.
// Editable desde /admin/productos. Persistido en el mismo almacén que los leads
// (lib/store.ts). Los valores por defecto son ILUSTRATIVOS (ver lib/brand.ts
// histórico) hasta que se sustituyan por datos/precios reales desde el admin.

// Zonas de tarificación. Los tarificadores guardan la zona como etiqueta
// ("Islas Canarias" / "Islas Baleares" / "Península", ver lib/forms.ts); aquí
// usamos claves cortas y estables para los precios configurados en el admin.
export type PricingZona = "canarias" | "baleares" | "peninsula";
export const PRICING_ZONAS: { key: PricingZona; label: string }[] = [
  { key: "canarias", label: "Canarias" },
  { key: "baleares", label: "Baleares" },
  { key: "peninsula", label: "Península" },
];

// Precio de un tramo para una zona concreta. En salud se usan con/sin copago;
// en el resto de ramos, el precio único.
export type TramoPrecio = { conCopago?: number; sinCopago?: number; precio?: number };

// Tramo de edad [min, max] (ambos inclusive) con su precio por zona. Permite
// tarifas que suben con la edad, distintas por comunidad.
export type TramoEdad = {
  min: number;
  max: number;
  porZona: Partial<Record<PricingZona, TramoPrecio>>;
};

// Descuento por nº de asegurados: a partir de `desde` personas se aplica el
// descuento, en euros (sobre la prima mensual total) o en porcentaje.
export type DescuentoAsegurados = {
  desde: number;
  tipo: "eur" | "pct";
  valor: number;
};

// Configuración de precios avanzada, opcional. Si no está definida (o sus
// listas están vacías) se usa el precio plano de siempre (precioConCopago /
// precioSinCopago / precio).
export type ProductPricing = {
  tramos: TramoEdad[];
  descuentos: DescuentoAsegurados[];
};

export type Product = {
  id: string;
  producto: "salud" | "vida" | "auto" | "decesos";
  compania: string;
  // Título/modalidad del producto que se muestra en la tarjeta de la
  // comparativa bajo la compañía (p.ej. "Salud Completa Plus"), igual que las
  // opciones de Codeoscopic muestran su modalidad ("Adeslas GO 2026").
  titulo?: string;
  activo: boolean; // se muestra en la comparativa pública
  destacado: boolean; // insignia "Recomendado" + se ordena primero
  orden: number;
  logoUrl?: string; // logo subido desde /admin/productos (data URL); sin logo, se muestra el nombre en texto
  // Salud
  precioConCopago?: number;
  precioSinCopago?: number;
  // Modalidad de copago de la opción negociada: solo con copago, solo sin
  // copago (lo habitual en las negociadas de Asegurados Ventajón), o ambas.
  // Decide qué precio(s) se muestran y el texto dinámico de la tarjeta.
  modalidadCopago?: CopagoModo;
  // Si el producto incluye cobertura dental. Alimenta los filtros "Con dental"
  // / "Sin dental" de la comparativa.
  dental?: boolean;
  // Vida, auto y decesos (precio único de partida)
  precio?: number;
  // Precios avanzados por tramo de edad y zona + descuento por nº de
  // asegurados. Opcional: si falta, se usa el precio plano de arriba.
  pricing?: ProductPricing;
  condiciones: string;
  servicios: string[];
  updatedAt: string;
};

export type ProductDraft = Partial<Omit<Product, "id" | "updatedAt">>;

// Modalidad de copago. Por defecto "sin": las opciones negociadas por
// Asegurados Ventajón son, por norma, sin copago.
export type CopagoModo = "con" | "sin" | "ambas";

export function copagoModoDe(p: { modalidadCopago?: CopagoModo }): CopagoModo {
  return p.modalidadCopago ?? "sin";
}

// Etiqueta corta (chip) según la modalidad.
export function copagoChip(modo: CopagoModo): string {
  return modo === "sin" ? "Sin copagos" : modo === "con" ? "Con copago" : "Con y sin copago";
}

// Texto dinámico explicativo según la modalidad elegida.
export function copagoTexto(modo: CopagoModo): string {
  if (modo === "sin") return "Sin copagos: pagas solo tu cuota mensual, sin abonar nada por cada visita o prueba.";
  if (modo === "con") return "Con copago: cuota mensual más baja a cambio de un pequeño pago por cada visita o prueba.";
  return "Disponible con y sin copago: elige pagar menos al mes (con copago) o no pagar por cada visita (sin copago).";
}

const now = new Date().toISOString();

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "salud-asisa", producto: "salud", compania: "Asisa", activo: true, destacado: true, orden: 1,
    precioConCopago: 29, precioSinCopago: 52,
    condiciones: "Precio orientativo para 1 asegurado adulto sin coberturas especiales. Sujeto a cuestionario de salud.",
    servicios: ["Asistencia sanitaria completa con hospitalización", "Amplio cuadro médico y especialistas", "Sin pagar por cada visita (modalidad sin copago)"],
    updatedAt: now,
  },
  {
    id: "salud-generali", producto: "salud", compania: "Generali", activo: true, destacado: false, orden: 2,
    precioConCopago: 32, precioSinCopago: 55,
    condiciones: "Precio orientativo para 1 asegurado adulto sin coberturas especiales. Sujeto a cuestionario de salud.",
    servicios: ["Asistencia sanitaria completa con hospitalización", "Amplio cuadro médico y especialistas", "Cobertura dental disponible como opción"],
    updatedAt: now,
  },
  {
    id: "salud-mapfre", producto: "salud", compania: "Mapfre", activo: true, destacado: false, orden: 3,
    precioConCopago: 31, precioSinCopago: 56,
    condiciones: "Precio orientativo para 1 asegurado adulto sin coberturas especiales. Sujeto a cuestionario de salud.",
    servicios: ["Asistencia sanitaria completa con hospitalización", "Amplio cuadro médico y especialistas", "Reembolso de gastos en el extranjero"],
    updatedAt: now,
  },
  {
    id: "salud-zurich", producto: "salud", compania: "Zurich", activo: true, destacado: false, orden: 4,
    precioConCopago: 33, precioSinCopago: 58,
    condiciones: "Precio orientativo para 1 asegurado adulto sin coberturas especiales. Sujeto a cuestionario de salud.",
    servicios: ["Asistencia sanitaria completa con hospitalización", "Amplio cuadro médico y especialistas", "Cobertura internacional"],
    updatedAt: now,
  },
  {
    id: "salud-adeslas", producto: "salud", compania: "Adeslas", activo: true, destacado: false, orden: 5,
    precioConCopago: 34, precioSinCopago: 60,
    condiciones: "Precio orientativo para 1 asegurado adulto sin coberturas especiales. Sujeto a cuestionario de salud.",
    servicios: ["Asistencia sanitaria completa con hospitalización", "Amplio cuadro médico y especialistas", "Amplia red de centros propios"],
    updatedAt: now,
  },
  {
    id: "vida-asisa", producto: "vida", compania: "Asisa", activo: true, destacado: true, orden: 1,
    precio: 8,
    condiciones: "Precio orientativo para un capital estándar, no fumador. Sujeto a cuestionario de salud.",
    servicios: ["Fallecimiento", "Invalidez absoluta"],
    updatedAt: now,
  },
  {
    id: "vida-generali", producto: "vida", compania: "Generali", activo: true, destacado: false, orden: 2,
    precio: 9,
    condiciones: "Precio orientativo para un capital estándar, no fumador. Sujeto a cuestionario de salud.",
    servicios: ["Fallecimiento", "Invalidez absoluta", "Enfermedades graves"],
    updatedAt: now,
  },
  {
    id: "vida-mapfre", producto: "vida", compania: "Mapfre", activo: true, destacado: false, orden: 3,
    precio: 9,
    condiciones: "Precio orientativo para un capital estándar, no fumador. Sujeto a cuestionario de salud.",
    servicios: ["Fallecimiento", "Invalidez absoluta", "Cobertura de hipoteca"],
    updatedAt: now,
  },
  {
    id: "vida-zurich", producto: "vida", compania: "Zurich", activo: true, destacado: false, orden: 4,
    precio: 10,
    condiciones: "Precio orientativo para un capital estándar, no fumador. Sujeto a cuestionario de salud.",
    servicios: ["Fallecimiento", "Invalidez absoluta", "Enfermedades graves"],
    updatedAt: now,
  },
  {
    id: "vida-adeslas", producto: "vida", compania: "Adeslas", activo: true, destacado: false, orden: 5,
    precio: 11,
    condiciones: "Precio orientativo para un capital estándar, no fumador. Sujeto a cuestionario de salud.",
    servicios: ["Fallecimiento", "Invalidez absoluta", "Cobertura de hipoteca"],
    updatedAt: now,
  },
  {
    id: "auto-mapfre", producto: "auto", compania: "Mapfre", activo: true, destacado: true, orden: 1,
    precio: 28,
    condiciones: "Precio orientativo a terceros para un turismo estándar, conductor con más de 5 años de carnet. Sujeto a las características del vehículo.",
    servicios: ["Responsabilidad civil", "Asistencia en viaje 24h", "Defensa jurídica"],
    updatedAt: now,
  },
  {
    id: "auto-zurich", producto: "auto", compania: "Zurich", activo: true, destacado: false, orden: 2,
    precio: 30,
    condiciones: "Precio orientativo a terceros para un turismo estándar, conductor con más de 5 años de carnet. Sujeto a las características del vehículo.",
    servicios: ["Responsabilidad civil", "Lunas", "Asistencia en viaje 24h"],
    updatedAt: now,
  },
  {
    id: "auto-generali", producto: "auto", compania: "Generali", activo: true, destacado: false, orden: 3,
    precio: 31,
    condiciones: "Precio orientativo a terceros para un turismo estándar, conductor con más de 5 años de carnet. Sujeto a las características del vehículo.",
    servicios: ["Responsabilidad civil", "Robo", "Incendio"],
    updatedAt: now,
  },
  {
    id: "auto-adeslas", producto: "auto", compania: "Adeslas", activo: true, destacado: false, orden: 4,
    precio: 32,
    condiciones: "Precio orientativo a terceros para un turismo estándar, conductor con más de 5 años de carnet. Sujeto a las características del vehículo.",
    servicios: ["Responsabilidad civil", "Asistencia en viaje 24h", "Vehículo de sustitución"],
    updatedAt: now,
  },
  {
    id: "auto-asisa", producto: "auto", compania: "Asisa", activo: true, destacado: false, orden: 5,
    precio: 29,
    condiciones: "Precio orientativo a terceros para un turismo estándar, conductor con más de 5 años de carnet. Sujeto a las características del vehículo.",
    servicios: ["Responsabilidad civil", "Lunas", "Robo"],
    updatedAt: now,
  },
  {
    id: "decesos-asisa", producto: "decesos", compania: "Asisa", activo: true, destacado: true, orden: 1,
    precio: 8,
    condiciones: "Precio orientativo por asegurado. Sujeto a la edad de las personas a asegurar.",
    servicios: ["Sepelio", "Traslado", "Gestión de trámites"],
    updatedAt: now,
  },
  {
    id: "decesos-mapfre", producto: "decesos", compania: "Mapfre", activo: true, destacado: false, orden: 2,
    precio: 9,
    condiciones: "Precio orientativo por asegurado. Sujeto a la edad de las personas a asegurar.",
    servicios: ["Sepelio", "Traslado", "Asistencia jurídica"],
    updatedAt: now,
  },
  {
    id: "decesos-generali", producto: "decesos", compania: "Generali", activo: true, destacado: false, orden: 3,
    precio: 9,
    condiciones: "Precio orientativo por asegurado. Sujeto a la edad de las personas a asegurar.",
    servicios: ["Sepelio", "Traslado", "Capital adicional"],
    updatedAt: now,
  },
  {
    id: "decesos-zurich", producto: "decesos", compania: "Zurich", activo: true, destacado: false, orden: 4,
    precio: 10,
    condiciones: "Precio orientativo por asegurado. Sujeto a la edad de las personas a asegurar.",
    servicios: ["Sepelio", "Gestión de trámites", "Asistencia jurídica"],
    updatedAt: now,
  },
  {
    id: "decesos-adeslas", producto: "decesos", compania: "Adeslas", activo: true, destacado: false, orden: 5,
    precio: 11,
    condiciones: "Precio orientativo por asegurado. Sujeto a la edad de las personas a asegurar.",
    servicios: ["Sepelio", "Traslado", "Capital adicional"],
    updatedAt: now,
  },
];

export function sortProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
    return a.orden - b.orden;
  });
}

export function slugifyCompania(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function makeProductId(producto: string, compania: string) {
  return `${producto}-${slugifyCompania(compania)}`;
}
