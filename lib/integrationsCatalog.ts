// Catálogo de datos para /admin/integraciones. Deliberadamente sin acceso a
// process.env (eso vive en las rutas server-side de
// app/api/admin/integraciones/*) para poder importarse tanto desde las
// páginas cliente (documentación) como desde el servidor (para construir las
// respuestas de estado/test) sin arrastrar nada sensible al bundle.

/* ------------------------------ Tremendous --------------------------------- */
// Motor de pago del programa "Amigos Ventajon" (ver docs/referrals.md y
// lib/tremendous.ts) — envía los vales Amazon eGift de 20€ tanto al amigo
// referido como al cliente que lo trajo. Variables obligatorias vs.
// opcionales según docs/referrals.md.

export const TREMENDOUS_ENV_VARS: { nombre: string; descripcion: string; obligatoria: boolean }[] = [
  { nombre: "TREMENDOUS_API_KEY", descripcion: "Bearer token de la cuenta Tremendous (https://app.tremendous.com/rewards/api).", obligatoria: true },
  { nombre: "TREMENDOUS_FUNDING_SOURCE_ID", descripcion: "ID de la fuente de fondos (Balance, ACH, tarjeta) — GET /funding_sources o el panel.", obligatoria: true },
  { nombre: "REFERRAL_TOKEN_SECRET", descripcion: "Cadena aleatoria larga (32+ bytes base64) que firma los tokens HMAC de opt-in del programa. Aislada de otros secretos.", obligatoria: true },
  { nombre: "CRON_SECRET", descripcion: "Bearer que protege /api/referral/process-payouts (el cron diario de pagos T+N días). Vercel lo pasa automáticamente si está definido.", obligatoria: true },
  { nombre: "TREMENDOUS_CAMPAIGN_ID", descripcion: "ID de una campaña Tremendous que restrinja los productos entregables — crear una \"Amazon.es EUR\" para que el destinatario no pueda cambiar a otro vale.", obligatoria: false },
  { nombre: "TREMENDOUS_BASE_URL", descripcion: "Por defecto producción (https://api.tremendous.com/api/v2). En dev/QA usar sandbox: https://testflight.tremendous.com/api/v2 (dinero ficticio).", obligatoria: false },
];

/* ------------------------------ Codescopic -------------------------------- */
// La integración YA está construida y cableada de punta a punta: el cliente
// HTTP vive en lib/codeoscopic.ts (OAuth2 client_credentials, caché de token),
// el mapper del lead → payload en lib/codeoscopicMap.ts, y la resolución de
// CP → town.id en lib/codeoscopicTowns.ts. La comparativa de salud consulta
// precios reales en vivo (POST /api/quote/create → polling GET
// /api/quote/[insuranceId]) y el tarificador conversacional de WhatsApp hace
// lo mismo (POST /api/manychat/salud-quote). Lo ÚNICO pendiente para
// producción son las credenciales reales de Codeoscopic (las CODESCOPIC_* de
// abajo): mientras no estén, todo el flujo degrada en silencio al catálogo
// mock de /admin/productos, sin mostrar error al usuario (fail-open).

export type CodescopicFieldMap = {
  campoCodescopic: string;
  origenEnLaWeb: string;
  estado: "listo" | "pendiente";
  nota?: string;
};

