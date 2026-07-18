import { NextResponse } from "next/server";
import { markEmailClicked } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Envuelve cada enlace de los correos transaccionales (ver
// lib/comparativaEmail.ts) para poder marcar "clic" en la ficha del lead
// antes de mandar al destino real. Solo redirige a una ruta propia relativa
// (nunca a un host externo arbitrario): sin esto, cualquiera podría usar
// este endpoint como open-redirect para hacer pasar un enlace de phishing
// por uno de nuestro dominio.
function safeDestination(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead") ?? "";
  const logId = searchParams.get("log") ?? "";
  const dest = safeDestination(searchParams.get("url"));
  if (leadId && logId) await markEmailClicked(leadId, logId).catch(() => {});

  return NextResponse.redirect(new URL(dest, request.url));
}
