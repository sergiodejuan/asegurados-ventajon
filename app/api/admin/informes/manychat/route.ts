import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";

// Informe "Leads ManyChat" para /admin/informes/manychat. Lee EN VIVO la
// pestaña DASHBOARD de la hoja maestra de Google Sheets a través de un Web App
// de Google Apps Script protegido por un secreto compartido. El cálculo vive en
// la propia hoja (fórmulas); aquí solo se lee de solo lectura, sin exponer las
// pestañas con datos personales. Ver docs/informe-manychat-google-sheets.md.
//
// Config (variables de entorno del proyecto):
//   SHEETS_WEBAPP_URL    — la URL .../exec del despliegue del Web App.
//   SHEETS_WEBAPP_SECRET — el mismo secreto fijado en Propiedades del script.
// Sin ambas, el endpoint responde configured:false (200) y la página muestra
// las instrucciones de conexión en vez de un error.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function webappUrl(): string {
  return (process.env.SHEETS_WEBAPP_URL || "").trim();
}
function webappSecret(): string {
  return (process.env.SHEETS_WEBAPP_SECRET || "").trim();
}

// Estructura flexible: la hoja manda. Normalizamos lo justo para que un payload
// parcial siga pintando sin romper la página.
type Kpi = { label: string; value: string; hint?: string };
type Section = { title: string; columns: string[]; rows: string[][] };
type Report = { generatedAt: string; kpis: Kpi[]; sections: Section[] };

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function normalizeReport(raw: unknown): Report {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const kpis: Kpi[] = Array.isArray(obj.kpis)
    ? obj.kpis
        .map((k) => {
          const o = (k && typeof k === "object" ? k : {}) as Record<string, unknown>;
          return { label: str(o.label), value: str(o.value), hint: str(o.hint) || undefined };
        })
        .filter((k) => k.label || k.value)
    : [];

  const sections: Section[] = Array.isArray(obj.sections)
    ? obj.sections
        .map((s) => {
          const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
          const columns = Array.isArray(o.columns) ? o.columns.map(str) : [];
          const rows = Array.isArray(o.rows)
            ? o.rows.map((r) => (Array.isArray(r) ? r.map(str) : [])).filter((r) => r.length > 0)
            : [];
          return { title: str(o.title), columns, rows };
        })
        .filter((s) => s.rows.length > 0 || s.columns.length > 0)
    : [];

  return { generatedAt: str(obj.generatedAt) || new Date().toISOString(), kpis, sections };
}

export async function GET(request: Request) {
  const auth = await requireModule(request, "informes");
  if (!auth.ok) return auth.response;

  const url = webappUrl();
  const secret = webappSecret();
  if (!url || !secret) {
    return NextResponse.json({ ok: true, configured: false });
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1" ? "1" : "0";

  // El secreto viaja como parámetro `token` (el Apps Script compara
  // e.parameter.token === SECRET). El fetch es server-side, así que la CSP del
  // navegador no aplica y el secreto nunca llega al cliente.
  const target = new URL(url);
  target.searchParams.set("token", secret);
  target.searchParams.set("refresh", refresh);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(target.toString(), {
      // Apps Script /exec redirige a script.googleusercontent.com: seguir.
      redirect: "follow",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("[informes/manychat] Web App respondió", res.status);
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          error:
            res.status === 401 || res.status === 403
              ? "El secreto no coincide con el del script (revisa SHEETS_WEBAPP_SECRET y la propiedad SECRET del Apps Script)."
              : `El Web App de Google respondió ${res.status}. Revisa que el despliegue esté activo y con acceso «Cualquiera».`,
        },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Apps Script suele devolver una página HTML de error/login cuando el
      // despliegue no es «Cualquiera» o la URL no es la de /exec.
      console.error("[informes/manychat] respuesta no-JSON del Web App");
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          error:
            "El Web App no devolvió JSON. Vuelve a implementar como «Aplicación web», ejecutar como tú y acceso «Cualquiera», y usa la URL que termina en /exec.",
        },
        { status: 502 },
      );
    }

    // El script puede señalar su propio error de auth con { ok:false }.
    if (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).ok === false) {
      const err = str((parsed as Record<string, unknown>).error) || "El script rechazó la petición (secreto inválido).";
      return NextResponse.json({ ok: false, configured: true, error: err }, { status: 502 });
    }

    return NextResponse.json({ ok: true, configured: true, report: normalizeReport(parsed) });
  } catch (err) {
    const aborted = (err as Error).name === "AbortError";
    console.error("[informes/manychat] fallo al leer el Web App", (err as Error).message);
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: aborted
          ? "El Web App de Google tardó demasiado en responder. Inténtalo de nuevo."
          : "No se pudo contactar con el Web App de Google. Revisa SHEETS_WEBAPP_URL.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function POST() {
  return NextResponse.json({ ok: false, error: "Método no permitido." }, { status: 405 });
}
