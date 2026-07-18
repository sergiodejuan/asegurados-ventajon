import { NextResponse } from "next/server";
import { callRequestSchema } from "@/lib/schema";
import { upsertLead, setPresupuestoEleccion, updateLead, createLlamada, updateLlamada, listLlamadasByLead } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { blandConfigured, triggerBlandCall } from "@/lib/bland";
import { manychatConfigured, syncManychatLead } from "@/lib/manychat";
import { setClientSessionCookie } from "@/lib/clientSession";
import { sendAreaClienteVerificationEmail } from "@/lib/clientVerification";
import { sendPushToLead } from "@/lib/webPush";
import { BRAND_NAME } from "@/lib/brand";
import { callTriggerRateLimitFail, getClientIp } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";

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

  const humano = await verifyTurnstile(d.turnstileToken, getClientIp(request));
  if (!humano) return NextResponse.json({ ok: false, error: "No hemos podido verificar la solicitud. Recarga la página e inténtalo de nuevo." }, { status: 403 });

  const limited = await callTriggerRateLimitFail(request, "quiero-que-me-llamen", d.telefono);
  if (limited) return limited;

  // Mismo formulario, pero completado desde el widget asistente en vez de la
  // página normal: se distingue en el source para poder medirlo aparte.
  const source = d.origen === "asistente" ? "quiero-que-me-llamen-widget" : "quiero-que-me-llamen";

  const consent = buildConsent(request, source, "/quiero-que-me-llamen",
    { privacidad: d.aceptaPrivacidad, contacto: d.autorizaContacto, comercial: d.aceptaComercial },
    d.consent);

  const { id, deduped } = await upsertLead(
    {
      nombre: d.nombre, telefono: d.telefono, codigoPostal: d.codigoPostal, producto: d.producto,
      diaLlamada: d.diaLlamada, turnoLlamada: d.turnoLlamada, presupuestoId: d.presupuestoId,
      aceptaPrivacidad: d.aceptaPrivacidad, autorizaContacto: d.autorizaContacto, aceptaComercial: d.aceptaComercial,
      utm: d.utm,
    },
    source,
    consent
  );

  if (d.compania) {
    await setPresupuestoEleccion(id, d.producto ?? "salud", { compania: d.compania, precio: d.precioElegido ?? null }).catch(() => {});
  }

  // Preguntas de decesos/hogar/duda general del asistente: no tienen
  // tarificador propio, así que su resumen se guarda como nota de actividad
  // visible en la ficha del lead en /admin.
  if (d.detalleConsulta) {
    await updateLead(id, { note: `Detalle del asistente: ${d.detalleConsulta}` }).catch(() => {});
  }

  // Cada solicitud de "que me llamen" es su propia llamada gestionable desde
  // /admin/llamadas. Si viene de reprogramar desde el área de cliente sobre
  // un presupuesto que ya tenía una llamada abierta, se actualiza esa en vez
  // de duplicarla.
  try {
    const existing = d.presupuestoId
      ? (await listLlamadasByLead(id)).find((l) => l.presupuestoId === d.presupuestoId && l.status !== "cancelada")
      : undefined;
    if (existing) {
      const result = await updateLlamada(existing.id, {
        status: "programada", diaLlamada: d.diaLlamada, turnoLlamada: d.turnoLlamada,
        fechaProgramada: d.fechaProgramada || undefined,
      });
      if (result?.notifyText) sendPushToLead(id, { title: BRAND_NAME, body: result.notifyText, url: result.notifyUrl || "/area-cliente" }).catch(() => {});
    } else {
      await createLlamada({
        leadId: id, producto: d.producto, source, presupuestoId: d.presupuestoId,
        motivo: d.detalleConsulta, diaLlamada: d.diaLlamada, turnoLlamada: d.turnoLlamada, fechaProgramada: d.fechaProgramada,
        nombre: d.nombre, telefono: d.telefono, codigoPostal: d.codigoPostal,
      });
    }
  } catch (err) { console.error("[call-request] llamada error", err); }

  const url = process.env.LEAD_WEBHOOK_URL;
  if (url) {
    try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, source, ...d }) }); }
    catch (err) { console.error("[call-request] webhook error", err); }
  }

  if (blandConfigured() && d.autorizaContacto) {
    const call = await triggerBlandCall({
      toNumber: d.telefono,
      leadId: id,
      source,
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
      source,
      producto: d.producto ?? "salud",
      codigoPostal: d.codigoPostal,
      precioAprox: d.precioElegido ?? null,
      presupuestoId: d.presupuestoId ?? null,
      utm: d.utm,
    });
    if (!sync.ok) console.error("[call-request] manychat sync error", sync.error);
  }

  // Ver comentario equivalente en app/api/lead/route.ts. Este formulario no
  // pide email (solo teléfono): si la ficha existente no tiene uno guardado
  // de un envío anterior, sendAreaClienteVerificationEmail no hace nada — no
  // se concede sesión, lo cual es el comportamiento seguro por defecto.
  if (deduped) await sendAreaClienteVerificationEmail(id);
  else setClientSessionCookie(id);
  return NextResponse.json({ ok: true, id, deduped });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
