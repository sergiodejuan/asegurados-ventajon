import {
  getReferralByCode, updateReferralConvertidoStatus,
  isEligibleReferrer, getLead, getReferralLandingConfig,
  claimOnce,
} from "./store";
import { sendAmazonReward, tremendousConfigured } from "./tremendous";
import type { SendRewardResult } from "./tremendous";

// Lógica de pago del programa "Amigos Ventajon". Se llama desde:
//   · /api/referral/opt-in     → payReferidoBonus (bono al amigo)
//   · /api/referral/process-payouts (cron)    → payReferidorBonus (bono al cliente)
//   · /api/admin/referral/retry (manual)       → cualquiera de los dos
//
// Todo con external_id determinista para idempotencia y claimOnce local
// para evitar carreras (dos crons a la vez, doble clic en admin, etc.).

const MAX_RETRIES = 5;

function externalId(code: string, leadId: string, lado: "referido" | "referidor"): string {
  return `ref:${code}:${leadId}:${lado}`;
}

// Bono al AMIGO (referido) — tras opt-in del email. Amount = config.montoReferido.
// Se envía al email del propio lead del amigo.
export async function payReferidoBonus(code: string, leadId: string): Promise<SendRewardResult> {
  const cfg = await getReferralLandingConfig();
  if (!cfg.programaActivo) return { ok: false, error: "Programa pausado.", retryable: false };

  const claim = await claimOnce(`payout:referido:${code}:${leadId}`, 5 * 60 * 1000);
  if (!claim) return { ok: false, error: "Pago ya en curso o completado recientemente.", retryable: false };

  const doc = await getReferralByCode(code);
  if (!doc || doc.bloqueado) return { ok: false, error: "Código no válido o bloqueado.", retryable: false };
  const conv = doc.convertidos.find((c) => c.leadId === leadId);
  if (!conv) return { ok: false, error: "Convertido no encontrado.", retryable: false };
  if (conv.pagadoReferidoAt || conv.tremendousOrderIdReferido) {
    return { ok: true, orderId: conv.tremendousOrderIdReferido ?? "", status: "already_paid" };
  }
  if (conv.status !== "opt-in" && conv.status !== "contratado") {
    return { ok: false, error: `Estado no elegible para pago referido: ${conv.status}`, retryable: false };
  }
  if ((conv.retryCountReferido ?? 0) >= MAX_RETRIES) {
    return { ok: false, error: "Máximo de reintentos alcanzado.", retryable: false };
  }

  const amigo = await getLead(conv.leadId);
  const amigoEmail = amigo?.email?.trim().toLowerCase() ?? "";
  const amigoNombre = amigo?.nombre?.trim() ?? conv.nombre ?? "Amigo";
  if (!amigoEmail) return { ok: false, error: "Email del amigo no disponible.", retryable: false };

  const result = await sendAmazonReward({
    toEmail: amigoEmail,
    toName: amigoNombre,
    amountEur: cfg.incentivo.montoReferido,
    externalId: externalId(code, leadId, "referido"),
  });

  if (result.ok) {
    await updateReferralConvertidoStatus(code, leadId, {
      tremendousOrderIdReferido: result.orderId,
      pagadoReferidoAt: new Date().toISOString(),
      ultimoErrorPago: undefined,
    });
  } else {
    await updateReferralConvertidoStatus(code, leadId, {
      retryCountReferido: (conv.retryCountReferido ?? 0) + 1,
      ultimoErrorPago: `referido: ${result.error}`,
    });
  }
  return result;
}

// Bono al REFERIDOR — cuando el amigo contrata y supera N días de gracia.
// Verifica elegibilidad (aún tiene póliza contratada) + cap anual.
export async function payReferidorBonus(code: string, leadIdAmigo: string): Promise<SendRewardResult> {
  const cfg = await getReferralLandingConfig();
  if (!cfg.programaActivo) return { ok: false, error: "Programa pausado.", retryable: false };

  const claim = await claimOnce(`payout:referidor:${code}:${leadIdAmigo}`, 5 * 60 * 1000);
  if (!claim) return { ok: false, error: "Pago ya en curso o completado recientemente.", retryable: false };

  const doc = await getReferralByCode(code);
  if (!doc || doc.bloqueado) return { ok: false, error: "Código no válido o bloqueado.", retryable: false };
  const conv = doc.convertidos.find((c) => c.leadId === leadIdAmigo);
  if (!conv) return { ok: false, error: "Convertido no encontrado.", retryable: false };
  if (conv.pagadoReferidorAt || conv.tremendousOrderIdReferidor) {
    return { ok: true, orderId: conv.tremendousOrderIdReferidor ?? "", status: "already_paid" };
  }
  if (conv.status !== "contratado") {
    return { ok: false, error: `Convertido no está contratado (${conv.status}).`, retryable: false };
  }
  if (!conv.contratadoAt) {
    return { ok: false, error: "Sin fecha de contratación registrada.", retryable: false };
  }
  const graciaMs = cfg.incentivo.graciaContratacionDias * 24 * 60 * 60 * 1000;
  const graciaCumplida = Date.now() - Date.parse(conv.contratadoAt) >= graciaMs;
  if (!graciaCumplida) {
    return { ok: false, error: `Aún en periodo de gracia (${cfg.incentivo.graciaContratacionDias} días).`, retryable: false };
  }
  if ((conv.retryCountReferidor ?? 0) >= MAX_RETRIES) {
    return { ok: false, error: "Máximo de reintentos alcanzado.", retryable: false };
  }

  // Verificar que el referidor SIGUE siendo cliente contratado — si canceló
  // todas sus pólizas en el ínterin, no le pagamos el bono (política del
  // programa). Es una comprobación live, no una foto histórica.
  const stillEligible = await isEligibleReferrer(doc.referidorLeadId);
  if (!stillEligible) {
    return { ok: false, error: "Referidor ya no tiene póliza activa.", retryable: false };
  }

  const result = await sendAmazonReward({
    toEmail: doc.referidorEmail,
    toName: doc.referidorNombre,
    amountEur: cfg.incentivo.montoReferidor,
    externalId: externalId(code, leadIdAmigo, "referidor"),
  });

  if (result.ok) {
    await updateReferralConvertidoStatus(code, leadIdAmigo, {
      tremendousOrderIdReferidor: result.orderId,
      pagadoReferidorAt: new Date().toISOString(),
      status: "pagado",
      ultimoErrorPago: undefined,
    });
  } else {
    await updateReferralConvertidoStatus(code, leadIdAmigo, {
      retryCountReferidor: (conv.retryCountReferidor ?? 0) + 1,
      ultimoErrorPago: `referidor: ${result.error}`,
    });
  }
  return result;
}

export { tremendousConfigured };
