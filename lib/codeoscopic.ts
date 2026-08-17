// Cliente server-side de la API "Integra" de Codeoscopic (motor Avant2). Se
// usa desde app/api/quote/* — nunca desde el navegador: el client_secret
// jamás puede salir del servidor. Mismo criterio que RESEND_API_KEY /
// META_CAPI_ACCESS_TOKEN / RETELL_API_KEY (ver lib/*): si faltan variables
// de entorno, la integración queda desactivada sin romper el resto (la
// comparativa cae al catálogo mock — fallback silencioso documentado en
// components/Comparativa.tsx).
//
// Variables de entorno (Vercel → Environment Variables):
//   CODESCOPIC_BASE_URL       — URL base de la API (p.ej. https://api.codeoscopic.io o la de sandbox si Codeoscopic te dio una distinta).
//   CODESCOPIC_OAUTH_URL      — URL completa del endpoint OAuth2 (grant_type=client_credentials). No viene en la doc pública: se consigue entrando en portal.api.codeoscopic.io con el botón GET TOKEN e inspeccionando la petición, o pidiéndola a soporteapi@codeoscopic.com.
//   CODESCOPIC_CLIENT_ID      — client_id emitido por Codeoscopic para la correduría.
//   CODESCOPIC_CLIENT_SECRET  — client_secret. Nunca en el bundle del navegador.
//   CODESCOPIC_APP_HEADER     — valor de la cabecera X-Client-App que Codeoscopic asigna a cada aplicación (identifica esta web ante las aseguradoras).
//   CODESCOPIC_USER_EMAIL     — (opcional) X-User-Email, para operar en nombre de un usuario/organización concreta de la jerarquía Avant2.

// La v1 del content-type es la única publicada hoy — si Codeoscopic saca
// una v2 con cambios de shape, aquí se cambia una sola vez (todo el resto
// del código consume esta constante).
const CONTENT_TYPE = "application/vnd.codeoscopic.v1+json";

export function codeoscopicConfigured(): boolean {
  return !!(
    process.env.CODESCOPIC_BASE_URL &&
    process.env.CODESCOPIC_OAUTH_URL &&
    process.env.CODESCOPIC_CLIENT_ID &&
    process.env.CODESCOPIC_CLIENT_SECRET &&
    process.env.CODESCOPIC_APP_HEADER
  );
}

/* ------------------------------ Token cache ------------------------------ */
// Cache en memoria del proceso: en Vercel cada lambda que arranca en caliente
// reutiliza este mismo módulo mientras esté viva, así que evitamos pedir un
// token nuevo en cada petición (Codeoscopic los emite con TTL, típicamente
// 1h). Al morir la lambda el cache se pierde y se pide otro — comportamiento
// deseado: no queremos persistirlo en Redis porque es una credencial derivada
// de secretos que ya viven en env, y añadir Redis al camino crítico solo
// añade latencia y otro modo de fallo.

type CachedToken = { token: string; expiresAt: number };
let _cachedToken: CachedToken | null = null;
let _inflight: Promise<string> | null = null;
const CLOCK_SKEW_MS = 30_000; // renovar 30s antes de la expiración real

async function fetchToken(): Promise<string> {
  const oauthUrl = process.env.CODESCOPIC_OAUTH_URL!;
  const clientId = process.env.CODESCOPIC_CLIENT_ID!;
  const clientSecret = process.env.CODESCOPIC_CLIENT_SECRET!;

  // OAuth2 client credentials estándar. Aceptamos tanto el formato "Basic
  // Auth en cabecera" como "credenciales en el body" — Codeoscopic acepta
  // el primero según su portal, y es el más común. Si tu tenant exige otro
  // formato, se ajusta aquí sin tocar nada más.
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(oauthUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    // Timeout implícito: la lambda tiene su propio maxDuration; no bloqueamos
    // más de lo que la lambda vive.
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[codeoscopic] OAuth ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("[codeoscopic] OAuth: respuesta sin access_token");
  const ttlMs = Math.max(60_000, (data.expires_in ?? 3600) * 1000);
  _cachedToken = { token: data.access_token, expiresAt: Date.now() + ttlMs - CLOCK_SKEW_MS };
  return data.access_token;
}

async function getAccessToken(): Promise<string> {
  if (_cachedToken && _cachedToken.expiresAt > Date.now()) return _cachedToken.token;
  // Coalescing: si dos peticiones piden token a la vez, solo hacemos una
  // llamada real a Codeoscopic. Evita ráfagas cuando un cold start atiende
  // varias comparativas en paralelo.
  if (_inflight) return _inflight;
  _inflight = fetchToken().finally(() => { _inflight = null; });
  return _inflight;
}

/* ---------------------------- Fetch autenticado --------------------------- */

export type CodeoscopicRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  // AbortSignal para propagar timeouts desde la ruta que llama (útil para
  // cortar antes del maxDuration de la lambda y devolver un error controlado).
  signal?: AbortSignal;
};

