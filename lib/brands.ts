// Control unificado de qué marcas de aseguradora se muestran en la comparativa
// de cada ramo. Una sola lista por ramo gobierna TANTO los precios reales de
// Codeoscopic (que llegan con el nombre de la aseguradora en vendor.name) como
// el catálogo manual (Product.compania). La clave de identidad es el nombre
// normalizado, así "Mapfre", "MAPFRE " y "mapfre" son la misma marca aunque
// vengan de fuentes distintas.
//
// Modelo: lista negra por ramo (brand_hidden:<ramo> → string[] de claves
// normalizadas). Por defecto no hay nada oculto → se muestran todas. Ocultar
// una marca la añade a la lista; así nunca se queda la comparativa en blanco
// por olvidar dar de alta una aseguradora nueva de Codeoscopic.

export type Ramo = "salud" | "vida" | "auto" | "decesos";

// Normaliza un nombre de marca a una clave estable: minúsculas, sin acentos,
// solo alfanuméricos. Coincide nombres equivalentes entre fuentes distintas.
export function normalizeBrand(name: string): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos/diacríticos combinados
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// ¿Es visible esta marca en este ramo? true si no está en la lista de ocultas.
export function isBrandVisible(name: string, hiddenKeys: string[]): boolean {
  const key = normalizeBrand(name);
  if (!key) return true; // sin nombre reconocible, no la escondemos por error
  return !hiddenKeys.includes(key);
}
