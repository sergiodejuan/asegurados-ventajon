import { NextResponse } from "next/server";
import { findClientPresupuestos } from "@/lib/store";
import type { Presupuesto } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint público (sin token admin) para que un cliente recupere sus
// presupuestos desde cualquier dispositivo, identificándose con tres datos
// que solo él conoce: el número de presupuesto (id único y corto), el
// correo y el teléfono usados al tarificar. No se expone información
// interna del CRM (notas del agente, quién lo cerró, etc.).
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const codigo = typeof body.codigo === "string" ? body.codigo.slice(0, 20) : "";
  const email = typeof body.email === "string" ? body.email.slice(0, 160) : "";
  const telefono = typeof body.telefono === "string" ? body.telefono.slice(0, 20) : "";

  if (!codigo.trim() || !email.trim() || !telefono.trim()) {
    return NextResponse.json({ ok: false, error: "Faltan datos: número de presupuesto, correo y teléfono." }, { status: 400 });
  }

  const presupuestos = await findClientPresupuestos({ codigo, email, telefono });
  if (!presupuestos) {
    return NextResponse.json({ ok: false, error: "No encontramos ningún presupuesto con esos datos. Revisa el número, el correo y el teléfono." });
  }

  return NextResponse.json({ ok: true, presupuestos: presupuestos.map(toClientQuote) });
}

// Solo los campos que el propio cliente ya nos dio al tarificar, en el
// mismo formato que usa el área de cliente para los presupuestos guardados
// localmente (QuoteProfile) — así el frontend los mezcla sin transformar.
function toClientQuote(p: Presupuesto) {
  const d = p.data ?? {};
  return {
    id: p.id,
    producto: p.producto,
    createdAt: p.createdAt,
    codigoPostal: d.codigoPostal,
    numAsegurados: d.numAsegurados,
    coberturaDental: d.coberturaDental,
    fechaNacimiento: d.fechaNacimiento,
    sexo: d.sexo,
    motivo: d.motivo,
    fumador: d.fumador,
    inicio: d.inicio,
    tipoVehiculo: d.tipoVehiculo,
    matricula: d.matricula,
    marcaVehiculo: d.marcaVehiculo,
    modeloVehiculo: d.modeloVehiculo,
    anioVehiculo: d.anioVehiculo,
    usoVehiculo: d.usoVehiculo,
    antiguedadCarnet: d.antiguedadCarnet,
    coberturaDeseada: d.coberturaDeseada,
    nombre: p.nombre,
    telefono: p.telefono,
    email: p.email,
  };
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
