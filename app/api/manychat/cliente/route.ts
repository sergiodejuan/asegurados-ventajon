import { NextResponse } from "next/server";
import { findClientPresupuestos, listLlamadasByLead, getLead } from "@/lib/store";
import { PRESUPUESTO_STATUS_LABELS, LLAMADA_STATUS_LABELS } from "@/lib/crm";
import { quoteNumber } from "@/lib/quote";
import { manychatAuthFail } from "@/lib/manychatAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cuandoLlamadaTxt(fechaProgramada: string, horaProgramada: string, diaLlamada: string, turnoLlamada: string): string {
  if (fechaProgramada) {
    const d = new Date(`${fechaProgramada}T${horaProgramada || "00:00"}:00`);
    const fechaTxt = Number.isNaN(d.getTime()) ? fechaProgramada : d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
    return horaProgramada ? `el ${fechaTxt} a las ${horaProgramada}` : `el ${fechaTxt}`;
  }
  const partes = [diaLlamada, turnoLlamada].filter(Boolean);
  return partes.length ? partes.join(" · ") : "por concretar";
}

// Lo llama el paso "External Request" de ManyChat, con el teléfono del
// contacto de WhatsApp, para saber si ya es cliente y traer sus
// presupuestos/llamadas a la conversación — sin necesidad de que el usuario
// teclee nada, ManyChat ya conoce su número.
export async function POST(request: Request) {
  const denied = manychatAuthFail(request);
  if (denied) return denied;

  let body: { telefono?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const telefono = (body.telefono ?? "").trim();
  if (!telefono) return NextResponse.json({ ok: false, error: "Falta el teléfono." }, { status: 400 });

  const result = await findClientPresupuestos(telefono);
  if (!result) {
    return NextResponse.json({ ok: true, existe: false, nombre: "", numPresupuestos: 0, numLlamadas: 0, presupuestos: [], llamadas: [], resumenTexto: "" });
  }

  const [lead, llamadas] = await Promise.all([getLead(result.leadId), listLlamadasByLead(result.leadId)]);
  const llamadasActivas = llamadas.filter((l) => l.status === "pendiente" || l.status === "programada");

  const presupuestos = result.presupuestos.map((p) => ({
    id: p.id, numero: quoteNumber(p.id), producto: p.producto,
    estado: PRESUPUESTO_STATUS_LABELS[p.status] ?? p.status, precioAprox: p.precioAprox,
  }));
  const llamadasView = llamadasActivas.map((l) => ({
    id: l.id, producto: l.producto, estado: LLAMADA_STATUS_LABELS[l.status] ?? l.status,
    cuando: cuandoLlamadaTxt(l.fechaProgramada, l.horaProgramada, l.diaLlamada, l.turnoLlamada),
  }));

  // Bloque de texto ya listo para pegar en un mensaje de ManyChat (evita
  // depender de iterar arrays con su editor, que es limitado).
  const lineasPresupuestos = presupuestos.map((p) => `• Nº ${p.numero} (${p.producto}) — ${p.estado}${p.precioAprox != null ? ` — ≈${p.precioAprox}€/mes` : ""}`);
  const lineasLlamadas = llamadasView.map((l) => `• ${l.producto ? `Seguro de ${l.producto}` : "Consulta"} — ${l.estado} ${l.cuando}`);
  const resumenTexto = [
    lineasPresupuestos.length ? `Tus presupuestos:\n${lineasPresupuestos.join("\n")}` : "",
    lineasLlamadas.length ? `Tus llamadas:\n${lineasLlamadas.join("\n")}` : "",
  ].filter(Boolean).join("\n\n") || "Todavía no tienes presupuestos ni llamadas con nosotros.";

  return NextResponse.json({
    ok: true, existe: true, leadId: result.leadId, nombre: lead?.nombre ?? "",
    numPresupuestos: presupuestos.length, numLlamadas: llamadasView.length,
    presupuestos, llamadas: llamadasView, resumenTexto,
  });
}
