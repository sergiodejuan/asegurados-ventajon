// Catálogo de "ofertas" (compañía × producto) que se muestran en la comparativa.
// Editable desde /admin/productos. Persistido en el mismo almacén que los leads
// (lib/store.ts). Los valores por defecto son ILUSTRATIVOS (ver lib/brand.ts
// histórico) hasta que se sustituyan por datos/precios reales desde el admin.

export type Product = {
  id: string;
  producto: "salud" | "vida";
  compania: string;
  activo: boolean; // se muestra en la comparativa pública
  destacado: boolean; // insignia "Recomendado" + se ordena primero
  orden: number;
  logoUrl?: string; // logo subido desde /admin/productos (data URL); sin logo, se muestra el nombre en texto
  // Salud
  precioConCopago?: number;
  precioSinCopago?: number;
  // Vida
  precio?: number;
  condiciones: string;
  servicios: string[];
  updatedAt: string;
};

export type ProductDraft = Partial<Omit<Product, "id" | "updatedAt">>;

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
