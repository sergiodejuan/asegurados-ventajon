import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getReferralByCode, listAllReferralCodes, getReferralLandingConfig } from "@/lib/store";
import { payReferidorBonus, payReferidoBonus, tremendousConfigured } from "@/lib/referralPayouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron de pagos del programa referidos.
//
// Ejecuciones diarias (Vercel Cron — ver vercel.json) que:
//   1. Reintenta bonos de REFERIDO en status "opt-in" que fallaron (por
//      Tremendous caído u otro error transitorio).
//   2. Paga bonos de REFERIDOR cuando el amigo pasa T+N días desde la
//      contratación (N configurable desde /admin/campanas/referidos).
//
// Protegido con CRON_SECRET (Bearer). Vercel Cron incluye
// `Authorization: Bearer $CRON_SECRET` automáticamente si la variable
// está configurada en el proyecto. Cualquier otra llamada externa debe
// mandar el mismo header o se rechaza con 401.

function timingSafeStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return timingSafeStr(match[1], secret);
}

// GET porque es lo que Vercel Cron llama por defecto. Aceptamos también
// POST por si un admin lo dispara desde otro cliente.
async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  if (!tremendousConfigured()) {
    return NextResponse.json({
      ok: false,
      error: "Tremendous no está configurado (falta TREMENDOUS_API_KEY / TREMENDOUS_FUNDING_SOURCE_ID).",
    }, { status: 503 });
  }

  const cfg = await getReferralLandingConfig();
  if (!cfg.programaActivo) {
    return NextResponse.json({ ok: true, skipped: true, reason: "programa_pausado" });
  }

  const codes = await listAllReferralCodes();
  const graciaMs = cfg.incentivo.graciaContratacionDias * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const summary = {
    codesScanned: codes.length,
    referidoPaid: 0,
    referidoFailed: 0,
    referidoSkipped: 0,
    referidorPaid: 0,
    referidorFailed: 0,
    referidorSkipped: 0,
    errors: [] as Array<{ code: string; leadId: string; lado: string; error: string }>,
  };

  for (const code of codes) {
    const doc = await getReferralByCode(code).catch(() => null);
    if (!doc || doc.bloqueado) continue;
    for (const conv of doc.convertidos) {
      // Reintentar bono al REFERIDO si quedó pendiente tras opt-in.
      if (conv.status === "opt-in" && !conv.pagadoReferidoAt && !conv.tremendousOrderIdReferido) {
        const res = await payReferidoBonus(code, conv.leadId).catch((err) => ({
          ok: false as const, error: String((err as Error).message), retryable: true,
        }));
        if (res.ok) summary.referidoPaid++;
        else {
          summary.referidoFailed++;
          summary.errors.push({ code, leadId: conv.leadId, lado: "referido", error: res.error });
        }
      }

      // Pago al REFERIDOR cuando el amigo cumple gracia post-contratación.
      if (conv.status === "contratado" && conv.contratadoAt && !conv.pagadoReferidorAt) {
        const graciaCumplida = now - Date.parse(conv.contratadoAt) >= graciaMs;
        if (!graciaCumplida) { summary.referidorSkipped++; continue; }
        const res = await payReferidorBonus(code, conv.leadId).catch((err) => ({
          ok: false as const, error: String((err as Error).message), retryable: true,
        }));
        if (res.ok) summary.referidorPaid++;
        else {
          summary.referidorFailed++;
          summary.errors.push({ code, leadId: conv.leadId, lado: "referidor", error: res.error });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }
