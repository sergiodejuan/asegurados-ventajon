import { BRAND_NAME } from "./brand";
import { toE164Spain } from "./phone";

// Integración con Retell AI: cuando un lead completa el tarificador (y ya ha
// dado autorización de contacto), se dispara una llamada saliente automática
// del agente de voz configurado en Retell.
//
// Variables de entorno necesarias (Vercel → Environment Variables):
//   RETELL_API_KEY     — clave de API de Retell (Account Settings → API Keys).
//   RETELL_AGENT_ID     — ID del agente (botón "ID" en el detalle del agente).
//   RETELL_FROM_NUMBER  — número saliente en formato E.164 (+34...), comprado
//                          o importado en Retell para este agente.
// Sin estas tres variables, la llamada automática queda desactivada sin más
// (el tarificador sigue funcionando con normalidad).

const CREATE_CALL_URL = "https://api.retellai.com/v2/create-phone-call";

export function retellConfigured(): boolean {
  return !!(process.env.RETELL_API_KEY && process.env.RETELL_AGENT_ID && process.env.RETELL_FROM_NUMBER);
}

export async function triggerOutboundCall(opts: {
  toNumber: string; // ya normalizado (sin +34)
  leadId: string;
  source: string;
  dynamicVariables?: Record<string, string>;
}): Promise<{ ok: boolean; callId?: string; error?: string }> {
  if (!retellConfigured()) return { ok: false, error: "Retell no configurado." };

  try {
    const res = await fetch(CREATE_CALL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_number: process.env.RETELL_FROM_NUMBER,
        to_number: toE164Spain(opts.toNumber),
        override_agent_id: process.env.RETELL_AGENT_ID,
        retell_llm_dynamic_variables: { company: BRAND_NAME, ...opts.dynamicVariables },
        metadata: { leadId: opts.leadId, source: opts.source },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Retell ${res.status}: ${text.slice(0, 300)}` };
    }
    const body = (await res.json().catch(() => null)) as { call_id?: string } | null;
    return { ok: true, callId: body?.call_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de conexión con Retell." };
  }
}
