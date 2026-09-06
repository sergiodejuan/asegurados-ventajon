// Deriva la "zona" (Islas Canarias / Islas Baleares / Península) a partir
// del código postal español. Se usa para eliminar el paso "¿dónde vives?"
// de los tarificadores: ahora el usuario solo teclea el CP real y el
// sistema resuelve la zona por los dos primeros dígitos (provincia INE).
//
// La zona sigue guardándose en el campo `codigoPostal` del lead por
// retrocompatibilidad — el catálogo de precios (`lib/catalog.ts`) y la
// automatización de ManyChat leen ese nombre. Cambia solo lo que
// contiene: antes era una etiqueta seleccionada a mano; ahora es el
// resultado del mapeo automático.
//
// Codeoscopic NO usa este valor: sigue leyendo `codigoPostalReal`
// (5 dígitos) y resolviendo el `townId` con `resolveTownIdByPostalCode`.

export type Zona = "Islas Canarias" | "Islas Baleares" | "Península";

// Provincias insulares por código INE (los dos primeros dígitos del CP).
const PROVINCIAS_CANARIAS = new Set(["35", "38"]);  // Las Palmas, S/C de Tenerife
const PROVINCIAS_BALEARES = new Set(["07"]);        // Illes Balears

// Ceuta (51) y Melilla (52) formalmente no son "Península" pero
// operativamente van con el mismo catálogo de precios y logística —
// las agrupamos en "Península" hasta que exista una zona propia.

export function zonaFromCP(cp: string | null | undefined): Zona | null {
  if (!cp) return null;
  const digits = String(cp).replace(/\D/g, "");
  if (digits.length !== 5) return null;
  const prov = digits.slice(0, 2);
  if (PROVINCIAS_CANARIAS.has(prov)) return "Islas Canarias";
  if (PROVINCIAS_BALEARES.has(prov)) return "Islas Baleares";
  return "Península";
}
