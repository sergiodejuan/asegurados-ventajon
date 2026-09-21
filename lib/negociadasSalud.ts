// Resuelve las opciones de salud NEGOCIADAS por Asegurados Ventajón (sin
// copagos) para un perfil concreto, y arma el mensaje listo para WhatsApp.
// Lo consume /api/manychat/salud-negociadas — el mensaje que se envía JUSTO
// DESPUÉS de la tarifa de Codeoscopic (que suele venir con copago) para
// presentar el gancho: mismas compañías, sin copagos.
// Las fichas viven en el catálogo (lib/catalog.ts → NEGOCIADAS_SALUD),
// ocultas de la comparativa pública (`activo: false`) y editables en
// /admin/productos. Convención de id: neg-<compania>-<cd|sd>[-<1|n>].

import { listProducts } from "@/lib/store";
import { resolveTramo } from "@/lib/quote";
import type { Product } from "@/lib/catalog";

export type NegociadaOption = { compania: string; precio: number; precioTexto: string };

function fmtEUR(n: number): string {
  return `${n.toFixed(2).replace(".", ",")}€/mes`;
}

// Edad a partir de la fecha de nacimiento. Acepta los dos formatos con los
// que puede llegar del flow: dd/mm/aaaa (lo que teclea el usuario) o
// yyyy-mm-dd (normalizado). Devuelve null si no se puede parsear.
export function edadDesdeFecha(dob?: string): number | null {
  const s = (dob ?? "").trim();
  let y: number, mo: number, d: number;
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dmy) { d = +dmy[1]; mo = +dmy[2]; y = +dmy[3]; }
  else if (ymd) { y = +ymd[1]; mo = +ymd[2]; d = +ymd[3]; }
  else return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  const antesCumple = today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d);
  if (antesCumple) age--;
  return age >= 0 && age < 120 ? age : null;
}

// Precio sin copago nacional (mismo en las 3 zonas) para la edad dada.
// edad conocida + tramo → precio de ese tramo.
// edad conocida SIN tramo → null: la compañía no cubre esa edad (Mapfre
// tope 65, Adeslas 70) — no la ofertamos con un precio inventado.
// edad desconocida → precio plano de la ficha, que actúa de "desde".
function precioSinCopago(product: Product, edad: number | null): number | null {
  const tramo = resolveTramo(product.pricing, edad);
  if (tramo) {
    const z = tramo.porZona;
    const v = z.peninsula?.sinCopago ?? z.canarias?.sinCopago ?? z.baleares?.sinCopago;
    if (typeof v === "number" && v > 0) return v;
  }
  if (edad != null) return null; // fuera de los tramos cubiertos
  return typeof product.precioSinCopago === "number" && product.precioSinCopago > 0 ? product.precioSinCopago : null;
}

export type NegociadasProfile = {
  edad: number | null;
  coberturaDental: boolean | null;
  numAsegurados: number | null;
};

// Devuelve las opciones negociadas aplicables al perfil, ordenadas de más
// barata a más cara (precio POR ASEGURADO/mes, sin copagos).
export async function resolveNegociadasSalud(profile: NegociadasProfile): Promise<NegociadaOption[]> {
  const all = await listProducts("salud"); // incluye las ocultas (activo:false)
  const neg = all.filter((p) => p.id.startsWith("neg-"));
  // Dental según lo que marcó el usuario; nº de asegurados: 2+ = tarifa familia.
  const dental = profile.coberturaDental === true ? "cd" : "sd";
  const familia = (profile.numAsegurados ?? 1) > 1;

  // Mapfre distingue 1 vs familia; Adeslas solo tiene tarifa "un asegurado".
  const targets: { compania: string; id: string }[] = [
    { compania: "Mapfre", id: `neg-mapfre-${dental}-${familia ? "n" : "1"}` },
    { compania: "Adeslas", id: `neg-adeslas-${dental}` },
  ];

  const out: NegociadaOption[] = [];
  for (const t of targets) {
    const product = neg.find((p) => p.id === t.id);
    if (!product) continue;
    const precio = precioSinCopago(product, profile.edad);
    if (precio == null) continue;
    out.push({ compania: t.compania, precio, precioTexto: fmtEUR(precio) });
  }
  return out.sort((a, b) => a.precio - b.precio);
}

// Mensaje WhatsApp con las opciones negociadas. Texto plano + *negritas* de
// WhatsApp, sin markdown. `edadConocida=false` antepone "desde" (el precio
// sale del tramo más barato en vez del de la edad exacta).
export function buildNegociadasMensaje(options: NegociadaOption[], edadConocida: boolean): string {
  if (!options.length) return "";
  const prefijo = edadConocida ? "" : "desde ";
  const lineas = options
    .map((o) => `• *${o.compania}* — ${prefijo}${o.precioTexto} por asegurado`)
    .join("\n");
  return (
    "✅ Y estas son las opciones que tenemos negociadas en exclusiva, *SIN copagos* " +
    "(no pagas nada por cada visita ni prueba):\n\n" +
    `${lineas}\n\n` +
    "Son condiciones que no verás en un comparador normal. " +
    "¿Quieres que un asesor te reserve una de estas sin copago?"
  );
}
