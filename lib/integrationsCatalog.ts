// Catálogo de datos para /admin/integraciones. Deliberadamente sin acceso a
// process.env (eso vive en las rutas server-side de
// app/api/admin/integraciones/*) para poder importarse tanto desde las
// páginas cliente (documentación) como desde el servidor (para construir las
// respuestas de estado/test) sin arrastrar nada sensible al bundle.

/* ------------------------------ Codescopic -------------------------------- */
// Aún no hay integración real: no existe lib/codescopic.ts ni variables de
// entorno para ello. Lo que sí existe es la preparación hecha en el
// tarificador de salud (ver lib/schema.ts, lib/forms.ts, components/
// StepForm.tsx) para que, en cuanto Sergio tenga las credenciales y la
// documentación de acceso reales de Codescopic, solo falte escribir el
// cliente HTTP que traduzca estos datos a su payload.

export type CodescopicFieldMap = {
  campoCodescopic: string;
  origenEnLaWeb: string;
  estado: "listo" | "pendiente";
  nota?: string;
};

// Mapeo entre el payload de referencia que pasó Sergio (ramo Salud) y los
// datos que el tarificador de salud ya recoge hoy.
export const CODESCOPIC_FIELD_MAP: CodescopicFieldMap[] = [
  { campoCodescopic: "insuranceLine.id", origenEnLaWeb: "fijo: \"salud\" (o el id que asigne Codescopic a esta línea)", estado: "pendiente", nota: "Falta el catálogo de insuranceLine.id de Codescopic para saber qué valor mandar." },
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
  { campoCodescopic: "holder.addresses[].town.id", origenEnLaWeb: "—", estado: "pendiente", nota: "Codescopic pide el id de su catálogo de municipios, no el código postal en sí. Falta ese catálogo (o un endpoint suyo de búsqueda por CP) para poder resolverlo." },
  { campoCodescopic: "risk.insureds[].birthDate", origenEnLaWeb: "aseguradosAdicionales[].fechaNacimiento", estado: "listo" },
  { campoCodescopic: "risk.insureds[].gender.id", origenEnLaWeb: "aseguradosAdicionales[].sexo", estado: "listo" },
  { campoCodescopic: "risk.insureds[].identificationDocument / smoker / addresses", origenEnLaWeb: "—", estado: "pendiente", nota: "A propósito no se piden en el tarificador (solo fecha de nacimiento y sexo, para no añadir fricción): se completarían en un segundo contacto, ya con el agente." },
  { campoCodescopic: "autenticación (API key / OAuth / certificado…)", origenEnLaWeb: "—", estado: "pendiente", nota: "Codescopic aún no ha compartido su mecanismo de autenticación ni la URL base de su API." },
];

// Variables de entorno previstas para cuando llegue esa documentación de
// acceso — nombres razonables siguiendo el mismo patrón que Retell/Bland/
// ManyChat (ver lib/retell.ts, lib/bland.ts, lib/manychat.ts), a ajustar si
// Codescopic exige otro esquema de autenticación.
export const CODESCOPIC_ENV_VARS: { nombre: string; descripcion: string }[] = [
  { nombre: "CODESCOPIC_BASE_URL", descripcion: "URL base de la API de Codescopic (p.ej. https://api.codescopic.com)." },
  { nombre: "CODESCOPIC_API_KEY", descripcion: "Credencial de acceso (a confirmar si es API key, OAuth o certificado con la documentación real de Codescopic)." },
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
    ],
  },
  {
    categoria: "Panel de administración (uso interno)",
    descripcion: "Bajo /api/admin/*, protegidos por ADMIN_TOKEN o sesión de agente + permiso de módulo (ver lib/agentAuth.ts). No pensados para integraciones externas — los usa exclusivamente este panel.",
    endpoints: [
      { method: "GET/PATCH/DELETE", path: "/api/admin/leads, /leads/[id], /leads/[id]/anonymize, /leads/[id]/export", resumen: "Listado, ficha, RGPD (anonimizar) y exportación de un lead.", auth: "Módulo \"leads\" (o \"rgpd\" para anonimizar)", request: "—", response: "—" },
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
      { method: "POST", path: "/api/admin/auth/login, /auth/logout", resumen: "Login/logout de agente (email + contraseña).", auth: "Rate limit en login", request: "{ email, password }", response: "{ ok }" },
      { method: "GET", path: "/api/admin/auth/me", resumen: "Identidad de quien está usando el panel ahora mismo.", auth: "ADMIN_TOKEN o cookie de agente", request: "—", response: "{ ok, identity }" },
      { method: "POST", path: "/api/admin/manychat/enviar", resumen: "Envía un WhatsApp de seguimiento directo por ManyChat.", auth: "Módulo \"presupuestos\"", request: "{ telefono, texto, ... }", response: "{ ok }" },
    ],
  },
  {
    categoria: "Otros",
    descripcion: "",
    endpoints: [
      { method: "GET", path: "/api/theme, /api/theme/logo", resumen: "Lectura pública del tema activo (usada por la propia web para pintarse).", auth: "Pública", request: "—", response: "SiteTheme" },
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
