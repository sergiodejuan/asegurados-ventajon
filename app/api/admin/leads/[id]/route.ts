import { NextResponse } from "next/server";
import { getLead, updateLead, listProducts } from "@/lib/store";
import { STATUSES, type Status, type LeadSubmission } from "@/lib/crm";
import { adminAuthFail } from "@/lib/adminAuth";
import { saludPrice, vidaPrice } from "@/lib/quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Precio orientativo (mismo cálculo que la comparativa pública) para que el
// panel de presupuestos en admin muestre algo más útil que solo la fecha.
// Se basa en la compañía recomendada/destacada del catálogo, no en una
// cotización en firme.
async function estimatePrice(sub: LeadSubmission): Promise<number | null> {
  if (sub.producto !== "salud" && sub.producto !== "vida") return null;
  const products = await listProducts(sub.producto, true);
  if (!products.length) return null;
  const rec = products.find((p) => p.destacado) ?? products[0];
  const data = sub.data;
  if (sub.producto === "salud") {
    const price = saludPrice(
      { conCopago: rec.precioConCopago ?? 0, sinCopago: rec.precioSinCopago ?? 0 },
      { numAsegurados: Number(data.numAsegurados) || 1, coberturaDental: !!data.coberturaDental }
    );
    return Math.min(price.conCopago, price.sinCopago);
  }
  const price = vidaPrice({ precio: rec.precio ?? 0 }, { fumador: !!data.fumador });
  return price.precio;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  const submissions = await Promise.all(
    (lead.submissions ?? []).map(async (s) => ({ ...s, precioAprox: await estimatePrice(s) }))
  );
  return NextResponse.json({ ok: true, lead: { ...lead, submissions } });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: { status?: string; nextStep?: string; note?: string; contact?: { channel?: string; note?: string }; agente?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 });
  }

  const status =
    body.status && (STATUSES as readonly string[]).includes(body.status)
      ? (body.status as Status)
      : undefined;

  const contact =
    body.contact?.channel && ["llamada", "whatsapp", "email"].includes(body.contact.channel)
      ? { channel: body.contact.channel, note: body.contact.note }
      : undefined;

  const lead = await updateLead(params.id, {
    status,
    nextStep: typeof body.nextStep === "string" ? body.nextStep : undefined,
    note: body.note,
    contact,
    agente: body.agente,
  });
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}
