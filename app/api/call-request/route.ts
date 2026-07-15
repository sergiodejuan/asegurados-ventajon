import { NextResponse } from "next/server";
import { callRequestSchema } from "@/lib/schema";
import { upsertLead, setPresupuestoEleccion } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { blandConfigured, triggerBlandCall } from "@/lib/bland";
import { manychatConfigured, syncManychatLead } from "@/lib/manychat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const parsed = callRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  if (d.company) return NextResponse.json({ ok: true });

  const consent = buildConsent(request, "quiero-que-me-llamen", "/quiero-que-me-llamen",
    { privacidad: d.aceptaPrivacidad, contacto: d.autorizaContacto, comercial: d.aceptaComercial },
    d.consent);

  const { id, deduped } = await upsertLead(
    {
      nombre: d.nombre, telefono: d.telefono, codigoPostal: d.codigoPostal, producto: d.producto,
      diaLlamada: d.diaLlamada, turnoLlamada: d.turnoLlamada, presupuestoId: d.presupuestoId,
      aceptaPrivacidad: d.aceptaPrivacidad, autorizaContacto: d.autorizaContacto, aceptaComercial: d.aceptaComercial,
      utm: d.utm,
    },
    "quiero-que-me-llamen",
    consent
  );

  if (d.compania) {
    await setPresupuestoEleccion(id, d.producto ?? "salud", { compania: d.compania, precio: d.precioElegido ?? null }).catch(() => {});
  }

  const url = process.env.LEAD_WEBHOOK_URL;
  if (url) {
    try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, source: "quiero-que-me-llamen", ...d }) }); }
    catch (err) { console.error("[call-request] webhook error", err); }
  }

  if (blandConfigured() && d.autorizaContacto) {
    const call = await triggerBlandCall({
      toNumber: d.telefono,
      leadId: id,
      source: "quiero-que-me-llamen",
      requestData: {
        nombre: d.nombre ?? "",
        producto: d.producto ?? "salud",
        codigo_postal: d.codigoPostal,
        ...(d.compania ? { compania: d.compania } : {}),
        ...(d.diaLlamada ? { dia_preferido: d.diaLlamada } : {}),
        ...(d.turnoLlamada ? { turno_preferido: d.turnoLlamada } : {}),
        contexto_llamada: d.presupuestoId
          ? "ha pedido reprogramar la llamada sobre un presupuesto que ya había calculado"
          : "ha solicitado que le llamemos",
      },
    });
    if (!call.ok) console.error("[call-request] bland call error", call.error);
  }

  if (manychatConfigured() && d.autorizaContacto) {
    const sync = await syncManychatLead({
      toNumber: d.telefono,
      nombre: d.nombre ?? "",
      source: "quiero-que-me-llamen",
      producto: d.producto ?? "salud",
      codigoPostal: d.codigoPostal,
      precioAprox: d.precioElegido ?? null,
      presupuestoId: d.presupuestoId ?? null,
      utm: d.utm,
    });
    if (!sync.ok) console.error("[call-request] manychat sync error", sync.error);
  }

  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
