import { NextResponse } from "next/server";
import { leadMagnetSchema } from "@/lib/schema";
import { upsertLead, updateLead } from "@/lib/store";
import { buildConsent } from "@/lib/consent";
import { rateLimitFail } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUIAS: Record<"salud" | "auto", { source: string; label: string; downloadUrl: string }> = {
  salud: {
    source: "guia-seguro-salud-canarias-baleares",
    label: 'Guía para elegir seguro de salud 2026',
    downloadUrl: "/recursos/guia-seguro-salud-2026.pdf",
  },
  auto: {
    source: "checklist-seguro-auto-canarias-baleares",
    label: "Checklist antes de renovar el seguro de auto",
    downloadUrl: "/recursos/checklist-renovar-seguro-auto.pdf",
  },
};

// Landing de recursos (Canarias/Baleares): a cambio del email se entrega al
// momento el PDF correspondiente — sin prometer un envío por correo que hoy
// no tenemos integrado, y sin pedir teléfono para mantener la fricción al
// mínimo. El lead se guarda igualmente para nutrir la newsletter (si acepta)
// y para que el equipo comercial pueda hacer seguimiento.
export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const parsed = leadMagnetSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  if (d.company) return NextResponse.json({ ok: true, downloadUrl: GUIAS[d.guia].downloadUrl });

  const limited = await rateLimitFail(request, { bucket: "lead-magnet", limit: 10, windowSeconds: 3600 });
  if (limited) return limited;

  const guia = GUIAS[d.guia];
  const consent = buildConsent(request, guia.source, "/recursos-seguros-canarias-baleares",
    { privacidad: d.aceptaPrivacidad, contacto: false, comercial: d.aceptaComercial },
    d.consent);

  const { id } = await upsertLead(
    { nombre: d.nombre, email: d.email, aceptaPrivacidad: d.aceptaPrivacidad, aceptaComercial: d.aceptaComercial, utm: d.utm },
    guia.source,
    consent
  );
  await updateLead(id, { note: `Descargó la guía "${guia.label}" desde la landing de recursos para Canarias y Baleares.` }).catch(() => {});

  return NextResponse.json({ ok: true, downloadUrl: guia.downloadUrl });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
