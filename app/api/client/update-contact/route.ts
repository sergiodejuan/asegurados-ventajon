import { NextResponse } from "next/server";
import { updateLeadContactByLookup } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint público (sin token admin) para el área de cliente sin registro:
// localiza la ficha por el teléfono/email que el propio navegador ya tenía
// guardado y aplica los cambios. Si no encuentra ficha, no falla: el cambio
// queda igualmente guardado en localStorage del cliente.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const lookupPhone = typeof body.lookupPhone === "string" ? body.lookupPhone : undefined;
  const lookupEmail = typeof body.lookupEmail === "string" ? body.lookupEmail : undefined;
  const patch = (body.patch && typeof body.patch === "object" ? body.patch : {}) as Record<string, unknown>;

  if (!lookupPhone && !lookupEmail) {
    return NextResponse.json({ ok: false, error: "Falta teléfono o email para localizar tu ficha." }, { status: 400 });
  }

  const safePatch = {
    nombre: typeof patch.nombre === "string" ? patch.nombre.slice(0, 120) : undefined,
    telefono: typeof patch.telefono === "string" ? patch.telefono.slice(0, 20) : undefined,
    email: typeof patch.email === "string" ? patch.email.slice(0, 160) : undefined,
    diaLlamada: typeof patch.diaLlamada === "string" ? patch.diaLlamada.slice(0, 20) : undefined,
    turnoLlamada: typeof patch.turnoLlamada === "string" ? patch.turnoLlamada.slice(0, 20) : undefined,
  };

  const lead = await updateLeadContactByLookup({ telefono: lookupPhone, email: lookupEmail }, safePatch);
  return NextResponse.json({ ok: true, matched: !!lead });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