// Mapeo entre el payload de referencia que pasó Sergio (ramo Salud) y los
// datos que el tarificador de salud ya recoge hoy.
export const CODESCOPIC_FIELD_MAP: CodescopicFieldMap[] = [
  { campoCodescopic: "insuranceLine.id", origenEnLaWeb: "fijo: \"Health\"", estado: "listo" },
  { campoCodescopic: "effectiveDate", origenEnLaWeb: "campo \"inicio\" del tarificador (o fechaInicioPersonalizada)", estado: "listo" },
  { campoCodescopic: "holder.identificationDocument.type.id", origenEnLaWeb: "documentoTipo (\"Dni\" | \"Nie\")", estado: "listo" },
  { campoCodescopic: "holder.identificationDocument.id", origenEnLaWeb: "documento (DNI/NIE, formato validado)", estado: "listo" },
  { campoCodescopic: "holder.name", origenEnLaWeb: "nombre", estado: "listo" },
  { campoCodescopic: "holder.surname", origenEnLaWeb: "apellido1", estado: "listo" },
  { campoCodescopic: "holder.surname2", origenEnLaWeb: "apellido2 (opcional)", estado: "listo" },
  { campoCodescopic: "holder.birthDate", origenEnLaWeb: "fechaNacimiento (dd/mm/aaaa; convertir a formato Codescopic al integrar)", estado: "listo" },
  { campoCodescopic: "holder.gender.id", origenEnLaWeb: "sexo (\"hombre\" o \"mujer\"; mapear al id de Codescopic)", estado: "listo" },
  { campoCodescopic: "holder.smoker", origenEnLaWeb: "fumador (boolean)", estado: "listo" },
  { campoCodescopic: "holder.phones[].number", origenEnLaWeb: "telefono", estado: "listo" },
  { campoCodescopic: "holder.addresses[].postalCode", origenEnLaWeb: "codigoPostalReal (5 dígitos)", estado: "listo" },
  { campoCodescopic: "holder.addresses[].town.id", origenEnLaWeb: "codigoPostalReal (resuelto a id de municipio server-side)", estado: "listo", nota: "Resolver interno en lib/codeoscopicTowns.ts — llama a GET /towns?postalCode=… con caché in-memory. Si Codeoscopic devuelve varios municipios para el CP, se toma el primero (rural: se confirma después con el agente)." },
  { campoCodescopic: "risk.insureds[].birthDate", origenEnLaWeb: "aseguradosAdicionales[].fechaNacimiento", estado: "listo" },
  { campoCodescopic: "risk.insureds[].gender.id", origenEnLaWeb: "aseguradosAdicionales[].sexo", estado: "listo" },
  { campoCodescopic: "risk.insureds[].identificationDocument / smoker / addresses", origenEnLaWeb: "—", estado: "pendiente", nota: "A propósito no se piden en el tarificador (solo fecha de nacimiento y sexo, para no añadir fricción): se completarían en un segundo contacto, ya con el agente." },
  { campoCodescopic: "autenticación (OAuth2 client_credentials)", origenEnLaWeb: "cabeceras Bearer + Accept vnd.codeoscopic.v1 + X-Client-App", estado: "listo", nota: "Cliente en lib/codeoscopic.ts, caché de token en memoria por proceso." },
];

// Variables de entorno previstas para cuando llegue esa documentación de
// acceso — nombres razonables siguiendo el mismo patrón que Retell/Bland/
// ManyChat (ver lib/retell.ts, lib/bland.ts, lib/manychat.ts), a ajustar si
// Codescopic exige otro esquema de autenticación.
export const CODESCOPIC_ENV_VARS: { nombre: string; descripcion: string }[] = [
  { nombre: "CODESCOPIC_BASE_URL", descripcion: "URL base de la API de Codeoscopic Integra (o de sandbox si Codeoscopic te dio una distinta). No incluye la /oauth: es solo el prefijo de /insurances, /towns, etc." },
  { nombre: "CODESCOPIC_OAUTH_URL", descripcion: "URL completa del endpoint OAuth2 (grant_type=client_credentials). No está en la doc pública: se obtiene entrando en portal.api.codeoscopic.io con el botón GET TOKEN e inspeccionando la petición, o pidiéndola a soporteapi@codeoscopic.com." },
  { nombre: "CODESCOPIC_CLIENT_ID", descripcion: "client_id emitido por Codeoscopic para la correduría." },
  { nombre: "CODESCOPIC_CLIENT_SECRET", descripcion: "client_secret OAuth2. Sensible: solo en variables de entorno, nunca en el bundle del navegador ni en el tema editable." },
  { nombre: "CODESCOPIC_APP_HEADER", descripcion: "Valor de la cabecera X-Client-App que Codeoscopic asigna a cada aplicación — identifica esta web ante las aseguradoras." },
  { nombre: "CODESCOPIC_USER_EMAIL", descripcion: "(Opcional) X-User-Email para operar en nombre de un usuario/organización concreta de la jerarquía Avant2. Sin él, se opera como el propietario del client_id." },
];

export const CODESCOPIC_PAYLOAD_SAMPLE = `{
  "insuranceLine": { "id": "..." },
  "effectiveDate": "2026-09-01",
  "holder": {
    "identificationDocument": { "type": { "id": "Dni" }, "id": "12345678Z" },
    "name": "María",
    "surname": "Pérez",
    "surname2": "García",
    "birthDate": "1990-03-20",
    "gender": { "id": "F" },
    "smoker": false,
    "phones": [{ "number": "611223344", "primary": true }],
    "addresses": [{ "postalCode": "35001", "town": { "id": "..." }, "primary": true }]
  },
  "risk": {
    "insureds": [
      { "birthDate": "2015-06-10", "gender": { "id": "F" } },
      { "birthDate": "2018-11-22", "gender": { "id": "M" } }
    ]
  }
}`;

/* -------------------------------- API propia ------------------------------- */

