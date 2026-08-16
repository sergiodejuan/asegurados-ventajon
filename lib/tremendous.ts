// Cliente para la API de Tremendous — plataforma que actúa de agregador de
// vales-regalo (Amazon, Zalando, decathlon, tarjetas Visa/Mastercard, etc.).
// La usamos como motor de pago del programa "Amigos Ventajon": crear un
// reward = enviar un vale Amazon.es al email del destinatario.
//
// Documentación oficial: https://developers.tremendous.com/reference
//
// Configuración por variables de entorno (Vercel → Environment Variables):
//   · TREMENDOUS_API_KEY          Bearer token de la cuenta.
//   · TREMENDOUS_FUNDING_SOURCE_ID  ID de la fuente de fondos (Balance,
//                                   ACH, tarjeta). Ver /funding_sources.
//   · TREMENDOUS_CAMPAIGN_ID      ID de una campaña que restrinja los
//                                   productos entregables. Recomendado:
//                                   crear una campaña "Amazon.es" en el
//                                   panel de Tremendous para que el
//                                   usuario final NO pueda elegir otro
//                                   producto (control de branding).
//   · TREMENDOUS_BASE_URL         Opcional. Por defecto producción
//                                   (https://api.tremendous.com/api/v2).
//                                   En dev/QA, cambiar a
//                                   https://testflight.tremendous.com/api/v2
//                                   (entorno sandbox con dinero ficticio).
//   · CRON_SECRET                 Bearer que protege el endpoint de cron
//                                   de pagos por T+30d. Se pasa como
//                                   Authorization: Bearer <token>.
//
// Fail-closed en prod si falta la API key — evita "pagos silenciosos"
// que en realidad no se ejecutaron. En dev sin key, hace no-op y avisa
// por log; el equipo puede procesar manualmente desde el panel.

const DEFAULT_BASE_URL = "https://api.tremendous.com/api/v2";

function baseUrl(): string {
  return (process.env.TREMENDOUS_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function apiKey(): string | null {
  return process.env.TREMENDOUS_API_KEY?.trim() || null;
}

function fundingSourceId(): string {
  return process.env.TREMENDOUS_FUNDING_SOURCE_ID?.trim() || "";
}

function campaignId(): string {
  return process.env.TREMENDOUS_CAMPAIGN_ID?.trim() || "";
}

export function tremendousConfigured(): boolean {
  return !!apiKey() && !!fundingSourceId();
}

// Estructura simplificada de una order Tremendous. La API real acepta más
// campos (delivery method LINK/PHYSICAL_CARD, custom_fields, notes...) pero
// para nuestro caso EMAIL + Amazon.es es lo mínimo funcional.
type TremendousOrderRequest = {
  external_id?: string;
  payment: {
    funding_source_id: string;
  };
  reward: {
    value: { denomination: number; currency_code: string };
    campaign_id?: string;
    delivery: { method: "EMAIL" | "LINK" };
    recipient: { name: string; email: string };
    custom_fields?: Array<{ id: string; value: string }>;
  };
};

type TremendousOrderResponse = {
  order?: {
    id: string;
    external_id?: string;
    status: string; // "EXECUTED", "PENDING_REVIEW", "FAILED"...
    created_at: string;
    rewards?: Array<{
      id: string;
      status: string; // "SENT", "PENDING", "FAILED"...
      delivery?: { method: string; status: string; link?: string };
    }>;
  };
  errors?: Array<{ message: string }>;
};

export type SendRewardResult =
  | { ok: true; orderId: string; rewardId?: string; status: string }
  | { ok: false; error: string; retryable: boolean };

// Envía un vale Amazon eGift al email indicado. Usa external_id para
// idempotencia: si se llama dos veces con el mismo external_id, Tremendous
// devuelve la misma order (no cobra dos veces). Perfecto para reintentos.
//
// externalId recomendado: `ref:{code}:{leadId}:{lado}` donde lado es
// "referido" o "referidor" — así una misma conversión nunca paga dos veces.
export async function sendAmazonReward(input: {
  toEmail: string;
  toName: string;
  amountEur: number;
  externalId: string; // idempotencia
}): Promise<SendRewardResult> {
  if (!tremendousConfigured()) {
    // Fail-closed en prod: no queremos registrar "pagado" cuando en realidad
    // no se ha enviado nada. En dev/staging retornamos error y el operador
    // decide procesar manualmente.
    return {
      ok: false,
      error: "Tremendous no está configurado (falta TREMENDOUS_API_KEY o TREMENDOUS_FUNDING_SOURCE_ID).",
      retryable: false,
    };
  }
  if (!input.toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.toEmail)) {
    return { ok: false, error: "Email destinatario inválido.", retryable: false };
  }
  if (!input.amountEur || input.amountEur <= 0 || input.amountEur > 500) {
    return { ok: false, error: `Importe fuera de rango (${input.amountEur}€).`, retryable: false };
  }

  const body: TremendousOrderRequest = {
    external_id: input.externalId,
    payment: { funding_source_id: fundingSourceId() },
    reward: {
      value: { denomination: input.amountEur, currency_code: "EUR" },
      ...(campaignId() ? { campaign_id: campaignId() } : {}),
      delivery: { method: "EMAIL" },
      recipient: { name: input.toName, email: input.toEmail },
    },
  };

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Fallo de red — reintentable.
    return { ok: false, error: `Red: ${(err as Error).message}`, retryable: true };
  }

  const parsed = (await res.json().catch(() => null)) as TremendousOrderResponse | null;

  if (!res.ok) {
    // 429 / 5xx → reintentable. 4xx (validación, saldo insuficiente) → no.
    const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
    const msg = parsed?.errors?.[0]?.message ?? `HTTP ${res.status}`;
    return { ok: false, error: msg, retryable };
  }
  if (!parsed?.order?.id) {
    return { ok: false, error: "Respuesta inesperada de Tremendous (sin order.id).", retryable: false };
  }

  return {
    ok: true,
    orderId: parsed.order.id,
    rewardId: parsed.order.rewards?.[0]?.id,
    status: parsed.order.status,
  };
}

