import { NextRequest, NextResponse } from "next/server";
import { getSiteLockConfigCached, isUnlockSessionValid, SITE_LOCK_COOKIE } from "@/lib/siteLock";

// Middleware Edge — se ejecuta antes de cada request. Aquí implementamos
// tres defensas/funciones transversales:
//
//  1) CSRF por doble señal: en TODAS las mutaciones (POST/PUT/PATCH/DELETE)
//     de rutas /api/admin/*, /api/client/* y /api/site-lock/*, exigimos que
//     el header Origin (o Referer como fallback) coincida con el host de la
//     petición, O que el Sec-Fetch-Site sea 'same-origin' / 'same-site' /
//     'none'. Los ataques CSRF cross-origin desde otro dominio no pueden
//     falsificar Origin ni Sec-Fetch-Site (los pone el navegador). Los
//     tokens API (x-admin-token, x-manychat-secret, x-retell-signature,
//     x-webhook-signature) están whitelistados: son integraciones
//     server-to-server que no traen Origin y ya autentican por su propio
//     mecanismo.
//
//  2) Bloqueo de mantenimiento con contraseña (ver lib/siteLock.ts y
//     /admin/configuracion/bloqueo-web): si está activo, cualquier petición
//     pública (todo excepto /admin, /api/admin, /api/site-lock y los
//     webhooks server-to-server) que no traiga la cookie de desbloqueo
//     válida se reescribe a /site-locked (páginas) o recibe 423 (APIs).
//
//  3) Cabeceras de aislamiento COOP/CORP en TODAS las respuestas:
//     Cross-Origin-Opener-Policy same-origin (defensa contra Spectre-class
//     y contra window.opener leaks) y Cross-Origin-Resource-Policy
//     same-origin en /api/* (evita hotlinking de nuestras APIs desde
//     otros orígenes).

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PROTECTED_PREFIXES = ["/api/admin/", "/api/client/", "/api/site-lock/"];

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

// Rutas que el candado de mantenimiento NUNCA bloquea: el panel de admin
// (para poder desactivarlo), las APIs de admin y del propio candado, y los
// webhooks server-to-server (no son "acceso público" en el sentido que le
// preocupa a este candado).
function bypassesSiteLock(path: string): boolean {
  if (path.startsWith("/admin")) return true;
  if (path.startsWith("/api/admin/")) return true;
  if (path.startsWith("/api/site-lock/")) return true;
  if (path === "/site-locked" || path.startsWith("/site-locked/")) return true;
  if (isWebhookRoute(path)) return true;
  return false;
}

async function checkSiteLock(request: NextRequest, path: string): Promise<NextResponse | null> {
  let config;
  try {
    config = await getSiteLockConfigCached();
  } catch {
    // Si el propio chequeo falla (p.ej. Redis caído), no tumbamos toda la web
    // pública por un fallo de infraestructura ajeno al candado: se deja pasar.
    return null;
  }
  if (!config.enabled) return null;

  const token = request.cookies.get(SITE_LOCK_COOKIE)?.value;
  let unlocked = false;
  try {
    unlocked = await isUnlockSessionValid(token, config);
  } catch {
    unlocked = false;
  }
  if (unlocked) return null;

  if (path.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "El sitio está temporalmente restringido." }, { status: 423 });
  }

  // Rewrite (no redirect): la URL que ve el visitante no cambia, solo el
  // contenido servido — así al desbloquear puede volver exactamente a donde iba.
  const url = request.nextUrl.clone();
  const next = `${path}${request.nextUrl.search}`;
  url.pathname = "/site-locked";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.rewrite(url);
}

export async function middleware(request: NextRequest) {
  // Verificación CSRF sólo para mutaciones sensibles.
  if (isProtectedMutation(request)) {
    if (!checkSameOrigin(request)) {
      return NextResponse.json(
        { ok: false, error: "Origen no válido para esta petición." },
        { status: 403 }
      );
    }
  }

  const path = request.nextUrl.pathname;

  if (!bypassesSiteLock(path)) {
    const lockResponse = await checkSiteLock(request, path);
    if (lockResponse) return lockResponse;
  }

  const res = NextResponse.next();
  // Aislamiento COOP para todas las páginas (defensa contra ataques que
  // dependen de window.opener y contra clase Spectre en navegadores modernos).
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  // CORP en API: nadie puede embebernos como recurso cross-origin (previene
  // hotlinking de nuestras rutas /api). Las páginas HTML se dejan cargables
  // (el sitio se comparte por links, previews, redes sociales).
  if (path.startsWith("/api/")) {
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
