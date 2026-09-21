import { NextRequest, NextResponse } from "next/server";

// Middleware Edge — se ejecuta antes de cada request. Aquí implementamos
// dos defensas transversales:
//
//  1) CSRF por doble señal: en TODAS las mutaciones (POST/PUT/PATCH/DELETE)
//     de rutas /api/admin/* y /api/client/*, exigimos que el header Origin
//     (o Referer como fallback) coincida con el host de la petición, O que
//     el Sec-Fetch-Site sea 'same-origin' / 'same-site' / 'none'. Los
//     ataques CSRF cross-origin desde otro dominio no pueden falsificar
//     Origin ni Sec-Fetch-Site (los pone el navegador). Los tokens API
//     (x-admin-token, x-manychat-secret, x-retell-signature, x-webhook-
//     signature) están whitelistados: son integraciones server-to-server
//     que no traen Origin y ya autentican por su propio mecanismo.
//
//  2) Cabeceras de aislamiento COOP/CORP en TODAS las respuestas:
//     Cross-Origin-Opener-Policy same-origin (defensa contra Spectre-class
//     y contra window.opener leaks) y Cross-Origin-Resource-Policy
//     same-origin en /api/* (evita hotlinking de nuestras APIs desde
//     otros orígenes).

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PROTECTED_PREFIXES = ["/api/admin/", "/api/client/"];

// Endpoints que reciben webhooks server-to-server: no traen Origin pero
// ya autentican por su firma HMAC propia (Retell, Bland, Manychat).
// Los excluimos de la comprobación de origen — su seguridad depende de
// verifySignature en su propia route.
const WEBHOOK_ROUTES = new Set([
  "/api/retell/webhook",
  "/api/bland/webhook",
  "/api/manychat/cliente",
  // ManyChat también llama PATCH /api/manychat/llamadas/[id]
]);

function isWebhookRoute(path: string): boolean {
  if (WEBHOOK_ROUTES.has(path)) return true;
  if (path.startsWith("/api/manychat/")) return true;
  return false;
}

function isProtectedMutation(request: NextRequest): boolean {
  if (!MUTATION_METHODS.has(request.method)) return false;
  const path = request.nextUrl.pathname;
  if (isWebhookRoute(path)) return false;
  return PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function checkSameOrigin(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? "";

  // Sec-Fetch-Site es un header estándar puesto por el navegador que no
  // se puede falsificar desde JS. Los valores 'same-origin' y 'same-site'
  // son seguros; 'none' es una acción del usuario (barra URL, marcador);
  // 'cross-site' bloquea.
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    return ["same-origin", "same-site", "none"].includes(secFetchSite);
  }

  // Fallback para navegadores/clientes sin Sec-Fetch-Site: exigir Origin
  // (o Referer) igual al host. Sin ninguno de los dos, rechazar.
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = origin || referer;
  if (!candidate) return false;
  try {
    const parsed = new URL(candidate);
    return parsed.host === host;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  // Verificación CSRF sólo para mutaciones sensibles.
  if (isProtectedMutation(request)) {
    if (!checkSameOrigin(request)) {
      return NextResponse.json(
        { ok: false, error: "Origen no válido para esta petición." },
        { status: 403 }
      );
    }
  }

  const res = NextResponse.next();
  // Aislamiento COOP para todas las páginas (defensa contra ataques que
  // dependen de window.opener y contra clase Spectre en navegadores modernos).
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  // CORP en API: nadie puede embebernos como recurso cross-origin (previene
  // hotlinking de nuestras rutas /api). Las páginas HTML se dejan cargables
  // (el sitio se comparte por links, previews, redes sociales).
  if (request.nextUrl.pathname.startsWith("/api/")) {
    res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  }
  return res;
}

// Aplicar a TODO menos static assets y archivos de Next.js internos.
// Sin esto, cada request pagaría 1-2ms de overhead innecesario en /_next/static.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|recursos/|robots.txt|sitemap.xml).*)",
  ],
};
