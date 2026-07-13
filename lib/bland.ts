import { BRAND_NAME } from "./brand";
import { toE164Spain } from "./phone";

// Integración con Bland.ai: cuando un lead completa el tarificador o solicita
// una llamada (y ya ha dado autorización de contacto), se dispara una llamada
// saliente automática del agente/pathway configurado en Bland.
//
// Variables de entorno necesarias (Vercel → Environment Variables):
//   BLAND_API_KEY       — clave de API de Bland (Dev Portal → Account Settings → Keys).
//   BLAND_PATHWAY_ID     — ID del pathway/conversación a usar (Copy ID en el pathway).
//   BLAND_WEBHOOK_SECRET — (opcional) secreto de firma del webhook, para verificar
//                           que las llamadas a /api/bland/webhook vienen de Bland.
// Sin las dos primeras, la llamada automática queda desactivada sin más (el
// tarificador y "quiero que me llamen" siguen funcionando con normalidad).
//
// ⚠️ Si además tienes Retell configurado (lib/retell.ts), no actives las dos
// integraciones a la vez: el mismo lead recibiría dos llamadas de dos agentes
// distintos. Configura las variables de entorno de un solo proveedor.

const CREATE_CALL_URL = "https://api.bland.ai/v1/calls";

export function blandConfigured(): boolean {
  return !!(process.env.BLAND_API_KEY && process.env.BLAND_PATHWAY_ID);
}

export async function triggerBlandCall(opts: {
  toNumber: string; // ya normalizado (sin +34)
  leadId: string;
  source: string;
  requestData?: Record<string, string>;
}): Promise<{ ok: boolean; callId?: string; error?: string }> {
  if (!blandConfigured()) return { ok: false, error: "Bland no configurado." };

  try {
    const res = await fetch(CREATE_CALL_URL, {
      method: "POST",
      headers: {
        authorization: process.env.BLAND_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: toE164Spain(opts.toNumber),
        pathway_id: process.env.BLAND_PATHWAY_ID,
        request_data: { company: BRAND_NAME, ...opts.requestData },
        metadata: { leadId: opts.leadId, source: opts.source },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Bland ${res.status}: ${text.slice(0, 300)}` };
    }
    const body = (await res.json().catch(() => null)) as { call_id?: string } | null;
    return { ok: true, callId: body?.call_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de conexión con Bland." };
  }
}