export type ApiEndpointDoc = {
  // Texto libre ("GET", "GET/POST", "GET/PATCH/DELETE"…): son fichas de
  // documentación, no tipos usados para despachar peticiones reales.
  method: string;
  path: string;
  resumen: string;
  auth: string;
  request: string;
  response: string;
};

export type ApiCategory = { categoria: string; descripcion: string; endpoints: ApiEndpointDoc[] };

export const API_CATEGORIES: ApiCategory[] = [
  {
    categoria: "Tarificadores y captación de leads",
    descripcion: "Reciben cada envío de formulario público y dan de alta o actualizan el lead en el CRM.",
    endpoints: [
      { method: "POST", path: "/api/lead", resumen: "Tarificador de salud.", auth: "Turnstile + rate limit (20/h por IP, 3/día por teléfono)", request: "leadSchema — inicio, zona, nº asegurados, titular (fecha nac., sexo, documento, CP real, fumador), asegurados adicionales, dental, seguro actual, contacto, consentimientos, UTM.", response: "{ ok, id, deduped }" },
      { method: "POST", path: "/api/vida", resumen: "Tarificador de vida.", auth: "Turnstile + rate limit", request: "vidaSchema — motivo, zona, fecha nac., sexo, fumador, seguro actual, contacto, consentimientos, UTM.", response: "{ ok, id, deduped }" },
      { method: "POST", path: "/api/auto", resumen: "Tarificador de auto.", auth: "Turnstile + rate limit", request: "autoSchema — vehículo, matrícula, uso, zona, conductor, carnet, cobertura deseada, seguro actual, contacto, consentimientos, UTM.", response: "{ ok, id, deduped }" },
      { method: "POST", path: "/api/decesos", resumen: "Tarificador de decesos.", auth: "Turnstile + rate limit", request: "decesosSchema — para quién, nº asegurados, zona, fecha nac., sexo, seguro actual, contacto, consentimientos, UTM.", response: "{ ok, id, deduped }" },
      { method: "POST", path: "/api/call-request", resumen: "\"Quiero que me llamen\" (widget asistente y CTAs sueltos).", auth: "Turnstile + rate limit (por IP y por teléfono)", request: "callRequestSchema — teléfono, CP, producto, compañía/precio elegidos, preferencia de horario, consentimientos.", response: "{ ok, id, deduped }" },
      { method: "POST", path: "/api/exit-intent", resumen: "Callback exprés al detectar abandono de un tarificador a medias.", auth: "Turnstile + rate limit", request: "exitIntentSchema — solo teléfono (+ nombre/zona/producto si ya se conocían).", response: "{ ok, id, deduped }" },
      { method: "POST", path: "/api/calculadora-ahorro", resumen: "Calculadora de ahorro embebida en landings SEO.", auth: "Turnstile + rate limit", request: "savingsCalculatorSchema — pago actual, nº asegurados, slug de landing, teléfono.", response: "{ ok, id, deduped, precioEstimado, ahorro }" },
      { method: "POST", path: "/api/lead-magnet", resumen: "Descarga de guía/checklist a cambio del email.", auth: "Rate limit (10/h por IP, sin Turnstile)", request: "leadMagnetSchema — nombre, email, guía (salud/auto), consentimientos.", response: "{ ok, downloadUrl }" },
      { method: "POST", path: "/api/lead/price-match", resumen: "\"Precio mejor garantizado\": el usuario envía su presupuesto actual (compañía, precio, captura) para que un asesor lo mejore.", auth: "Turnstile + rate limit", request: "priceMatchSchema — producto, compañía actual, precio/periodicidad, captura (data URI), comentario, contacto, consentimientos.", response: "{ ok, id, deduped }" },
    ],
  },
  {
    categoria: "Comparativa y cotización (Codeoscopic)",
    descripcion: "Alimentan la comparativa de salud con precios reales de las aseguradoras en vivo, vía el cliente de Codeoscopic (lib/codeoscopic.ts). Con acceso estricto al lead (BOLA): admin, cookie de cliente dueño del lead, o token HMAC firmado (llegada desde WhatsApp).",
    endpoints: [
      { method: "POST", path: "/api/quote/create", resumen: "Crea el proyecto de cotización en Codeoscopic (POST /insurances) al montar la comparativa y guarda su insuranceId en el lead.", auth: "Dueño del lead (sesión de cliente / admin / token)", request: "{ leadId, recalcular? }", response: "{ ok, insuranceId } | { ok:false, reason }" },
      { method: "GET", path: "/api/quote/[insuranceId]", resumen: "Polling del estado de las cotizaciones (la comparativa lo llama cada 4s hasta 90s) hasta que dejan de ser estimadas.", auth: "Dueño del lead (cookie o ?token= / ?quoteAccessToken=)", request: "—", response: "{ ok, quotes[], done }" },
      { method: "GET", path: "/api/quote/[insuranceId]/coverages", resumen: "Coberturas normalizadas por categoría de la oferta elegida (modal \"Ver coberturas\").", auth: "Dueño del lead", request: "?offerId=", response: "{ ok, coberturas }" },
      { method: "POST", path: "/api/quote/interes", resumen: "El usuario muestra interés en una opción → se crea el PRESUPUESTO con la compañía/precio elegidos y snapshot de Codeoscopic.", auth: "Dueño del lead", request: "{ leadId, compania, precio, insuranceId?, quoteId? }", response: "{ ok, presupuestoId }" },
      { method: "POST", path: "/api/product-form", resumen: "Proxy autenticado del widget AvantProductForm de Codeoscopic (el client_secret nunca llega al navegador).", auth: "Server-side (credenciales Codeoscopic)", request: "Datos del widget.", response: "Respuesta de Codeoscopic" },
      { method: "POST", path: "/api/presupuesto/pdf", resumen: "Genera el PDF de un presupuesto/comparativa para descargar desde /comparativa/[compania].", auth: "Pública (datos del propio presupuesto)", request: "{ ... }", response: "application/pdf" },
    ],
  },
  {
    categoria: "WhatsApp / ManyChat (server-to-server)",
    descripcion: "Endpoints que consume ManyChat como paso \"External Request\" de sus flows de WhatsApp. Autenticación por cabecera estática x-manychat-secret (MANYCHAT_WEBHOOK_SECRET) — ManyChat no soporta firma HMAC. Exentos del bloqueo global de la web.",
    endpoints: [
      { method: "POST", path: "/api/manychat/prefill-salud", resumen: "Primer paso del funnel: con el teléfono del contacto de WhatsApp, busca si ya tarificó en la web y devuelve su perfil para prerrellenar los campos y saltarse preguntas.", auth: "x-manychat-secret", request: "{ telefono }", response: "{ existe, nombre, apellido1/2, email, documento, fechaNacimiento, ... } (vacío si no existe)" },
      { method: "POST", path: "/api/manychat/salud-quote", resumen: "Tarificador de salud en tiempo real por WhatsApp: da de alta el lead, cotiza en Codeoscopic, espera a que respondan varias compañías (mín. ~5s, dentro del presupuesto de ~10s de ManyChat) y devuelve la más barata firme —con y sin copago— + enlace firmado a /comparativa.", auth: "x-manychat-secret + rate limit (20/h por IP)", request: "{ telefono, nombre, apellido1/2, fechaNacimiento, sexo, documento(+tipo), codigoPostal, numAsegurados, coberturaDental, fumador, aceptaPrivacidad }", response: "Plano: { estado, mensaje, precio, precioTexto, compania, leadId, insuranceId, quoteId, urlComparativa }" },
      { method: "POST", path: "/api/manychat/salud-negociadas", resumen: "Mensaje de las opciones NEGOCIADAS por Asegurados Ventajon (Mapfre/Adeslas, sin copagos), personalizado por edad, dental y nº de asegurados. Se envía tras la tarifa de Codeoscopic como gancho.", auth: "x-manychat-secret", request: "{ leadId } | { fechaNacimiento, coberturaDental, numAsegurados }", response: "{ estado, mensaje, negociadasTexto, mejorCompania }" },
      { method: "POST", path: "/api/manychat/salud-coverages", resumen: "Coberturas de la oferta ganadora formateadas como texto WhatsApp (sin markdown, truncado a 3800 car.).", auth: "x-manychat-secret + rate limit (30/h por IP)", request: "{ insuranceId, quoteId }", response: "{ estado, mensaje, totalCubiertas, totalNoCubiertas }" },
      { method: "POST", path: "/api/manychat/cliente", resumen: "Dado un teléfono, dice si ya es cliente y devuelve sus presupuestos/llamadas (aplanados para ManyChat).", auth: "x-manychat-secret", request: "{ telefono }", response: "{ esCliente, presupuestos[], llamadas[], resumenTexto }" },
      { method: "PATCH", path: "/api/manychat/llamadas/[id]", resumen: "Cancelar o reprogramar una llamada desde WhatsApp (propiedad verificada por teléfono; idempotente).", auth: "x-manychat-secret (propiedad por teléfono)", request: "{ accion: cancelar|reprogramar, fechaProgramada?, turnoLlamada? }", response: "{ ok }" },
    ],
  },
  {
    categoria: "Agenda y valoración",
    descripcion: "Endpoints públicos de apoyo, sin capturar un lead nuevo.",
    endpoints: [
      { method: "GET", path: "/api/agenda/disponibilidad", resumen: "Próximos huecos laborables para agendar una llamada.", auth: "Pública", request: "—", response: "{ ok, slots }" },
      { method: "GET", path: "/api/valoracion/[id]", resumen: "Carga la encuesta NPS de una llamada o presupuesto cerrado.", auth: "Rate limit (60/h)", request: "—", response: "{ ok, refType, producto, nombre, already, response }" },
      { method: "POST", path: "/api/valoracion/[id]", resumen: "Envía la puntuación NPS (0-10) y comentario.", auth: "Rate limit (60/h)", request: "{ score, comentario }", response: "{ ok, quiereResena }" },
    ],
  },
  {
    categoria: "Área de cliente (sin registro)",
    descripcion: "El propio cliente consulta/actualiza su ficha desde /area-cliente, identificado por cookie de sesión (no usuario/contraseña).",
    endpoints: [
      { method: "GET/POST", path: "/api/client/session", resumen: "Estado de la sesión del cliente.", auth: "Cookie de sesión de cliente", request: "—", response: "{ ok, lead? }" },
      { method: "POST", path: "/api/client/verify", resumen: "Canjea el enlace de verificación (email/WhatsApp) por una sesión.", auth: "Token de un solo uso en la URL", request: "{ token }", response: "{ ok }" },
      { method: "POST", path: "/api/client/update-contact", resumen: "El cliente actualiza su teléfono/email/preferencias.", auth: "Cookie de sesión de cliente", request: "Datos de contacto parciales.", response: "{ ok }" },
      { method: "GET", path: "/api/client/presupuestos", resumen: "Presupuestos del cliente autenticado.", auth: "Cookie de sesión de cliente", request: "—", response: "{ ok, presupuestos }" },
      { method: "GET/POST", path: "/api/client/llamadas/[id]", resumen: "Detalle y reprogramación de una llamada propia.", auth: "Cookie de sesión de cliente", request: "Nueva fecha/hora al reprogramar.", response: "{ ok }" },
      { method: "GET", path: "/api/client/notifications", resumen: "Centro de notificaciones del área de cliente.", auth: "Cookie de sesión de cliente", request: "—", response: "{ ok, notifications }" },
      { method: "POST", path: "/api/client/push-subscribe", resumen: "Suscripción a notificaciones push del navegador.", auth: "Cookie de sesión de cliente", request: "PushSubscription", response: "{ ok }" },
      { method: "POST", path: "/api/client/logout", resumen: "Cierra la sesión de cliente.", auth: "Cookie de sesión de cliente", request: "—", response: "{ ok }" },
      { method: "GET", path: "/api/client/hydrate-quote", resumen: "Rehidrata la comparativa desde el enlace firmado de WhatsApp: verifica el token, carga el lead y devuelve su perfil (sin datos sensibles) para que el usuario no reintroduzca nada.", auth: "Token HMAC firmado (TTL 30 días)", request: "?token=<leadId>.<expires>.<sig>", response: "{ ok, quote }" },
    ],
  },
  {
    categoria: "Panel de administración (uso interno)",
    descripcion: "Bajo /api/admin/*, protegidos por ADMIN_TOKEN o sesión de agente + permiso de módulo (ver lib/agentAuth.ts). No pensados para integraciones externas — los usa exclusivamente este panel.",
    endpoints: [
      { method: "GET/PATCH/DELETE", path: "/api/admin/leads, /leads/[id], /leads/[id]/anonymize, /leads/[id]/export", resumen: "Listado, ficha, RGPD (anonimizar) y exportación de un lead.", auth: "Módulo \"leads\" (o \"rgpd\" para anonimizar)", request: "—", response: "—" },
      { method: "POST", path: "/api/admin/leads/[id]/codeoscopic-quote, /codeoscopic-rerate, /codeoscopic-report", resumen: "Desde la ficha: relanzar cotización, pasar de precio estimado a firme (re-rate) y generar el informe PDF de Codeoscopic.", auth: "Módulo \"leads\"", request: "—", response: "—" },
      { method: "POST", path: "/api/admin/leads/[id]/enviar-email", resumen: "El agente envía un email manual al lead desde su ficha.", auth: "Módulo \"leads\"", request: "{ asunto, cuerpo }", response: "{ ok }" },
      { method: "GET/POST/PATCH", path: "/api/admin/presupuestos, /presupuestos/[id], /presupuestos/export", resumen: "Gestión de presupuestos y exportación CSV.", auth: "Módulo \"presupuestos\"", request: "—", response: "—" },
      { method: "GET/POST/PATCH", path: "/api/admin/llamadas, /llamadas/[id]", resumen: "Gestión de \"quiero que me llamen\".", auth: "Módulo \"llamadas\"", request: "—", response: "—" },
      { method: "GET/POST/PATCH/DELETE", path: "/api/admin/tasks, /tasks/[id]", resumen: "Tareas y recordatorios del equipo.", auth: "Módulo \"tareas\"", request: "—", response: "—" },
      { method: "GET/POST/PATCH/DELETE", path: "/api/admin/posts, /posts/[id]", resumen: "Blog.", auth: "Módulo \"blog\"", request: "—", response: "—" },
      { method: "GET/POST/PATCH/DELETE", path: "/api/admin/testimonios, /testimonios/[id]", resumen: "Testimonios.", auth: "Módulo \"testimonios\"", request: "—", response: "—" },
      { method: "GET/POST/PATCH/DELETE", path: "/api/admin/promotions, /promotions/[id]", resumen: "Promociones.", auth: "Módulo \"promociones\"", request: "—", response: "—" },
      { method: "GET/PATCH", path: "/api/admin/campaign", resumen: "Campaña de la home (slides).", auth: "Módulo \"campana\"", request: "—", response: "—" },
      { method: "GET/PATCH", path: "/api/admin/exit-intents", resumen: "Campañas de exit-intent de la web general.", auth: "Módulo \"exitintents\"", request: "—", response: "—" },
      { method: "GET/POST/PATCH/DELETE", path: "/api/admin/products, /products/[id], /products/[id]/logo", resumen: "Catálogo de productos/precios y logos.", auth: "Módulo \"productos\"", request: "—", response: "—" },
      { method: "GET/PATCH", path: "/api/admin/theme, /theme/logo", resumen: "Diseño/tema del sitio (colores, logos, hero, loader…).", auth: "Módulo \"configuracion\"", request: "—", response: "—" },
      { method: "GET", path: "/api/admin/export", resumen: "Exportación CSV general de leads.", auth: "Módulo \"leads\"", request: "—", response: "CSV" },
      { method: "GET/POST/PATCH/DELETE", path: "/api/admin/agentes, /agentes/[id]", resumen: "Alta, edición y permisos de agentes.", auth: "Rol \"admin\" (no delegable por módulo)", request: "—", response: "—" },
      { method: "GET", path: "/api/admin/registro", resumen: "Registro de auditoría de acciones del equipo.", auth: "Rol \"admin\"", request: "—", response: "—" },
      { method: "POST", path: "/api/admin/auth/login, /auth/otp-verify, /auth/logout", resumen: "Login de agente en 2 pasos: contraseña (scrypt) → OTP de 6 dígitos por email → cookie de sesión. Logout cierra la sesión.", auth: "Rate limit por IP y por cuenta", request: "login: { email, password } → { nonce }; otp-verify: { nonce, code }", response: "{ ok }" },
      { method: "GET", path: "/api/admin/auth/me", resumen: "Identidad de quien está usando el panel ahora mismo.", auth: "ADMIN_TOKEN o cookie de agente", request: "—", response: "{ ok, identity }" },
      { method: "POST", path: "/api/admin/manychat/enviar", resumen: "Envía un WhatsApp de seguimiento directo por ManyChat.", auth: "Módulo \"presupuestos\"", request: "{ telefono, texto, ... }", response: "{ ok }" },
      { method: "GET/POST/PATCH", path: "/api/admin/aseguradoras, /api/admin/email-templates, /email-templates/[id]", resumen: "Catálogo unificado de aseguradoras por ramo (marcas visibles/ocultas en la comparativa) y plantillas de email transaccional.", auth: "Módulo \"productos\" / \"configuracion\"", request: "—", response: "—" },
      { method: "GET/POST/PATCH/DELETE", path: "/api/admin/landings, /landings/[id](/duplicate), /landings/slug-check, /landings/stats, /landings/precio-mejor, /landings/referidos", resumen: "Editor de landings de pago (/lp/[slug]) y de las landings de price-match y referidos, con duplicado, comprobación de slug y estadísticas.", auth: "Módulo \"campana\"", request: "—", response: "—" },
      { method: "GET/PATCH", path: "/api/admin/inactivity-modal", resumen: "Configuración del modal de inactividad (copy, páginas, captura de teléfono).", auth: "Módulo \"exitintents\"", request: "—", response: "—" },
      { method: "GET", path: "/api/admin/informes/codeoscopic, /informes/price-match, /informes/referidos", resumen: "Informes de negocio: uso y resultados de Codeoscopic, embudo de price-match y estado del programa de referidos.", auth: "Módulo \"informes\"", request: "—", response: "—" },
      { method: "GET", path: "/api/admin/informes/manychat", resumen: "Informe \"Leads ManyChat\": lee en vivo el DASHBOARD de la hoja de Google Sheets vía el Web App de Apps Script (server-side, secreto en env). ?refresh=1 salta la caché de 60s.", auth: "Módulo \"informes\"", request: "?refresh=1 (opcional)", response: "{ ok, configured, report }" },
      { method: "GET/POST", path: "/api/admin/integraciones/status, /integraciones/test, /integraciones/pdf, /integraciones/codescopic/catalog", resumen: "Estado real de cada integración (derivado de env), prueba de conexión (round-trip real), PDF de esta documentación y diagnóstico de catálogos de Codeoscopic.", auth: "Módulo \"desarrollador\"", request: "—", response: "—" },
      { method: "GET/PATCH", path: "/api/admin/site-access", resumen: "Activa/desactiva el bloqueo global de la web con contraseña y fija la contraseña.", auth: "Módulo \"configuracion\"", request: "{ activo, password? }", response: "{ ok }" },
      { method: "GET/POST", path: "/api/admin/referral/[code], /referral/[code]/retry", resumen: "Ficha de un referido y reintento manual del pago de su bono (Tremendous).", auth: "Módulo \"referidos\"", request: "—", response: "—" },
      { method: "GET/POST", path: "/api/admin/notifications, /notifications/push-subscribe", resumen: "Centro de notificaciones del equipo y suscripción a push del navegador admin (avisos de lead nuevo).", auth: "ADMIN_TOKEN o cookie de agente", request: "—", response: "—" },
    ],
  },
  {
    categoria: "Programa de referidos (\"Amigos Ventajon\")",
    descripcion: "Doble incentivo de 20€ en vale Amazon (al amigo tras el doble opt-in; al cliente que refiere cuando el amigo contrata y supera 30 días), pagado vía Tremendous. Ver docs/referrals.md.",
    endpoints: [
      { method: "POST", path: "/api/referral/generate", resumen: "Un cliente con póliza vigente genera su código/enlace de referido.", auth: "Rate limit (5/5min) + Turnstile (valida elegibilidad)", request: "{ email | telefono }", response: "{ ok, code, url }" },
      { method: "POST", path: "/api/referral/opt-in", resumen: "Doble opt-in del amigo referido: canjea el token y dispara el bono de bienvenida (vale Amazon).", auth: "Token HMAC de un solo uso (TTL 14 días)", request: "{ token }", response: "{ ok }" },
      { method: "GET", path: "/api/referral/process-payouts", resumen: "Cron diario (04:00 UTC): paga a los referidores cuyos amigos ya superaron el periodo de gracia. Idempotente (external_id determinista).", auth: "Authorization: Bearer CRON_SECRET", request: "—", response: "{ ok, pagados }" },
    ],
  },
  {
    categoria: "Otros",
    descripcion: "",
    endpoints: [
      { method: "GET", path: "/api/theme, /api/theme/logo", resumen: "Lectura pública del tema activo (usada por la propia web para pintarse).", auth: "Pública", request: "—", response: "SiteTheme" },
      { method: "GET", path: "/api/inactivity-modal", resumen: "Configuración pública del modal de inactividad activo.", auth: "Pública", request: "—", response: "{ ok, config }" },
      { method: "POST", path: "/api/landing/track", resumen: "Beacon de analítica propia de las landings de pago (dispositivo + franja horaria, clasificados en servidor).", auth: "Pública", request: "{ slug, evento }", response: "204" },
      { method: "POST", path: "/api/acceso/login, /api/acceso/logout", resumen: "Login/logout del bloqueo global de la web con contraseña (cuando está activo).", auth: "Contraseña + anti-fuerza-bruta (8/15min por IP)", request: "{ password }", response: "{ ok }" },
      { method: "GET", path: "/api/products", resumen: "Catálogo de productos activos (precio aproximado por producto).", auth: "Pública", request: "—", response: "{ ok, products }" },
      { method: "GET", path: "/api/campaign", resumen: "Slides activos de la campaña de la home.", auth: "Pública", request: "—", response: "{ ok, config }" },
      { method: "GET/POST", path: "/api/exit-intents", resumen: "Campañas de exit-intent activas para la web general.", auth: "Pública (lectura)", request: "—", response: "{ ok, config }" },
      { method: "GET", path: "/api/email/pixel, /api/email/click", resumen: "Píxel de apertura y redirección con registro de clic de los correos transaccionales.", auth: "Pública (enlaces firmados por id)", request: "—", response: "Imagen 1x1 / redirect 302" },
      { method: "POST", path: "/api/cron/retention", resumen: "Purga leads sin actividad tras 24 meses (RGPD §3.5). Lo dispara Vercel Cron, no un usuario.", auth: "Cabecera Authorization con CRON_SECRET", request: "—", response: "{ ok, purged }" },
    ],
  },
];

