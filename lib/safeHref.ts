// Normaliza y valida una URL editable desde admin antes de renderizarla como
// href. Bloquea protocolos que abren XSS al hacer clic: javascript:, data:,
// vbscript:, file:. Cualquier admin comprometido (phishing/session hijack) o
// cualquier fallo humano al pegar una URL peligrosa se contiene aquí, en la
// última milla antes de renderizar.
//
// Se acepta explícitamente:
//   - Rutas relativas al sitio (/foo, /foo/bar) — mayoría de casos.
//   - Anchors dentro de la página (#seccion) — para menús internos.
//   - URLs http/https absolutas — enlaces salientes normales.
//   - mailto:, tel:, whatsapp: — canales de contacto habituales.
//
// Cualquier otra cadena cae al fallback (por defecto "/") sin lanzar error:
// una URL rota no debe romper la página, solo neutralizarse.

const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;
const SAFE_SCHEMES = new Set(["http", "https", "mailto", "tel", "whatsapp", "sms"]);

export function safeHref(raw: string | undefined | null, fallback = "/"): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // Rutas relativas al mismo sitio ("/foo") — pero NO "//foo" (scheme-relative,
  // permite salto a otro origen si el navegador está en https). Solo aceptamos
  // rutas absolutas del sitio con un solo slash de apertura.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  // Anchors internos del documento.
  if (trimmed.startsWith("#")) return trimmed;

  // URLs con esquema: solo permitimos el whitelist. Todo lo demás (incluidos
  // javascript:, data:, vbscript:, file:, chrome:, about:...) cae al fallback.
  const match = trimmed.match(SCHEME_RE);
  if (match && SAFE_SCHEMES.has(match[1].toLowerCase())) return trimmed;

  return fallback;
}

// Utilidad para validaciones en editores admin (PATCH endpoints): devuelve
// true solo si el href es aceptable según safeHref. Útil para responder 400
// al guardar en vez de silenciarlo en el render.
export function isSafeHref(raw: string | undefined | null): boolean {
  if (!raw) return true; // vacío es válido (se pintará fallback en render)
  return safeHref(raw, "") !== "";
}
