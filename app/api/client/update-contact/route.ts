import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateLeadContactByLookup } from "@/lib/store";
import { CLIENT_SESSION_COOKIE, verifySessionToken } from "@/lib/clientSession";
import { rateLimitFail } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint público (sin token admin) para el área de cliente: si hay una
// sesión válida (cookie), actualiza esa ficha directamente por su id — es la
// vía segura, ya que el id no lo controla el cliente. Si no hay sesión (por
// ejemplo, un guardado justo antes de que la cookie recién creada haga
// efecto), recurre a localizar por teléfono/email como antes, PERO sin
// sesión no se permite tocar teléfono ni email: si no fuera así, cualquiera
// que conociera el teléfono o email de otra persona podría redirigir a dónde
// llega el contacto (secuestro de leads) con una simple petición directa.
export async function POST(request: Request) {
  const limited = await rateLimitFail(request, { bucket: "client-update-contact", limit: 20, windowSeconds: 3600 });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const leadId = verifySessionToken(cookies().get(CLIENT_SESSION_COOKIE)?.value);
  const lookupPhone = typeof body.lookupPhone === "string" ? body.lookupPhone : undefined;
  const lookupEmail = typeof body.lookupEmail === "string" ? body.lookupEmail : undefined;
  const patch = (body.patch && typeof body.patch === "object" ? body.patch : {}) as Record<string, unknown>;

  if (!leadId && !lookupPhone && !lookupEmail) {
    return NextResponse.json({ ok: false, error: "Falta teléfono o email para localizar tu ficha." }, { status: 400 });
  }

  const safePatch = {
    nombre: typeof patch.nombre === "string" ? patch.nombre.slice(0, 120) : undefined,
    telefono: leadId && typeof patch.telefono === "string" ? patch.telefono.slice(0, 20) : undefined,
    email: leadId && typeof patch.email === "string" ? patch.email.slice(0, 160) : undefined,
    diaLlamada: typeof patch.diaLlamada === "string" ? patch.diaLlamada.slice(0, 20) : undefined,
    turnoLlamada: typeof patch.turnoLlamada === "string" ? patch.turnoLlamada.slice(0, 20) : undefined,
  };

  const lead = await updateLeadContactByLookup(
    leadId ? { leadId } : { telefono: lookupPhone, email: lookupEmail },
    safePatch
  );
  return NextResponse.json({ ok: true, matched: !!lead });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
