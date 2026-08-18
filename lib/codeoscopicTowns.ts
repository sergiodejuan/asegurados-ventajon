// Resolver de código postal → town.id del catálogo interno de Codeoscopic
// (municipios). Sin este id el payload de salud no valida: Codeoscopic pide
// el id de su catálogo, no el CP en sí.
//
// Estrategia: llamamos a GET /towns?postalCode=NNNNN (o similar — se ajusta
// abajo según el shape real que devuelva la API en el tenant), tomamos el
// primer municipio devuelto para ese CP y lo cacheamos in-memory. En España
// un CP puede mapear a más de un municipio (rural), pero para tarifa
// orientativa basta con uno: el usuario lo confirma después con el agente.
// Cuando integremos el widget Product Form, se podrá dar a elegir de una lista.

import { codeoscopicFetch, CodeoscopicError } from "./codeoscopic";

type TownRecord = { id: number | string; name?: string; province?: { name?: string } };
type TownsResponse = TownRecord[] | { items?: TownRecord[]; results?: TownRecord[] };

// Caché por proceso: los CP son estables (no cambian de mes a mes), así que
// una vez resueltos se reutilizan. Al morir la lambda se pierde y se vuelve
// a pedir — coste asumible.
const _cache = new Map<string, number | string>();

function extractTowns(body: TownsResponse): TownRecord[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.results)) return body.results;
  return [];
}

export async function resolveTownIdByPostalCode(postalCode: string): Promise<number | string | null> {
  const cp = postalCode.trim();
  if (!/^\d{5}$/.test(cp)) return null;
  const cached = _cache.get(cp);
  if (cached !== undefined) return cached;

  // Probamos con la variante más común (query param postalCode). Si tu
  // tenant expone el catálogo bajo otro nombre de parámetro (p.ej. zipCode
  // o cp), aquí es donde se ajusta.
  try {
    const body = await codeoscopicFetch<TownsResponse>(`/towns?postalCode=${encodeURIComponent(cp)}`);
    const towns = extractTowns(body);
    const first = towns[0];
    if (first?.id !== undefined) {
      _cache.set(cp, first.id);
      return first.id;
    }
    return null;
  } catch (err) {
    // No cacheamos negativos: un 404 puntual (CP no reconocido) o un 5xx
    // transitorio no debería impedir reintentar en la siguiente comparativa.
    if (err instanceof CodeoscopicError) {
      console.error(`[codeoscopic-towns] CP ${cp} -> ${err.status}`);
    } else {
      console.error(`[codeoscopic-towns] CP ${cp} -> ${(err as Error).message}`);
    }
    return null;
  }
}
