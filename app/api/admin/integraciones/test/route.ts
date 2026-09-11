import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { pingStore } from "@/lib/store";
import { CODESCOPIC_ENV_VARS, TREMENDOUS_ENV_VARS } from "@/lib/integrationsCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestTarget = "codescopic" | "tremendous" | "api-propia" | "webhook-saliente" | "webhook-retell" | "webhook-bland";

async function testTremendous(): Promise<{ ok: boolean; detail: string }> {
  const REQUIRED = TREMENDOUS_ENV_VARS.filter((v) => v.obligatoria).map((v) => v.nombre);
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) {
    return { ok: false, detail: `Faltan variables de entorno: ${missing.join(", ")}. Ver docs/referrals.md para cómo obtenerlas.` };
  }
  const { listFundingSources } = await import("@/lib/tremendous");
  const result = await listFundingSources();
  if (!result.ok) return { ok: false, detail: `No se pudo autenticar contra Tremendous: ${result.error}` };
  if (!result.matchesConfigured) {
    return { ok: false, detail: `OAuth OK, pero TREMENDOUS_FUNDING_SOURCE_ID no aparece entre las ${result.sources.length} fuentes de fondos de la cuenta. Revisa el ID.` };
  }
  return { ok: true, detail: `Autenticación OK. La cuenta tiene ${result.sources.length} fuente(s) de fondos y la configurada existe.` };
}

async function testCodescopic(): Promise<{ ok: boolean; detail: string }> {
  // CODESCOPIC_USER_EMAIL es opcional (cabecera X-User-Email); no lo
  // incluimos en la comprobación de "faltantes".
  const REQUIRED = CODESCOPIC_ENV_VARS.map((v) => v.nombre).filter((n) => n !== "CODESCOPIC_USER_EMAIL");
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) {
    return { ok: false, detail: `Faltan variables de entorno: ${missing.join(", ")}. Añádelas cuando las tengas de Codeoscopic.` };
  }

  // Verificación real: pedimos un access_token con las credenciales
  // configuradas y, si sale, hacemos una llamada ligera a /insurance-lines
  // para confirmar que la cuenta tiene acceso al API. Si falla, devolvemos
  // el detalle para que Sergio sepa exactamente qué corregir.
  try {
    const { codeoscopicFetch } = await import("@/lib/codeoscopic");
    const lines = await codeoscopicFetch<unknown>("/insurance-lines");
    const count = Array.isArray(lines) ? lines.length : Array.isArray((lines as { items?: unknown[] })?.items) ? (lines as { items: unknown[] }).items.length : null;
    return {
      ok: true,
      detail: count != null
        ? `OAuth OK y GET /insurance-lines devolvió ${count} líneas de seguro. La cuenta está operativa.`
        : "OAuth OK y GET /insurance-lines respondió. La cuenta está operativa.",
    };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? `No se pudo autenticar contra Codeoscopic: ${err.message}` : "No se pudo autenticar contra Codeoscopic." };
  }
}

async function testApiPropia(): Promise<{ ok: boolean; detail: string }> {
  const result = await pingStore();
  if (!result.ok) return { ok: false, detail: `Fallo de conexión con el almacén (${result.backend}): ${result.error}` };
  return { ok: true, detail: `Almacén "${result.backend === "kv" ? "Redis (KV)" : "memoria (dev)"}" respondió en ${result.latencyMs} ms.` };
}

async function testWebhookSaliente(): Promise<{ ok: boolean; detail: string }> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return { ok: false, detail: "No configurado: falta la variable de entorno LEAD_WEBHOOK_URL." };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true, id: "test-integraciones", source: "integraciones-test", at: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, detail: `El endpoint respondió con error (HTTP ${res.status}).` };
    return { ok: true, detail: `Se envió un POST de prueba (marcado con "test": true) y el endpoint respondió HTTP ${res.status}.` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? `No se pudo enviar: ${err.message}` : "No se pudo enviar el webhook de prueba." };
  }
}

async function testInboundWebhook(request: Request, path: string, providerConfigured: boolean, envHint: string): Promise<{ ok: boolean; detail: string }> {
  const origin = new URL(request.url).origin;
  try {
    // Estos endpoints solo aceptan POST de verdad (con firma verificada); un
    // GET debe devolver 405 "Método no permitido" — eso confirma que la ruta
    // existe y está desplegada, sin poder simular una llamada real firmada.
    const res = await fetch(`${origin}${path}`, { method: "GET", signal: AbortSignal.timeout(8000) });
    const reachable = res.status === 405;
    const parts = [
      reachable
        ? `El endpoint está desplegado y accesible en ${path} (respondió HTTP 405 a un GET, como se espera).`
        : `El endpoint respondió con HTTP ${res.status} en vez de 405 — revisa el despliegue.`,
      providerConfigured
        ? "La verificación de firma está configurada."
        : `Sin configurar: falta ${envHint}. Los avisos que lleguen no se van a validar (o directamente se van a rechazar).`,
    ];
    return { ok: reachable, detail: parts.join(" ") };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? `No se pudo comprobar el endpoint: ${err.message}` : "No se pudo comprobar el endpoint." };
  }
}

export async function POST(request: Request) {
  const auth = await requireModule(request, "integraciones");
  if (!auth.ok) return auth.response;

  let body: { target?: TestTarget };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  switch (body.target) {
    case "codescopic": {
      const r = await testCodescopic();
      return NextResponse.json(r, { status: r.ok ? 200 : 503 });
    }
    case "tremendous": {
      const r = await testTremendous();
      return NextResponse.json(r, { status: r.ok ? 200 : 502 });
    }
    case "api-propia": {
      const r = await testApiPropia();
      return NextResponse.json(r, { status: r.ok ? 200 : 502 });
    }
    case "webhook-saliente": {
      const r = await testWebhookSaliente();
      return NextResponse.json(r, { status: r.ok ? 200 : 503 });
    }
    case "webhook-retell": {
      const { retellConfigured } = await import("@/lib/retell");
      const r = await testInboundWebhook(request, "/api/retell/webhook", retellConfigured(), "RETELL_API_KEY (se usa también como secreto de firma)");
      return NextResponse.json(r, { status: r.ok ? 200 : 502 });
    }
    case "webhook-bland": {
      const { blandConfigured } = await import("@/lib/bland");
      const r = await testInboundWebhook(request, "/api/bland/webhook", blandConfigured(), "BLAND_WEBHOOK_SECRET");
      return NextResponse.json(r, { status: r.ok ? 200 : 502 });
    }
    default:
      return NextResponse.json({ ok: false, error: "target no válido." }, { status: 400 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
