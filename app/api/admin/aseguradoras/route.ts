import { NextResponse } from "next/server";
import { z } from "zod";
import { requireModule } from "@/lib/agentAuth";
import { getHiddenBrands, setBrandHidden, listCatalogCompanies } from "@/lib/store";
import { normalizeBrand, type Ramo } from "@/lib/brands";
import { codeoscopicConfigured, listInsuranceVendors } from "@/lib/codeoscopic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RAMOS: Ramo[] = ["salud", "vida", "auto", "decesos"];

// Catálogo de aseguradoras por ramo: qué marcas se muestran en la comparativa
// (precios reales de Codeoscopic + catálogo manual). GET arma la lista de
// marcas conocidas (compañías del catálogo manual + vendors de Codeoscopic en
// salud) marcando cuáles están ocultas. POST oculta/muestra una marca.

type BrandRow = { name: string; key: string; hidden: boolean; imageUrl?: string; fuentes: string[] };

export async function GET(request: Request) {
  const auth = await requireModule(request, "productos");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const ramoParam = searchParams.get("producto");
  const ramo: Ramo = RAMOS.includes(ramoParam as Ramo) ? (ramoParam as Ramo) : "salud";

  const [hidden, companies] = await Promise.all([getHiddenBrands(ramo), listCatalogCompanies(ramo)]);

  const rows = new Map<string, BrandRow>();
  for (const name of companies) {
    const key = normalizeBrand(name);
    if (!key) continue;
    rows.set(key, { name, key, hidden: hidden.includes(key), imageUrl: undefined, fuentes: ["catálogo"] });
  }

  // En salud, sumamos los vendors de Codeoscopic (con logo) para que se puedan
  // ocultar marcas que solo aparecen en los precios reales. Best-effort.
  let vendorsError: string | null = null;
  if (ramo === "salud" && codeoscopicConfigured()) {
    try {
      const vendors = await listInsuranceVendors();
      for (const v of vendors) {
        const name = v.name?.trim();
        if (!name) continue;
        const key = normalizeBrand(name);
        if (!key) continue;
        const existing = rows.get(key);
        if (existing) {
          if (!existing.imageUrl && v.imageUrl) existing.imageUrl = v.imageUrl;
          if (!existing.fuentes.includes("Codeoscopic")) existing.fuentes.push("Codeoscopic");
        } else {
          rows.set(key, { name, key, hidden: hidden.includes(key), imageUrl: v.imageUrl, fuentes: ["Codeoscopic"] });
        }
      }
    } catch (err) {
      vendorsError = (err as Error).message;
    }
  }

  // Marcas ocultas que ya no están en ninguna fuente (p.ej. una compañía
  // borrada del catálogo): las mostramos igualmente para poder reactivarlas.
  for (const key of hidden) {
    if (!rows.has(key)) rows.set(key, { name: key, key, hidden: true, fuentes: ["oculta"] });
  }

  const brands = Array.from(rows.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
  return NextResponse.json({ ok: true, ramo, brands, vendorsError });
}

const postSchema = z
  .object({
    producto: z.enum(["salud", "vida", "auto", "decesos"]),
    brand: z.string().trim().min(1),
    hidden: z.boolean(),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await requireModule(request, "productos");
  if (!auth.ok) return auth.response;

  const raw = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos no válidos." }, { status: 400 });

  const hidden = await setBrandHidden(parsed.data.producto, parsed.data.brand, parsed.data.hidden);
  return NextResponse.json({ ok: true, hidden });
}
