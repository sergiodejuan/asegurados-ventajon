// Decodifica un data: URI (como los que guarda /admin/productos y
// /admin/diseno al subir un logo) a bytes + tipo MIME reales, para poder
// servirlo como una URL https normal — necesario para que los logos se vean
// en un correo (ver app/api/products/[id]/logo y app/api/theme/logo): Gmail y
// otros clientes de email bloquean las imágenes data: URI incrustadas en el
// propio HTML.
//
// Whitelist estricta de MIME de salida: solo se devuelven imágenes reales.
// Un data:text/html o data:image/svg+xml (que puede contener <script>) no
// se sirven — el navegador los interpretaría en el propio origen y abriría
// un vector de XSS same-origin (ver auditoría de seguridad, hallazgo X-02).

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export function dataUriToResponse(dataUri: string): { buffer: Buffer; contentType: string } | null {
  const match = /^data:([^;,]+)(?:;([^,]+))?,(.*)$/s.exec(dataUri);
  if (!match) return null;
  const [, rawContentType, encoding, payload] = match;
  const contentType = (rawContentType || "").toLowerCase().trim();
  // Solo se sirven imágenes; cualquier otro MIME (text/html, image/svg+xml,
  // application/*, etc.) se rechaza aquí — misma política que la
  // subida en /admin, defensa en profundidad para datos legacy en KV.
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) return null;
  try {
    const buffer = encoding === "base64" ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf-8");
    return { buffer, contentType };
  } catch {
    return null;
  }
}

// Compartido: valida que una cadena tiene forma de data URI de imagen (PNG,
// JPEG, WebP, GIF). Se usa desde los endpoints admin (POST/PATCH) para
// rechazar el guardado antes de que llegue al store.
const IMAGE_DATA_URI = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;
export function isValidImageDataUri(v: string | null | undefined): boolean {
  if (!v) return true; // vacío = quitar la imagen, válido
  if (v.length > 2_000_000) return false; // límite duro (~1.5 MB base64)
  return IMAGE_DATA_URI.test(v);
}
