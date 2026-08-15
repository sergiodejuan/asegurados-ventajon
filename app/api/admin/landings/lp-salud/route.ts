import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { getPaidLandingSaludConfig, savePaidLandingSaludConfig } from "@/lib/store";
import type { PaidLandingSaludConfig } from "@/lib/paidLandingSalud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Límite por imagen en base64 (el cliente ya comprime antes de subir; ver
// components/admin/ImageField.tsx). Alineado con el resto del panel.
const MAX_IMAGE_LENGTH = 900_000;
const MAX_PARTNERS = 20;
const MAX_BENEFICIOS = 20;
const MAX_PRODUCTOS = 6;
const MAX_COMPARATIVA_COLUMNS = 6;
const MAX_COMPARATIVA_ROWS = 40;

export async function GET(request: Request) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;
  const config = await getPaidLandingSaludConfig();
  return NextResponse.json({ ok: true, config });
}

// Validación defensiva antes de guardar: cotas duras sobre las estructuras
// que se serializan al KV (arrays con máximos, longitudes de dataURL) para
// que un formulario mal escrito no rompa el store ni deje una landing
// impagable de renderizar. La forma sí la damos por buena (viene del propio
// panel admin) — hacemos merge en el server para no perder campos ocultos.
export async function PUT(request: Request) {
  const auth = await requireModule(request, "campana");
  if (!auth.ok) return auth.response;

  let body: PaidLandingSaludConfig;
  try { body = (await request.json()) as PaidLandingSaludConfig; }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Falta la configuración." }, { status: 400 });
  }

  // Recorta y valida arrays antes de aceptar
  const partners = Array.isArray(body.porQueElegir?.partners) ? body.porQueElegir.partners : [];
  if (partners.length > MAX_PARTNERS) {
    return NextResponse.json({ ok: false, error: `Máximo ${MAX_PARTNERS} logos de partners.` }, { status: 400 });
  }
  for (const p of partners) {
    if (typeof p.imageUrl === "string" && p.imageUrl.length > MAX_IMAGE_LENGTH) {
      return NextResponse.json({ ok: false, error: `El logo de "${p.name}" es demasiado grande.` }, { status: 413 });
    }
  }

  const beneficios = Array.isArray(body.beneficios?.items) ? body.beneficios.items : [];
  if (beneficios.length > MAX_BENEFICIOS) {
    return NextResponse.json({ ok: false, error: `Máximo ${MAX_BENEFICIOS} beneficios.` }, { status: 400 });
  }

  const productos = Array.isArray(body.productos?.items) ? body.productos.items : [];
  if (productos.length > MAX_PRODUCTOS) {
    return NextResponse.json({ ok: false, error: `Máximo ${MAX_PRODUCTOS} tipos de producto.` }, { status: 400 });
  }

  const columns = Array.isArray(body.comparativa?.columns) ? body.comparativa.columns : [];
  if (columns.length > MAX_COMPARATIVA_COLUMNS) {
    return NextResponse.json({ ok: false, error: `Máximo ${MAX_COMPARATIVA_COLUMNS} columnas en la comparativa.` }, { status: 400 });
  }
  const rows = Array.isArray(body.comparativa?.rows) ? body.comparativa.rows : [];
  if (rows.length > MAX_COMPARATIVA_ROWS) {
    return NextResponse.json({ ok: false, error: `Máximo ${MAX_COMPARATIVA_ROWS} filas en la comparativa.` }, { status: 400 });
  }

  const imageFields = [body.hero?.imageUrl, body.bannerIntermedio?.imageUrl];
  for (const url of imageFields) {
    if (typeof url === "string" && url.length > MAX_IMAGE_LENGTH) {
      return NextResponse.json({ ok: false, error: "Una de las imágenes principales es demasiado grande." }, { status: 413 });
    }
  }

  const saved = await savePaidLandingSaludConfig(body);
  return NextResponse.json({ ok: true, config: saved });
}
