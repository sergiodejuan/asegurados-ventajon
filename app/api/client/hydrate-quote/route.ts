import { NextResponse } from "next/server";
import { getLead } from "@/lib/store";
import { verifyQuoteAccessToken } from "@/lib/quoteTokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/client/hydrate-quote?token=<lead>.<exp>.<sig>
//
// Recibe un token firmado (generado por /api/manychat/salud-quote y
// enviado al usuario por WhatsApp), verifica firma + caducidad, y
// devuelve el `quote` mínimo que la comparativa espera cargar en
// localStorage — así el usuario que abre el link desde WhatsApp NO
// tiene que reintroducir sus datos.
//
// No exponemos el DNI ni los consentimientos internos aquí — sólo lo
// que necesita la comparativa para pintar el recap y no volver a
// pedir al usuario. El leadId sí va incluido, es el ancla para pedir
// tarifas reales a Codeoscopic.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const parsed = verifyQuoteAccessToken(token);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Token inválido o caducado." }, { status: 401 });
  }

  const lead = await getLead(parsed.leadId);
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Cotización no encontrada." }, { status: 404 });
  }

  // Construimos el `QuoteProfile` que consume la comparativa. Sólo los
  // campos que pinta o usa como base de recálculo — nada de datos
  // sensibles (DNI, consentimientos internos, actividad).
  const quote = {
    id: lead.id,
    leadId: lead.id,
    producto: (lead.producto || "salud") as "salud" | "vida" | "auto" | "decesos",
    createdAt: lead.createdAt,
    codigoPostal: lead.codigoPostal || lead.codigoPostalReal || "",
    numAsegurados: lead.numAsegurados ?? undefined,
    coberturaDental: lead.coberturaDental ?? undefined,
    fechaNacimiento: lead.fechaNacimiento || "",
    sexo: (lead.sexo === "hombre" || lead.sexo === "mujer" ? lead.sexo : undefined) as "hombre" | "mujer" | undefined,
    motivo: lead.motivo || undefined,
    fumador: lead.fumador ?? undefined,
    paraQuien: lead.paraQuien || undefined,
    inicio: lead.inicio || undefined,
    tipoVehiculo: lead.tipoVehiculo || undefined,
    matricula: lead.matricula || undefined,
    marcaVehiculo: lead.marcaVehiculo || undefined,
    modeloVehiculo: lead.modeloVehiculo || undefined,
    anioVehiculo: lead.anioVehiculo || undefined,
    usoVehiculo: lead.usoVehiculo || undefined,
    antiguedadCarnet: lead.antiguedadCarnet || undefined,
    coberturaDeseada: lead.coberturaDeseada || undefined,
    nombre: lead.nombre || "",
    telefono: lead.telefono || "",
    email: lead.email || "",
    // El consentimiento explícito se registró al crear el lead (ManyChat
    // recogió el checkbox de privacidad antes del External Request);
    // devolvemos un consentAt "recordado" para que la comparativa NO
    // vuelva a pedir aceptar la política.
    consentAt: {
      privacidadAt: lead.createdAt,
      contactoAt: lead.createdAt,
    },
  };

  return NextResponse.json({ ok: true, quote });
}
