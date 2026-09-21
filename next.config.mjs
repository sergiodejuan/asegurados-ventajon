// Cabeceras de seguridad HTTP, aplicadas a todo el sitio. La CSP es
// deliberadamente permisiva en script-src/style-src ('unsafe-inline'):
// Google Tag Manager se carga con un snippet inline (components/
// GoogleTagManager.tsx) y layout.tsx fija variables de tema con estilos
// inline — una CSP estricta con nonces exigiría middleware para generarlos
// por petición, que no existe hoy. Aun así, esta política ya bloquea lo más
// importante: que un script cargue desde un dominio arbitrario no
// autorizado, y que el sitio se enmarque (iframe) desde otro origen.
//
// connect.facebook.net + www.facebook.com: píxel de Meta (components/
// MetaPixel.tsx) — el script se sirve desde el primero, el beacon de
// noscript y las llamadas de fbq() van al segundo.
// AvantProductForm de Codeoscopic: se carga como iframe desde
// product-form.avant.codeoscopic.io y su script vive ahí. También hace
// llamadas de red al mismo host (aunque nosotros ya proxyamos todo a
// través de /api/product-form, el widget puede pedir assets estáticos).
// Solo abrimos codeoscopic.io — nada de terceros amplios.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com https://connect.facebook.net https://product-form.avant.codeoscopic.io",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://challenges.cloudflare.com https://connect.facebook.net https://www.facebook.com https://*.codeoscopic.io",
  "frame-src https://www.googletagmanager.com https://challenges.cloudflare.com https://product-form.avant.codeoscopic.io https://*.codeoscopic.io",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
