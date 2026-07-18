// Decodifica un data: URI (como los que guarda /admin/productos y
// /admin/diseno al subir un logo) a bytes + tipo MIME reales, para poder
// servirlo como una URL https normal — necesario para que los logos se vean
// en un correo (ver app/api/products/[id]/logo y app/api/theme/logo): Gmail y
// otros clientes de email bloquean las imágenes data: URI incrustadas en el
// propio HTML.
export function dataUriToResponse(dataUri: string): { buffer: Buffer; contentType: string } | null {
  const match = /^data:([^;,]+)(?:;([^,]+))?,(.*)$/s.exec(dataUri);
  if (!match) return null;
  const [, contentType, encoding, payload] = match;
  try {
    const buffer = encoding === "base64" ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf-8");
    return { buffer, contentType: contentType || "application/octet-stream" };
  } catch {
    return null;
  }
}