// Comprobación de solo lectura para el botón "Probar conexión" de
// /admin/integraciones/tremendous: confirma que TREMENDOUS_API_KEY es
// válida y que TREMENDOUS_FUNDING_SOURCE_ID existe de verdad en la cuenta —
// sin crear ninguna order ni gastar saldo. GET /funding_sources es el
// endpoint más ligero de la API que exige autenticación real.
export async function listFundingSources(): Promise<
  | { ok: true; sources: { id: string; name: string; balance?: string }[]; matchesConfigured: boolean }
  | { ok: false; error: string }
> {
  if (!apiKey()) return { ok: false, error: "Falta TREMENDOUS_API_KEY." };
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/funding_sources`, {
      headers: { Authorization: `Bearer ${apiKey()}`, Accept: "application/json" },
    });
  } catch (err) {
    return { ok: false, error: `Red: ${(err as Error).message}` };
  }
  const parsed = (await res.json().catch(() => null)) as
    | { funding_sources?: { id: string; name?: string; meta?: { display_name?: string }; balance?: string }[]; errors?: { message: string }[] }
    | null;
  if (!res.ok) return { ok: false, error: parsed?.errors?.[0]?.message ?? `HTTP ${res.status}` };
  const sources = (parsed?.funding_sources ?? []).map((s) => ({ id: s.id, name: s.meta?.display_name ?? s.name ?? s.id, balance: s.balance }));
  const configured = fundingSourceId();
  return { ok: true, sources, matchesConfigured: !configured || sources.some((s) => s.id === configured) };
}

// Comprueba el estado de una order previamente creada — útil para
// reconciliar bonos que quedaron en PENDING_REVIEW (fondos insuficientes,
// aprobación manual del team). El admin puede pintar esta info en el
// panel de referrals.
export async function getOrderStatus(orderId: string): Promise<
  | { ok: true; status: string; rewardStatus?: string; deliveryStatus?: string }
  | { ok: false; error: string }
> {
  if (!tremendousConfigured()) return { ok: false, error: "Tremendous no configurado." };
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${apiKey()}`, Accept: "application/json" },
    });
  } catch (err) {
    return { ok: false, error: `Red: ${(err as Error).message}` };
  }
  const parsed = (await res.json().catch(() => null)) as TremendousOrderResponse | null;
  if (!res.ok || !parsed?.order) {
    return { ok: false, error: parsed?.errors?.[0]?.message ?? `HTTP ${res.status}` };
  }
  const reward = parsed.order.rewards?.[0];
  return {
    ok: true,
    status: parsed.order.status,
    rewardStatus: reward?.status,
    deliveryStatus: reward?.delivery?.status,
  };
}
