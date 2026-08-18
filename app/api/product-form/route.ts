import { NextRequest, NextResponse } from "next/server";
import { codeoscopicConfigured, codeoscopicFetch, CodeoscopicError } from "@/lib/codeoscopic";
import { rateLimitFail } from "@/lib/rateLimit";

// Proxy autenticado del widget AvantProductForm de Codeoscopic. El iframe
// que se embebe en la web pide datos al widget, éste llama a un endpoint
// nuestro (con nuestras cabeceras/credenciales) y nosotros reenviamos a
// Codeoscopic. NUNCA damos al widget acceso directo a Codeoscopic —el
// client_secret jamás debe viajar al navegador ni aparecer en el iframe.
//
// Codeoscopic expone POST /product-form-requests como endpoint único que
// enruta internamente cada tipo de petición del widget. Aceptamos su body
// tal cual (JSON opaco definido por el widget) y devolvemos su respuesta.
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!codeoscopicConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }
  const limited = await rateLimitFail(req, { bucket: "product-form", limit: 120, windowSeconds: 60 });
  if (limited) return limited;

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 }); }
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  try {
    const result = await codeoscopicFetch<unknown>("/product-form-requests", {
      method: "POST",
      body: raw,
    });
    // Al widget le devolvemos la respuesta plana de Codeoscopic — su
    // contrato es opaco (definido por su script cliente); solo la envolvemos
    // con nuestros propios headers de CORS/cache.
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const status = err instanceof CodeoscopicError ? err.status : 502;
    console.error("[product-form] Codeoscopic falló:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "codeoscopic_error", status }, { status: 502 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, reason: "method_not_allowed" }, { status: 405 });
}