/* -------------------------------- Webhooks --------------------------------- */

export type WebhookDoc = {
  direccion: "saliente" | "entrante";
  nombre: string;
  endpoint: string;
  resumen: string;
  payload: string;
  seguridad: string;
};

export const WEBHOOKS: WebhookDoc[] = [
  {
    direccion: "saliente",
    nombre: "Notificación genérica de lead",
    endpoint: "URL configurada en LEAD_WEBHOOK_URL",
    resumen: "Cada vez que se da de alta o actualiza un lead desde /api/lead, /api/vida, /api/auto, /api/decesos o /api/call-request, la web hace un POST con los datos del envío a esta URL — pensado para conectar un CRM externo, Zapier/Make, una hoja de cálculo, etc.",
    payload: '{ "id": "<leadId>", "source": "tarificador-salud", ...resto de campos del formulario }',
    seguridad: "Ninguna firma propia: es un POST simple. Si el receptor necesita verificar el origen, debe hacerlo por otro medio (p.ej. un secreto en la propia URL).",
  },
  {
    direccion: "saliente",
    nombre: "Sincronización de lead a ManyChat (WhatsApp)",
    endpoint: "api.manychat.com (con MANYCHAT_API_TOKEN)",
    resumen: "Al crear un lead desde la web (si autoriza contacto), lib/manychat.ts lo da de alta como suscriptor de WhatsApp en ManyChat, rellena sus campos personalizados (nombre, producto, CP, precio aprox., id de presupuesto, utm_*), le pone la etiqueta web-<source> y dispara el Flow de agradecimiento/resumen.",
    payload: 'Subscriber + custom fields + tag + trigger de Flow (MANYCHAT_THANKYOU_FLOW_NS / _VERIFICATION_FLOW_NS)',
    seguridad: "Bearer MANYCHAT_API_TOKEN. Best-effort: si el número ya existía en ManyChat (típico de Meta Ads) o falla, no rompe el alta del lead.",
  },
  {
    direccion: "entrante",
    nombre: "ManyChat — tarificador y consultas por WhatsApp",
    endpoint: "/api/manychat/salud-quote · /salud-coverages · /cliente · /llamadas/[id]",
    resumen: "ManyChat llama a estos endpoints como paso \"External Request\" de sus flows para tarificar salud en tiempo real, pedir coberturas, reconocer a un cliente existente y cancelar/reprogramar llamadas — todo dentro de la conversación de WhatsApp.",
    payload: 'JSON escalar (sin arrays anidados) para pegar cada campo en un custom field de ManyChat.',
    seguridad: "Cabecera estática x-manychat-secret = MANYCHAT_WEBHOOK_SECRET (timing-safe; ManyChat no soporta firma HMAC). Idempotencia en la acción de llamadas. Exentos del bloqueo global de la web.",
  },
  {
    direccion: "entrante",
    nombre: "Retell AI — resultado de llamada",
    endpoint: "/api/retell/webhook",
    resumen: "Retell llama a este endpoint cuando termina de analizar una llamada saliente automática (evento call_analyzed), y la web actualiza la ficha del lead con el resultado.",
    payload: '{ "event": "call_analyzed", "call": { "metadata": { "leadId": "..." }, ... } }',
    seguridad: "Cabecera x-retell-signature (v=<timestamp>,d=<hmac>), HMAC-SHA256 sobre el cuerpo + timestamp con RETELL_API_KEY como secreto. Ventana de repetición de 5 minutos.",
  },
  {
    direccion: "entrante",
    nombre: "Bland.ai — resultado de llamada",
    endpoint: "/api/bland/webhook",
    resumen: "Bland llama a este endpoint al terminar una llamada saliente automática, y la web actualiza la ficha del lead con el resultado.",
    payload: '{ "metadata": { "leadId": "..." }, ... }',
    seguridad: "Cabecera x-webhook-signature, HMAC-SHA256 sobre el cuerpo con BLAND_WEBHOOK_SECRET como secreto.",
  },
];
