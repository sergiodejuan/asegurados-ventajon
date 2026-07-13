# Landing seguro de salud + CRM — Asegurados Ventajon

Landing mobile-first de captación con la estructura de la referencia (hero, ventajas,
coberturas Sin/Con copago, otros productos), tarificador guiado de 7 pasos, página de
solicitud de llamada optimizada para conversión, y un **backend tipo CRM** con fichas,
actividad, estados, próximos pasos, fuente y antiduplicado.

Stack: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zod · Vercel KV.

## Rutas

| Ruta | Qué es |
|------|--------|
| `/` | Landing de marketing (hero, ventajas, coberturas, otros productos). |
| `/tarificador` | Tarificador guiado de 7 pasos → `POST /api/lead`. |
| `/quiero-que-me-llamen` | Página CRO a pantalla completa, **sin menús ni salidas** → `POST /api/call-request`. |
| `/gracias` | Confirmación del tarificador. |
| `/legal` | Textos legales (placeholder, pendiente de validación). |
| `/admin` | Panel CRM (protegido por `ADMIN_TOKEN`). |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena las variables
npm run dev                  # http://localhost:3000
```

`npm run dev` · `npm run build` · `npm run start` · `npm run typecheck`.

## Despliegue en Vercel

1. Sube el repo a GitHub → Vercel **Add New → Project → Import** (framework Next.js, sin config).
2. **Storage → Marketplace → Redis (Upstash)** y conéctalo al proyecto: inyecta las variables de Redis (`KV_REST_API_URL`/`KV_REST_API_TOKEN` o `UPSTASH_REDIS_REST_*`; el store lee ambas).
3. En **Environment Variables** añade `ADMIN_TOKEN` (y opcionalmente `LEAD_WEBHOOK_URL`, WhatsApp, horario).
4. **Deploy**.

> Sin KV la app arranca en **modo memoria** (no persistente, solo dev). Conecta KV para
> almacenamiento durable de leads.

## Backend tipo CRM

Los dos formularios escriben en el mismo almacén (`lib/store.ts`):

- **Ficha por lead** (`lead:{id}`): datos de contacto, código postal, datos del tarificador,
  consentimientos, atribución (UTMs + referrer), **estado** (nuevo · contactado · presupuestado ·
  ganado · perdido), **próximo paso** y **timeline de actividad**.
- **Organización por fuente**: índice por formulario (`leads:source:{source}`), con las fuentes
  `tarificador-salud` y `quiero-que-me-llamen`. El panel filtra por fuente.
- **Antiduplicado**: al llegar un formulario se busca por teléfono (y luego email). Si el lead ya
  existe, **no se crea otro**: se completan los datos que faltaban y se añade una entrada de
  actividad ("Nueva solicitud desde …"). Índices `idx:phone:{tel}` e `idx:email:{email}`.

### Endpoints

- `POST /api/lead` · `POST /api/call-request` — captación (públicos, con honeypot).
- `GET /api/admin/leads[?source=]` — listado (cabecera `x-admin-token`).
- `GET /api/admin/leads/{id}` · `PATCH /api/admin/leads/{id}` — ficha y gestión (estado / próximo paso / nota).

El panel `/admin` pide el token (o acéptalo por `?token=`), lista por fuente y abre cada ficha
con actividad, estado editable, próximo paso y notas.

## Llamada automática con Retell AI

Si se configuran `RETELL_API_KEY`, `RETELL_AGENT_ID` y `RETELL_FROM_NUMBER`, al completar el
tarificador (`/api/lead`, `/api/vida`) se dispara automáticamente una llamada saliente del agente
de voz configurado en Retell, con el nombre, producto y código postal del lead como variables
dinámicas (`{{nombre}}`, `{{producto}}`, `{{codigo_postal}}`, `{{company}}`). Sin esas variables,
el tarificador funciona igual y la llamada automática queda desactivada sin más.

Para que el resultado de la llamada quede registrado en la ficha del lead (panel "Contactos con
el cliente"), configura en Retell → tu agente → *Webhook Settings* → *Agent Level Webhook URL*:

```
https://tu-dominio.vercel.app/api/retell/webhook
```

Con `RETELL_API_KEY` configurada, el webhook verifica la firma (`x-retell-signature`) antes de
procesar cualquier evento.

## Llamada automática con Bland.ai

Alternativa a Retell (⚠️ no actives las dos a la vez, o el lead recibe dos llamadas). Si se
configuran `BLAND_API_KEY` y `BLAND_PATHWAY_ID`, se dispara una llamada saliente del pathway
configurado en Bland tanto al completar el tarificador (`/api/lead`, `/api/vida`) como al
solicitar una llamada (`/api/call-request`, incluidas las reprogramaciones desde el área de
cliente), con nombre, producto, código postal y (si aplica) compañía como `request_data`
(`{{nombre}}`, `{{producto}}`, `{{codigo_postal}}`, `{{compania}}`, `{{company}}`).

Para el resultado de la llamada, configura en Bland el webhook de post-call hacia:

```
https://tu-dominio.vercel.app/api/bland/webhook
```

Si además configuras `BLAND_WEBHOOK_SECRET` (secreto de firma, distinto de la API key — se genera
en Dev Portal → Account Settings → Keys), el webhook verifica la cabecera `X-Webhook-Signature`
antes de procesar el evento.

## Personalización

- **Nombre de marca / WhatsApp / horario / compañías / contenido**: `lib/brand.ts`.
- **Colores y tipografía**: `tailwind.config.ts` (navy `#1B2B6B` + rojo `#C8312A`).

## Pendiente antes de publicar (cumplimiento)

1. **Textos legales** (`/legal`, footer): identificación registral de la correduría (DGSFP, RC),
   privacidad RGPD, condiciones, aviso legal. **Validar con Gabriel/legal.**
2. **Sin precios cerrados**: por decisión de marca, no se muestran precios ni % de ahorro (a
   diferencia de la referencia). No reintroducir cifras sin precio validado por dirección.
3. **Doble consentimiento** (privacidad + autorización de contacto) ya integrado — clave para la
   normativa de octubre 2026. Revisar redacción con legal.
4. **Nombre de marca**: por defecto sin tilde (`lib/brand.ts`). Confirmar con Gabriel.
5. **Logos de compañías**: solo texto; los logos requieren autorización.
6. **Imagen del hero**: es un placeholder; sustituir por foto de marca aprobada.
