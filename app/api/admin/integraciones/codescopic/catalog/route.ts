import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import {
  codeoscopicConfigured,
  listInsuranceLines,
  listInsuranceVendors,
  listInsuranceProducts,
  CodeoscopicError,
  type CodeoscopicLine,
  type CodeoscopicVendor,
  type CodeoscopicProduct,
} from "@/lib/codeoscopic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Diagnóstico de catálogos de Codeoscopic para el back office: qué líneas de
// seguro están activas en la cuenta, qué vendors (con logo) hay disponibles y
// qué productos tiene la línea de Salud. Solo lectura — sirve para verificar
// que la correduría tiene contratado lo que la web intenta tarificar, antes
// de que un lead se lleve un fallo silencioso. Cada bloque falla de forma
// independiente: si un endpoint no responde, se devuelve su error sin tumbar
// los demás.
export async function GET(request: Request) {
  const auth = await requireModule(request, "integraciones");
  if (!auth.ok) return auth.response;

  if (!codeoscopicConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  async function safe<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
    try {
      return { ok: true, data: await fn() };
    } catch (err) {
      const msg = err instanceof CodeoscopicError ? `${err.status}` : (err as Error).message;
      return { ok: false, error: msg };
    }
  }

  const [linesRes, vendorsRes, productsRes] = await Promise.all([
    safe<CodeoscopicLine[]>(() => listInsuranceLines(false)),
    safe<CodeoscopicVendor[]>(() => listInsuranceVendors()),
    safe<CodeoscopicProduct[]>(() => listInsuranceProducts("Health")),
  ]);

  return NextResponse.json({
    ok: true,
    lines: linesRes.ok ? linesRes.data : null,
    linesError: linesRes.ok ? null : linesRes.error,
    vendors: vendorsRes.ok ? vendorsRes.data : null,
    vendorsError: vendorsRes.ok ? null : vendorsRes.error,
    healthProducts: productsRes.ok ? productsRes.data : null,
    healthProductsError: productsRes.ok ? null : productsRes.error,
  });
}

export function POST() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