// path relativo tipo "/insurances" — se compone con CODESCOPIC_BASE_URL.
export async function codeoscopicFetch<T = unknown>(path: string, opts: CodeoscopicRequestOptions = {}): Promise<T> {
  if (!codeoscopicConfigured()) throw new Error("[codeoscopic] no configurado — revisa las variables de entorno.");
  const token = await getAccessToken();
  const base = process.env.CODESCOPIC_BASE_URL!.replace(/\/+$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Accept": CONTENT_TYPE,
    "X-Client-App": process.env.CODESCOPIC_APP_HEADER!,
  };
  if (opts.body !== undefined) headers["Content-Type"] = CONTENT_TYPE;
  const userEmail = process.env.CODESCOPIC_USER_EMAIL;
  if (userEmail) headers["X-User-Email"] = userEmail;

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: opts.signal,
  });

  // 401: el token que teníamos ha caducado o ha sido revocado. Invalidamos
  // el cache y reintentamos UNA vez — evita que una revocación puntual
  // (rotación de secretos) tumbe la comparativa hasta el siguiente cold
  // start. Un segundo 401 sí se propaga como error real.
  if (res.status === 401) {
    _cachedToken = null;
    const token2 = await getAccessToken();
    const res2 = await fetch(url, {
      method: opts.method ?? "GET",
      headers: { ...headers, "Authorization": `Bearer ${token2}` },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
    if (!res2.ok) throw new CodeoscopicError(res2.status, await res2.text().catch(() => ""));
    return res2.json() as Promise<T>;
  }
  if (!res.ok) throw new CodeoscopicError(res.status, await res.text().catch(() => ""));
  return res.json() as Promise<T>;
}

export class CodeoscopicError extends Error {
  constructor(public status: number, public bodySnippet: string) {
    super(`[codeoscopic] ${status}: ${bodySnippet.slice(0, 300)}`);
    this.name = "CodeoscopicError";
  }
}

/* ------------------------------ Tipos parciales --------------------------- */
// Solo los campos que consumimos hoy. El shape completo vive en la doc de
// portal.api.codeoscopic.io — aquí evitamos "map todo" para no romper cada
// vez que Codeoscopic añada un campo nuevo.

export type CodeoscopicQuote = {
  id: string;
  product?: {
    name?: string;
    vendor?: { name?: string };
    modality?: { name?: string; category?: { name?: string }; rating?: number; ratingDescription?: string };
    // Logo de la aseguradora/producto (SVG servido por Avant2). Es la fuente
    // de "logos de aseguradoras" — viene ya en cada cotización, no hace falta
    // cruzar con /insurance-vendors salvo para catálogos.
    imageUrl?: string;
  };
  paymentMethod?: { id?: string; name?: string };
  paymentFrequency?: { id?: string; installments?: number };
  downPayment?: number;
  premium?: number;
  termMonths?: number;
  // Franquicia (solo en modalidades con deducible, p.ej. todo riesgo). En
  // salud normalmente no aplica, pero lo tipamos para reutilizar el mapa.
  deductible?: number;
  estimate?: boolean;
  // Enlaces del producto (condicionado/IPID en PDF) que devuelve la cotización.
  links?: { name?: string; url?: string }[];
  actions?: { id?: string; required?: boolean }[];
  policyApplicationSupported?: boolean;
  // Cuando una aseguradora aún no ha respondido, Codeoscopic devuelve un
  // objeto sin premium/downPayment y con algún indicador de estado. Aquí lo
  // recogemos como opcional para poder mostrarlo como "cargando".
  status?: string;
};

export type CodeoscopicInsurance = {
  id: string;
  insuranceLine?: { id?: string; name?: string };
  effectiveDate?: string;
  mainQuotes?: CodeoscopicQuote[];
  addonQuotes?: CodeoscopicQuote[];
  // Ofertas pre-empaquetadas (cotización principal + complementarias
  // compatibles). Cada oferta es la unidad sobre la que se piden coberturas,
  // se re-tarifica (estimate→firme) y se generan informes PDF.
  offers?: CodeoscopicOffer[];
  // Cotizaciones que fallaron por aseguradora (timeout, credenciales, etc.).
  errors?: { product?: { name?: string; vendor?: { name?: string } }; messages?: { type?: string; description?: string }[] }[];
  // La forma completa incluye holder, risk, producerUser, etc. — no las
  // consumimos server-side salvo para depurar.
};

export type CodeoscopicOffer = {
  id: string | number;
  mainQuote?: { id?: string | number };
  addonQuotes?: { id?: string | number }[];
  totalDownPayment?: number;
  totalPremium?: number;
};

/* ------------------------- Catálogos y metadatos -------------------------- */
// Endpoints de solo lectura que describen QUÉ se puede tarificar y con quién:
// líneas activas, productos por línea, vendors (con logo) y compañías DGS.
// Se usan en el back office (diagnóstico de la integración, catálogos) y
// para enriquecer la comparativa con logos/nombres cuando haga falta.

export type CodeoscopicLine = {
  id: string;
  path?: string;
  name?: string;
  active?: boolean;
  supports?: { rating?: boolean; policyApplication?: boolean; policyApplicationsReport?: boolean };
};

export type CodeoscopicVendor = { id: string; name?: string; description?: string; imageUrl?: string };
export type CodeoscopicCompany = { code: string; name?: string };
export type CodeoscopicProduct = {
  id: number;
  name?: string;
  description?: string;
  imageUrl?: string;
  configs?: { id?: number; name?: string; imageUrl?: string; favorite?: boolean }[];
  supports?: { policyApplication?: boolean };
};

/* ---------------------------- Helpers por endpoint ------------------------ */
// Envoltorios finos y tipados de cada operación de la API. Centralizan el
// path y el tipo de respuesta para que las rutas /api/* no repitan strings
// ni casts. Toda la autenticación/reintentos vive en codeoscopicFetch.

/** GET /insurance-lines — líneas de seguro (Health, Car, …) y si están activas. */
export function listInsuranceLines(onlyActive = false): Promise<CodeoscopicLine[]> {
  return codeoscopicFetch<CodeoscopicLine[]>(`/insurance-lines${onlyActive ? "?onlyActive=true" : ""}`);
}

/** GET /insurance-lines/{id}/products — productos activos de una línea. */
export function listInsuranceProducts(lineId: string): Promise<CodeoscopicProduct[]> {
  return codeoscopicFetch<CodeoscopicProduct[]>(`/insurance-lines/${encodeURIComponent(lineId)}/products`);
}

/** GET /insurance-vendors — entidades que comercializan (con logo). */
export function listInsuranceVendors(): Promise<CodeoscopicVendor[]> {
  return codeoscopicFetch<CodeoscopicVendor[]>("/insurance-vendors");
}

/** GET /insurance-companies — aseguradoras registradas en la DGS (código + nombre). */
export function listInsuranceCompanies(): Promise<CodeoscopicCompany[]> {
  return codeoscopicFetch<CodeoscopicCompany[]>("/insurance-companies");
}

/** GET /insurances/{id} — recupera un proyecto con sus cotizaciones/ofertas. */
export function getInsurance(id: string | number): Promise<CodeoscopicInsurance> {
  return codeoscopicFetch<CodeoscopicInsurance>(`/insurances/${encodeURIComponent(String(id))}`);
}

/** POST /insurances/{id}/offers — re-tarifica una oferta (estimate → precio firme). */
export function reRateOffer(
  id: string | number,
  body: { mainQuote: { id: string | number; product?: { options?: unknown[] } }; addonQuotes?: { id: string | number }[] },
  signal?: AbortSignal,
): Promise<CodeoscopicOffer & Record<string, unknown>> {
  return codeoscopicFetch(`/insurances/${encodeURIComponent(String(id))}/offers`, { method: "POST", body, signal });
}

/** PATCH /insurances/{id} — completa/actualiza datos para pasar a contratación. */
export function patchInsurance(id: string | number, body: Record<string, unknown>): Promise<void> {
  return codeoscopicFetch<void>(`/insurances/${encodeURIComponent(String(id))}`, { method: "PATCH", body });
}

/** POST /insurances/{id}/reports — genera un informe (PDF) de ofertas/coberturas. */
export function createInsuranceReport(
  id: string | number,
  body: { type: "Offers"; offerIds: (string | number)[]; includeCoverages?: boolean; includePremiumBreakdown?: boolean; includeBrokerFee?: boolean; includeIpid?: boolean },
): Promise<{ name?: string; url?: string; creationDateTime?: string; expirationDateTime?: string }> {
  return codeoscopicFetch(`/insurances/${encodeURIComponent(String(id))}/reports`, { method: "POST", body });
}
