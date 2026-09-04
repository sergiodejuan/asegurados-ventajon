# Bloqueo global de la web con contraseña

Cuando el modo cerrado está activado, cualquier visitante ve la pantalla
`/acceso` (redirect 307 desde el middleware Edge) y no puede llegar a
ninguna página o API pública hasta que introduzca la contraseña.

## Cómo se activa

1. Entra a `/admin/seguridad/acceso` (permiso `configuracion`).
2. Introduce una contraseña dura (14+ caracteres, mayúscula, minúscula,
   dígito y símbolo) y guarda. Sin contraseña no se puede activar.
3. Marca "Bloqueo activo" y guarda.

El cambio se propaga en menos de 30 segundos (TTL de la caché de la
config en cada edge worker). Cambia la contraseña con el mismo formulario:
al pulsar Guardar se invalida la caché del worker que atendió la
petición; los demás esperan al TTL.

## Rutas exentas del bloqueo

- `/acceso` y `/api/acceso/*` (pantalla y endpoints del gate)
- `/admin` y `/api/admin/*` (autenticación admin propia con 2FA)
- Webhooks server-to-server: `/api/retell/*`, `/api/bland/*`,
  `/api/manychat/*`, `/api/tremendous/*`
- `/api/referral/process-payouts` (Vercel Cron) y `/api/referral/opt-in`
  (link de email al amigo)
- Estáticos: `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/sw.js`
- Cualquier ruta bajo `/_next/*` (excluida por matcher).

## Cookie de acceso

- Nombre: `site_access`
- Firma: HMAC-SHA256 con `SITE_ACCESS_SECRET` (env var). Payload
  `{v:1, iat, exp}`. TTL 30 días.
- Atributos: `HttpOnly`, `SameSite=Lax`, `Secure` en producción.
- El middleware Edge sólo valida la firma y el `exp` — no vuelve a KV.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `SITE_ACCESS_SECRET` | Cadena aleatoria de 32+ caracteres. Firma las cookies. **Obligatorio en producción** — si falta o es corto, el endpoint de login lanza error y la web NO se puede desbloquear. |

Añádela en Vercel → Project Settings → Environment Variables antes de
activar el bloqueo por primera vez. Rotarla invalida todas las cookies
emitidas (todos los usuarios reautentican).

## Modo degradado

- Si Upstash Redis está caído y la caché ha expirado, el middleware trata
  la config como "no bloquear" (fail-open). Esto se hace a propósito para
  que un incidente en KV no tumbe la web pública.
- El endpoint `/api/acceso/login` sí es fail-closed: si no puede leer la
  config, responde 401 (contraseña incorrecta).

## Anti-fuerza-bruta

- `/api/acceso/login` limita a **8 intentos por IP cada 15 minutos**.
- La contraseña se guarda en KV con `scrypt` (formato `salt:hash`).

## Integración con otras funciones

- **SEO**: cuando el bloqueo está activo la web queda desindexable de
  facto (los crawlers reciben la pantalla `/acceso` con `noindex`).
- **Referidos**: los links `/r/{code}` sí pasan por el gate, así el amigo
  también necesita la contraseña. Si se prefiere que estos links sigan
  accesibles, añadirlos al array `SITE_ACCESS_EXEMPT_PREFIXES` en
  `middleware.ts`.
- **Programa de rescate por email**: los links de opt-in de referidos y
  el cron de Tremendous ya están exentos para que el flujo siga vivo.
