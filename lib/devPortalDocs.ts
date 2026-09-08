// Datos de documentación técnica para /portal-desarrollo (onboarding IT/Dev).
// Igual que lib/integrationsCatalog.ts y lib/siteStructure.ts: SIN acceso a
// process.env ni a datos en vivo — es documentación redactada a mano que hay
// que mantener al día cuando cambie el código. Se consume desde
// app/portal-desarrollo/PortalDesarrolloClient.tsx.

/* ========================================================================== */
/* 1. TARIFICADOR DE SALUD — lógica y pasos                                    */
/* ========================================================================== */

export type SaludStep = {
  n: number;
  key: string;
  control: string;
  campo: string;
  pregunta: string;
  fase: string;
  showIf: string;
  validacion: string;
};

// Tarificador general de salud (app/tarificador → StepForm + SALUD_CONFIG).
export const SALUD_STEPS: SaludStep[] = [
  { n: 1, key: "inicio", control: "choice", campo: "inicio (+ fechaInicioPersonalizada)", pregunta: "¿Cuándo quieres que empiece tu seguro?", fase: "1 · Tu seguro", showIf: "—", validacion: "enum cuanto_antes/proximo_mes/fecha_personalizada/comparando; si elige fecha, regex YYYY-MM-DD" },
  { n: 2, key: "asegurados", control: "numbergrid", campo: "numAsegurados", pregunta: "¿Cuántas personas queréis aseguraros?", fase: "1 · Tu seguro", showIf: "—", validacion: "entero 1–9" },
  { n: 3, key: "titular", control: "dobsex", campo: "fechaNacimiento + sexo", pregunta: "Datos de la persona titular", fase: "2 · Tus datos", showIf: "—", validacion: "dd/mm/aaaa, mayoría de edad (año 1920..-17); sexo obligatorio" },
  { n: 4, key: "identificacion", control: "identificacion", campo: "codigoPostalReal", pregunta: "¿En qué código postal vives?", fase: "2 · Tus datos", showIf: "—", validacion: "5 dígitos (^\\d{5}$). NO se pide DNI aquí (minimización RGPD): va al gate" },
  { n: 5, key: "fumador", control: "yesno", campo: "fumador", pregunta: "¿Fuma la persona titular?", fase: "2 · Tus datos", showIf: "—", validacion: "boolean" },
  { n: 6, key: "aseguradosExtra", control: "aseguradosExtra", campo: "aseguradosAdicionales[]", pregunta: "Datos de los demás asegurados", fase: "2 · Tus datos", showIf: "numAsegurados > 1", validacion: "por cada uno: fecha nac. (cualquier edad) + sexo" },
  { n: 7, key: "dental", control: "yesno", campo: "coberturaDental", pregunta: "¿Quieres que incluya cobertura dental?", fase: "2 · Tus datos", showIf: "—", validacion: "boolean" },
  { n: 8, key: "tiene", control: "yesno", campo: "yaTieneSeguro", pregunta: "¿Ya tienes un seguro de salud?", fase: "2 · Tus datos", showIf: "—", validacion: "boolean" },
  { n: 9, key: "actual", control: "seguroActual", campo: "seguroActualImporte / Periodo / Servicios[]", pregunta: "Tu seguro de salud actual", fase: "2 · Tus datos", showIf: "yaTieneSeguro === true", validacion: "importe ≥0 ≤100000; periodo mes/año; servicios[]" },
  { n: 10, key: "contacto", control: "contact", campo: "— (filtrado)", pregunta: "Ya casi está", fase: "3 · Tu precio", showIf: "FILTRADO en salud (skipContactStep): se recoge en el gate", validacion: "ver gate de la comparativa" },
];

// Qué pide el gate obligatorio de /comparativa (ComparativaGate) en salud.
export const SALUD_GATE: string[] = [
  "Nombre (mín. 2 caracteres).",
  "Primer y segundo apellido (Codeoscopic exige nombre + DOS apellidos).",
  "Tipo de documento (Dni/Nie) + DNI/NIE, con regex ^(\\d{8}[A-Z]|[XYZ]\\d{7}[A-Z])$.",
  "Teléfono móvil español (^[6-9]\\d{8}$ tras normalizar) y email.",
  "Un único check ESENCIAL obligatorio: privacidad + autorización de contacto + datos de salud (art. 9 RGPD) + comunicaciones; se graban timestamps privacidadAt/contactoAt/comercialAt/datosSaludAt.",
  "Al enviar → POST /api/lead crea el lead real (con draft = modal no cerrable).",
];

// Diferencias del tarificador de landing de pago (PaidTarificadorSalud).
export type LpDiff = { aspecto: string; general: string; lp: string };
export const LP_SALUD_DIFFS: LpDiff[] = [
  { aspecto: "Nº de pasos", general: "~8–9 pasos, una pregunta por pantalla", lp: "3 pasos; los datos de salud en UNA sola pantalla" },
  { aspecto: "Ruta", general: "/tarificador (embebido vía TarificadorExperience)", lp: "/lp/[slug]/tarificador (página completa propia, con header/logo/sidebar)" },
  { aspecto: "Asegurados", general: "numbergrid 1–9", lp: "1–5 + adicionales por edad/sexo" },
  { aspecto: "Paso «inicio»", general: "paso propio (choice + fecha)", lp: "botones dentro del paso salud; admite prefill por URL (?asegurados, ?inicio)" },
  { aspecto: "Sidebar «Te llamamos gratis»", general: "no", lp: "sí: lead independiente vía POST /api/call-request → /gracias" },
  { aspecto: "hideAssistant", general: "n/a", lp: "flag de la landing: oculta el widget flotante" },
  { aspecto: "Draft y gate", general: "saveLeadDraft → /comparativa?draft=1 → gate → /api/lead", lp: "idéntico; solo añade origen:\"lp\" y landingSlug" },
];

// Flujo completo de salud (endpoints reales).
export type FlowStep = { n: number; paso: string; detalle: string };
export const SALUD_FLOW: FlowStep[] = [
  { n: 1, paso: "Tarificador (general o LP)", detalle: "Captura datos técnicos → saveLeadDraft() a sessionStorage[ventajon:leadDraft] + saveQuote() parcial. NO crea lead todavía." },
  { n: 2, paso: "Navega a /comparativa?producto=salud&draft=1", detalle: "Comparativa detecta el draft y bloquea con el gate obligatorio (no cerrable)." },
  { n: 3, paso: "Gate → POST /api/lead", detalle: "Combina draft + contacto + DNI + consentimiento. Valida leadSchema (Zod), deriva zona del CP, Turnstile + rate-limit, upsertLead. Devuelve { ok, id, deduped }. Tarificar NO crea presupuesto." },
  { n: 4, paso: "POST /api/quote/create + polling GET /api/quote/[insuranceId]", detalle: "Crea proyecto en Codeoscopic (POST /insurances), guarda insuranceId; polling cada 4s hasta 90s o done. Sin Codeoscopic → catálogo mock (fail-open). En paralelo GET /api/products trae las negociadas." },
  { n: 5, paso: "Interés → POST /api/quote/interes", detalle: "Al pulsar «Que te llamen gratis» sobre una opción se crea el PRESUPUESTO anclado al lead con la compañía/precio elegidos y snapshot Codeoscopic." },
  { n: 6, paso: "Redirige a /quiero-que-me-llamen", detalle: "Recoge la preferencia de llamada (callRequestSchema)." },
];

// Cálculo del precio orientativo de las opciones NEGOCIADAS (saludPriceAdvanced).
export const SALUD_PRICING: string[] = [
  "Zona: se traduce la etiqueta del CP a clave estable canarias/baleares/peninsula.",
  "Tramo de edad: se busca el tramo [min,max] que cubre la edad (de la fecha de nacimiento) en product.pricing.",
  "Base con/sin copago: precio del tramo+zona si está configurado; si no, precio plano del producto.",
  "Dental: +4 €/mes fijo si coberturaDental.",
  "Nº de asegurados: (base + dental) × nº (acotado 1–9).",
  "Descuento por volumen: el de mayor «desde» que no supere el nº; pct (× (1-valor/100)) o eur (resta €). Redondeo a 2 decimales.",
  "Fallback plano: sin pricing/tramos → (base + 4·dental) × n, sin zona/edad/descuento.",
];

/* ========================================================================== */
/* 2. MODELO DE DATOS — «tablas» del almacén (Redis / Upstash)                 */
/* ========================================================================== */

export type DataRow = { clave: string; tipo: string; forma: string; ttl: string; para: string };
export type DataGroup = { grupo: string; descripcion?: string; filas: DataRow[] };

export const DATA_MODEL_NOTES: string[] = [
  "Backend: Upstash Redis (Marketplace de Vercel o KV clásico) vía el SDK @upstash/redis (protocolo REST/HTTPS). Sin credenciales cae a un almacén EN MEMORIA del proceso, no durable (solo dev).",
  "Serialización dominante: documento JSON con helpers jget/jset (SET/GET de un objeto). No se usa el tipo hash salvo en los contadores de beacon.",
  "Listados: sorted sets (ZADD score = timestamp, ZRANGE REV) que guardan solo el id; el documento se lee aparte por su clave.",
  "TTL: solo tienen caducidad los tokens de verificación, el OTP, el rate-limit y los locks. El resto es persistente.",
  "Las cookies firmadas (sesión de cliente/agente, site_access) y los tokens HMAC de quote/referral NO son claves de Redis: son cadenas autocontenidas en cookie/URL.",
];

export const DATA_MODEL: DataGroup[] = [
  {
    grupo: "Entidades del CRM (documento JSON por id)",
    filas: [
      { clave: "lead:{id}", tipo: "JSON", forma: "Ficha unificada: contacto, zona (codigoPostal), producto, status, identificación Codeoscopic (documento, apellidos, codigoPostalReal, aseguradosAdicionales, codeoscopicInsuranceId), campos por ramo, consents[], utm, activity[], submissions[], emails[]", ttl: "—", para: "Cliente potencial, deduplicado por teléfono/email" },
      { clave: "presupuesto:{id}", tipo: "JSON", forma: "leadId, producto, status (nuevo…caducado), data, precioAprox, notas[], eleccion (compañía/precio elegidos), contacto denormalizado", ttl: "—", para: "Tarificación con interés como entidad gestionable" },
      { clave: "llamada:{id}", tipo: "JSON", forma: "leadId, status (pendiente/programada/hecha/cancelada), fechaProgramada, turno, agente, notas[], contacto", ttl: "—", para: "Solicitud de callback con seguimiento" },
      { clave: "task:{id}", tipo: "JSON", forma: "leadId?, presupuestoId?, titulo, fecha/hora, agente, completada", ttl: "—", para: "Agenda / recordatorios del equipo" },
      { clave: "notif:{id}", tipo: "JSON", forma: "leadId, llamadaId, texto, leido, url", ttl: "—", para: "Avisos del área de cliente" },
      { clave: "nps:byRef:{refId}", tipo: "JSON", forma: "refType (llamada/presupuesto), score 0–10, comentario, quiereResena", ttl: "—", para: "Encuesta NPS enlazada sin login por id impredecible" },
      { clave: "agent:{id}", tipo: "JSON", forma: "nombre, email, passwordHash (nunca al cliente), rol (admin/agente), permisos[], disponibilidad, activo", ttl: "—", para: "Cuenta de equipo con permisos modulares" },
      { clave: "audit:{id}", tipo: "JSON", forma: "at, agenteId, action, modulo, entidad, resumen", ttl: "—", para: "Registro de auditoría del panel" },
      { clave: "referral:code:{code}", tipo: "JSON", forma: "referidorLeadId, convertidos[] (status cotizado/opt-in/contratado/pagado, ids de orden Tremendous, reintentos)", ttl: "—", para: "Programa de referidos «Amigos Ventajon»" },
    ],
  },
  {
    grupo: "Índices (sorted sets y lookups)",
    descripcion: "Los *:index y *:byLead:* son sorted sets (score = timestamp). Los idx:* y *:byCode son lookups string→id.",
    filas: [
      { clave: "leads:index · leads:source:{source}", tipo: "sorted set", forma: "member = leadId", ttl: "—", para: "Listado global y por fuente de captación" },
      { clave: "idx:phone:{tel} · idx:email:{email}", tipo: "string", forma: "valor = leadId", ttl: "—", para: "Deduplicación / lookup de leads" },
      { clave: "presupuestos:index · :byLead:{id} · presupuesto:byCode:{codigo}", tipo: "sorted set / string", forma: "id o presupuestoId", ttl: "—", para: "Listados y resolución del nº legible de presupuesto" },
      { clave: "llamadas:index · :byLead:{id}", tipo: "sorted set", forma: "member = llamadaId", ttl: "—", para: "Listado global y por lead" },
      { clave: "tasks:index · :byLead:{id} · notifs:byLead:{id} · nps:index", tipo: "sorted set", forma: "member = id/refId", ttl: "—", para: "Listados de tareas, notificaciones y NPS" },
      { clave: "agents:index · idx:agentEmail:{email} · audit:index", tipo: "sorted set / string", forma: "id / agentId", ttl: "—", para: "Equipo (listado y login por email) y auditoría" },
      { clave: "referral:byLead:{id} · idx:refcode:{cand} · referral:codes:index", tipo: "string / sorted set", forma: "code / referidorLeadId", ttl: "—", para: "Idempotencia, anticolisión y listado de códigos de referido" },
    ],
  },
  {
    grupo: "Configuración (documentos singleton JSON)",
    descripcion: "Una sola clave con el objeto completo; defaults fusionados al leer.",
    filas: [
      { clave: "products:all", tipo: "JSON (array)", forma: "Product[] (compañía × ramo: precios, pricing por tramo/zona, servicios, activo, destacado)", ttl: "—", para: "Catálogo de opciones negociadas (/admin/productos)" },
      { clave: "posts:all · promotions:all · testimonios:all · email_templates:all", tipo: "JSON (array)", forma: "CMS: blog, promociones, testimonios y plantillas de email", ttl: "—", para: "Contenido editable desde el panel" },
      { clave: "landings:all · landing:price-match · landing:referral · landing:lp-salud", tipo: "JSON", forma: "Landings de pago /lp/[slug] + singletons de price-match y referidos", ttl: "—", para: "Editor de landings sin desplegar" },
      { clave: "campaign:home · exitintent:general · inactivity_modal:comparativa", tipo: "JSON", forma: "Slides de campaña, campañas de exit-intent y modal de inactividad", ttl: "—", para: "CRO configurable" },
      { clave: "theme:site", tipo: "JSON", forma: "colores, fuentes, logos, favicon, heroImages, partnerLogos, cookies, GA4, Meta Pixel, GTM, loader, homeHero", ttl: "—", para: "Tema/diseño del sitio (/admin/diseno)" },
      { clave: "config:team-notifications · siteAccess:config · brand_hidden:{ramo}", tipo: "JSON", forma: "avisos al equipo; bloqueo global (enabled, passwordHash); marcas ocultas por ramo", ttl: "—", para: "Configuración de operación y comparativa" },
    ],
  },
  {
    grupo: "Push, analítica, tokens, rate-limit y locks",
    filas: [
      { clave: "pushSubs:byLead:{id} · pushSubs:team:{agentId} · pushSubs:team:index", tipo: "JSON (array)", forma: "Suscripciones Web Push (endpoint + keys), máx. 10", ttl: "—", para: "Push del cliente y del equipo" },
      { clave: "beacon:{slug}:{day}", tipo: "HASH", forma: "campo {kind}:{device}:{daypart} → contador (único uso de HINCRBY)", ttl: "—", para: "Vistas/clics de CTA por landing y día" },
      { clave: "verify:{token}", tipo: "string", forma: "valor = leadId; token = 24 bytes base64url; single-use", ttl: "30 min", para: "Verificación de acceso al área de cliente" },
      { clave: "otp:admin:{nonce}", tipo: "JSON", forma: "agentId, codeHash (SHA-256), attempts; máx. 5 intentos; single-use", ttl: "10 min", para: "2FA de agentes (login)" },
      { clave: "ratelimit:{key}", tipo: "contador", forma: "INCR + EXPIRE; key = {bucket}:{ip} o {bucket}:tel:{telefono}", ttl: "variable (ventana)", para: "Anti-abuso / anti-acoso (llamadas)" },
      { clave: "lock:upsertLead:{tel|email} · lock:referral:{code} · idem:{...}", tipo: "SET NX PX", forma: "lock/idempotencia de webhooks; TTL corto (5s–15min)", ttl: "5s–15min", para: "Concurrencia y deduplicación de reintentos" },
    ],
  },
];

/* ========================================================================== */
/* 3. SEGURIDAD Y CIBERSEGURIDAD                                               */
/* ========================================================================== */

export type SecMeasure = { titulo: string; detalle: string };
export type SecCategory = { categoria: string; medidas: SecMeasure[] };

export const SECURITY_POLICIES: SecCategory[] = [
  {
    categoria: "Autenticación",
    medidas: [
      { titulo: "Token maestro admin", detalle: "ADMIN_TOKEN solo por cabecera x-admin-token (nunca en query string), comparación en tiempo constante (timingSafeEqual)." },
      { titulo: "2FA obligatorio de agentes", detalle: "Login = contraseña (scrypt) → OTP de 6 dígitos por email (hasheado SHA-256, TTL 10 min, máx. 5 intentos, single-use). La sesión solo se emite tras verificar el código." },
      { titulo: "Permisos por módulo/rol", detalle: "requireModule protege cada /api/admin/*; gestionar agentes/permisos exige rol admin no delegable (un agente no puede auto-escalar). El passwordHash nunca se serializa al cliente." },
      { titulo: "Anti-fuerza-bruta en login", detalle: "10 intentos/10 min por IP y 10 fallos/hora por email." },
    ],
  },
  {
    categoria: "Sesiones (cookies firmadas HMAC)",
    medidas: [
      { titulo: "Tres dominios con secretos aislados", detalle: "ventajon_agent_session (ADMIN_SESSION_SECRET), ventajon_client_session (CLIENT_SESSION_SECRET), site_access (SITE_ACCESS_SECRET). Compromiso de uno NO arrastra a los demás." },
      { titulo: "Flags y formato", detalle: "HttpOnly, Secure (prod), SameSite=Lax, Path=/. Formato payload.HMAC; validación con timingSafeEqual y exp (caducidad sin pegar a KV)." },
      { titulo: "Secretos obligatorios en producción", detalle: "Si falta un *_SESSION_SECRET (≥32 chars) el subsistema lanza; se rechaza explícitamente reutilizar ADMIN_TOKEN como fallback." },
    ],
  },
  {
    categoria: "Verificación de webhooks",
    medidas: [
      { titulo: "Retell (fail-closed)", detalle: "Sin RETELL_API_KEY → 503. Firma x-retell-signature = HMAC-SHA256(rawBody+timestamp), timingSafeEqual, ventana anti-replay de 5 min, idempotencia claimOnce (SET NX PX)." },
      { titulo: "Bland", detalle: "Firma x-webhook-signature = HMAC-SHA256(rawBody) con BLAND_WEBHOOK_SECRET." },
      { titulo: "ManyChat", detalle: "Secreto compartido estático x-manychat-secret (ManyChat no soporta HMAC), timingSafeEqual, fail-closed (503 sin secreto)." },
    ],
  },
  {
    categoria: "Antibot / anti-acoso",
    medidas: [
      { titulo: "Honeypot", detalle: "Campo oculto company: si viene relleno se responde ok silencioso sin crear nada." },
      { titulo: "Turnstile (fail-closed si configurado)", detalle: "CAPTCHA invisible de Cloudflare verificado server-side. Sin TURNSTILE_SECRET_KEY no bloquea (defensa opcional)." },
      { titulo: "Rate limiting", detalle: "Endpoints que disparan llamada real: 20/h por IP + 3/24h por teléfono destino (barrera anti-acoso clave). quote-get 60/min; client-recover 10/h; admin-login 10/10min; verify-link 3/h por ficha; manychat-salud-quote 20/h." },
    ],
  },
  {
    categoria: "CSRF y cabeceras",
    medidas: [
      { titulo: "CSRF doble señal", detalle: "En mutaciones de /api/admin/* y /api/client/* el middleware exige Sec-Fetch-Site same-origin o Origin/Referer == host. Webhooks whitelistados. Los endpoints públicos de captación no operan sobre sesión con autoridad, así que no tienen superficie CSRF." },
      { titulo: "CSP", detalle: "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; allowlist de GTM/Cloudflare/Facebook/Codeoscopic para script/connect/frame." },
      { titulo: "Otras cabeceras", detalle: "HSTS (2 años, preload), X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (cámara/micro/geo off), COOP same-origin y CORP same-origin en /api/*, poweredByHeader off." },
    ],
  },
  {
    categoria: "Autorización a nivel objeto (BOLA/IDOR)",
    medidas: [
      { titulo: "/api/quote/[insuranceId]", detalle: "Solo admin, o cookie de cliente dueño del lead (exige lead.codeoscopicInsuranceId === insuranceId), o token HMAC del dueño. Un id ajeno → 403." },
      { titulo: "/api/client/*", detalle: "Sin sesión NO se puede cambiar teléfono ni email (evita secuestro de leads). Identificarse por teléfono/email/nº presupuesto no da sesión: se envía enlace de un solo uso al contacto YA guardado en la ficha." },
    ],
  },
  {
    categoria: "Tokens firmados y contraseñas",
    medidas: [
      { titulo: "Tokens HMAC-SHA256", detalle: "Quote (QUOTE_TOKEN_SECRET, TTL 30 días), referral opt-in (REFERRAL_TOKEN_SECRET, TTL 14 días). timingSafeEqual + exp. Fail-closed en prod." },
      { titulo: "Verificación de área de cliente", detalle: "Token aleatorio de 24 bytes, single-use (se borra al leer, también anti-timing), TTL 30 min. Enviado a página intermedia para que el escaneo de enlaces de Gmail/Outlook no lo consuma." },
      { titulo: "Contraseñas", detalle: "scrypt nativo, sal aleatoria de 16 bytes por contraseña, formato salt:hash, verificación timingSafeEqual. Reglas duras para el bloqueo global (≥14 chars, mayús/minús/dígito/símbolo)." },
    ],
  },
  {
    categoria: "Minimización y RGPD",
    medidas: [
      { titulo: "Anonimización (art. 17)", detalle: "Borra nombre/teléfono/email/CP/fecha nac./UTM e índices idx:phone/idx:email; conserva activity/consents como prueba de atención (auditoría DGSFP)." },
      { titulo: "Retención automática", detalle: "Cron a 730 días (24 meses) sin actividad y sin contratar; presupuestos fríos se caducan a 90 días (no se borran)." },
      { titulo: "Consentimiento y CAPI", detalle: "Se registra IP, user-agent, source, page y timestamps. Meta CAPI solo si aceptaComercial; email/teléfono se envían hasheados SHA-256; el access token vive solo en env." },
    ],
  },
];

export type AuthMatrixRow = { categoria: string; ejemplos: string; auth: string; escritura: string };
export const ENDPOINT_AUTH_MATRIX: AuthMatrixRow[] = [
  { categoria: "Captación pública", ejemplos: "/api/lead, /call-request, /exit-intent, /calculadora-ahorro, /lead-magnet", auth: "Sin login. Honeypot + Turnstile (fail-closed si configurado) + rate-limit 20/h IP y 3/24h teléfono + Zod estricto", escritura: "Sí (crea/actualiza SU propio lead; puede disparar llamada)" },
  { categoria: "Tracking público", ejemplos: "/api/landing/track", auth: "Sin auth. Enum validado + slug ≤80; solo contadores agregados, sin PII", escritura: "Sí (solo contadores)" },
  { categoria: "Cotización", ejemplos: "/api/quote/[insuranceId], /quote/create, /quote/interes", auth: "BOLA: admin O sesión cliente dueña O quote-token HMAC; rate-limit 60/min", escritura: "Ligada al lead; no expone datos ajenos" },
  { categoria: "Área de cliente", ejemplos: "/api/client/*", auth: "Cookie de sesión firmada HMAC; mutaciones bajo CSRF; recuperación solo por enlace single-use al contacto guardado", escritura: "Sí (solo sobre el propio lead)" },
  { categoria: "Panel admin", ejemplos: "/api/admin/*", auth: "ADMIN_TOKEN (cabecera, timing-safe) o sesión de agente con 2FA + permiso de módulo/rol; CSRF", escritura: "Sí (según permisos)" },
  { categoria: "Webhooks", ejemplos: "/api/retell/webhook, /bland/webhook, /manychat/*", auth: "HMAC fail-closed + anti-replay + idempotencia (Retell); secreto estático (ManyChat)", escritura: "Sí (actividad del lead)" },
  { categoria: "Cron", ejemplos: "/api/cron/retention, /referral/process-payouts", auth: "Authorization: Bearer CRON_SECRET (timing-safe, fail-closed)", escritura: "Sí (anonimiza/caduca en lote)" },
];

export const API_SECURITY_QA = {
  pregunta: "¿Cualquiera que conozca las APIs puede acceder e inyectar/leer datos, o tienen seguridad robusta?",
  respuestaCorta: "No. Conocer las rutas no basta para leer ni inyectar datos ajenos. La seguridad no depende de que las URLs sean secretas, sino de controles criptográficos y de autorización en cada endpoint.",
  publicos: [
    "Los formularios públicos (/api/lead…) existen para que un visitante pida presupuesto: cualquiera puede enviarlos, como un formulario de contacto — pero solo crea SU propia solicitud, nunca lee ni modifica la de otro.",
    "Cada envío pasa por Zod estricto + honeypot + Turnstile (si activo) + rate-limit por IP y por teléfono: impide spam en el CRM y acoso telefónico.",
    "Escribir «no lee»: si el teléfono/email coincide con un lead previo, en vez de dar acceso se envía un enlace de verificación de un solo uso al contacto ya guardado.",
  ],
  jamas: [
    "/api/admin/*: ADMIN_TOKEN (timing-safe) o sesión de agente con 2FA + permiso de módulo. Sin eso, 401/403.",
    "Datos de cliente y cotizaciones (/api/client/*, /api/quote/[id]): cookie de sesión firmada o token HMAC que prueba la propiedad del recurso. Id ajeno → 403 (BOLA cerrado).",
    "Webhooks: firma HMAC fail-closed (Retell) o secreto (ManyChat). Sin firma válida → 401.",
    "Cron: Bearer CRON_SECRET.",
  ],
};

export const SECURITY_RESIDUAL: SecMeasure[] = [
  { titulo: "Turnstile no activo por defecto", detalle: "Sin TURNSTILE_SECRET_KEY el CAPTCHA no bloquea; la única barrera antibot sería el rate-limit. Recomendación: activarlo (el código ya lo soporta, fail-closed en cuanto exista el secreto)." },
  { titulo: "Rate-limit depende de Redis", detalle: "Sin credenciales KV cae a memoria por proceso; en serverless multi-instancia deja de ser efectivo frente a un atacante distribuido. Confirmar KV/Upstash en producción." },
  { titulo: "ManyChat con secreto estático", detalle: "/api/manychat/cliente devuelve PII autenticado solo por cabecera estática (limitación de ManyChat). Rotar el secreto y, si se puede, restringir por IP de origen." },
  { titulo: "Fail-open del gate global", detalle: "Si Upstash cae, el bloqueo con contraseña se desactiva temporalmente (decisión consciente para no tumbar la web); /admin mantiene su 2FA propia." },
  { titulo: "CSP con 'unsafe-inline' en script-src", detalle: "Por el snippet inline de GTM; reduce eficacia frente a XSS. Mitigado con object-src 'none' y base-uri 'self', pero no es CSP con nonces." },
  { titulo: "TTLs largos", detalle: "Sesión de cliente 180 días, quote token 30 días, sesión de agente 30 días. Cómodo para el usuario (cookies HttpOnly/firmadas), pero alarga la ventana si un token se filtra." },
];

/* ========================================================================== */
/* 4. REQUISITOS FUNCIONALES                                                   */
/* ========================================================================== */

export type ReqGroup = { grupo: string; items: string[] };
export const FUNCTIONAL_REQUIREMENTS: ReqGroup[] = [
  {
    grupo: "Captación y tarificación",
    items: [
      "Tarificar 4 ramos (salud, vida, auto, decesos) con un motor de pasos común; la zona se deriva del CP.",
      "Salud: comparativa con precios reales de aseguradoras en vivo (Codeoscopic) + opciones negociadas del catálogo, con fallback silencioso a mock si el motor no está configurado.",
      "Un solo objetivo por pantalla y confirmación siempre tras enviar (sin callejones sin salida).",
      "Capturar el lead con atribución (UTM, referrer, gclid/fbclid) y consentimiento con sello de tiempo.",
    ],
  },
  {
    grupo: "Contacto y conversión",
    items: [
      "Página de callback sin fugas (/quiero-que-me-llamen) y llamada automática de voz IA opcional (Retell/Bland) si el lead autoriza contacto.",
      "Funnel conversacional por WhatsApp (ManyChat): tarificar, reconocer cliente/prefill, enlace firmado a la comparativa con datos precargados.",
      "Programa de referidos con doble incentivo y pago automático (Tremendous).",
      "CRO configurable sin desplegar: exit-intent, modal de inactividad, banners, promociones.",
    ],
  },
  {
    grupo: "Gestión (CRM) y cliente",
    items: [
      "Ficha 360º con antiduplicado por teléfono/email, pipeline, timeline y auditoría de consentimientos.",
      "Presupuestos, llamadas, tareas, informes y seguimiento UTM; equipo con permisos por módulo y 2FA.",
      "Área de cliente sin registro: consultar presupuestos y cancelar/reprogramar llamadas, identificado por enlace de un solo uso.",
      "RGPD: anonimización, retención automática, export/borrado a petición y avisos al equipo sin PII.",
    ],
  },
];

/* ========================================================================== */
/* 5. FLUJOS DE INFORMACIÓN                                                     */
/* ========================================================================== */

export type InfoFlow = { titulo: string; pasos: string[] };
export const INFO_FLOWS: InfoFlow[] = [
  {
    titulo: "Alta de un lead (POST /api/lead) y sus efectos",
    pasos: [
      "Validación Zod → honeypot → Turnstile → rate-limit → determinación del source (referido > promoción > widget/landing > tarificador).",
      "Se registra el consentimiento (IP, user-agent, página) y se guarda/fusiona el lead en Redis (siempre primero, con lock + índices).",
      "Best-effort (si uno falla no rompe la respuesta): webhook saliente genérico → llamada automática (Retell/Bland) si autoriza → sync a ManyChat (WhatsApp) → email de comparativa → Meta CAPI si aceptaComercial → sesión de cliente (nuevo) o email de verificación (recurrente) → aviso al equipo (sin PII) → registro de conversión de referido.",
    ],
  },
  {
    titulo: "Comparativa con precios reales (Codeoscopic)",
    pasos: [
      "El gate crea el lead → POST /api/quote/create crea el proyecto en Codeoscopic (POST /insurances) y guarda el insuranceId.",
      "Polling GET /api/quote/[insuranceId] cada 4s hasta que las tarifas dejan de ser estimadas.",
      "El usuario elige una opción → POST /api/quote/interes crea el presupuesto con el snapshot de Codeoscopic.",
    ],
  },
  {
    titulo: "Puente WhatsApp ↔ web (ManyChat)",
    pasos: [
      "ManyChat llama a /api/manychat/prefill-salud (reconoce por teléfono) y /salud-quote (tarifica en tiempo real).",
      "La web devuelve un enlace firmado (HMAC, TTL 30 días) a /comparativa con los datos precargados.",
      "La web hidrata la comparativa con GET /api/client/hydrate-quote sin que el usuario reteclee ni reacepte la política.",
    ],
  },
  {
    titulo: "Resultado de llamada automática (webhook entrante)",
    pasos: [
      "Retell/Bland → POST /api/retell|bland/webhook → verifican firma HMAC (fail-closed) + anti-replay + idempotencia.",
      "Se añade la actividad y el resumen a la ficha del lead (updateLead).",
    ],
  },
];

/* ========================================================================== */
/* 6. MIGRACIÓN AL ENTORNO PROPIO DE VENTAJON                                  */
/* ========================================================================== */

export type EnvVar = { nombre: string; para: string; obligatoria: string; secreta: boolean };
export type EnvGroup = { grupo: string; nota?: string; vars: EnvVar[] };

export const ENV_GROUPS: EnvGroup[] = [
  {
    grupo: "Almacén de datos (Redis / KV) — CRÍTICO",
    nota: "Sin el par, la app arranca en modo memoria NO durable (solo dev). En producción se perderían todos los datos en cada reinicio/escalado.",
    vars: [
      { nombre: "KV_REST_API_URL", para: "URL del endpoint REST del almacén (Upstash/Vercel KV)", obligatoria: "Sí (o el par UPSTASH_*)", secreta: false },
      { nombre: "KV_REST_API_TOKEN", para: "Token de acceso REST al almacén", obligatoria: "Sí (o el par UPSTASH_*)", secreta: true },
      { nombre: "UPSTASH_REDIS_REST_URL / _TOKEN", para: "Alternativa al par KV_* (mismo cliente)", obligatoria: "Alternativa", secreta: true },
    ],
  },
  {
    grupo: "Admin, sesiones y tokens firmados",
    nota: "Los que «fallan cerrado» lanzan en la primera petición que usan ese subsistema, no en el arranque.",
    vars: [
      { nombre: "ADMIN_TOKEN", para: "Token maestro de /admin (sin él, /api/admin/* → 503)", obligatoria: "Sí", secreta: true },
      { nombre: "ADMIN_SESSION_SECRET", para: "Firma cookies de sesión de agente (fail-closed, ≥32 chars)", obligatoria: "Sí (login agentes)", secreta: true },
      { nombre: "CLIENT_SESSION_SECRET", para: "Firma cookies del área de cliente (fail-closed)", obligatoria: "Sí (área cliente)", secreta: true },
      { nombre: "SITE_ACCESS_SECRET", para: "Firma la cookie del bloqueo global (lanza si <32 chars cuando el gate está activo)", obligatoria: "Sí si se usa el gate", secreta: true },
      { nombre: "QUOTE_TOKEN_SECRET", para: "HMAC de los enlaces firmados a /comparativa (WhatsApp) e hydrate-quote", obligatoria: "Sí (comparativa por WhatsApp)", secreta: true },
      { nombre: "REFERRAL_TOKEN_SECRET", para: "HMAC del doble opt-in de referidos", obligatoria: "Sí (referidos)", secreta: true },
      { nombre: "PDF_WATERMARK_SECRET", para: "Marca de agua HMAC en PDFs de presupuesto (si falta, marca vacía)", obligatoria: "Opcional", secreta: true },
    ],
  },
  {
    grupo: "Dominio y cron",
    vars: [
      { nombre: "NEXT_PUBLIC_SITE_URL", para: "Dominio absoluto para JSON-LD, sitemap, robots y TODOS los enlaces firmados por email/WhatsApp. Fuera de Vercel no existen las VERCEL_*", obligatoria: "Sí al migrar", secreta: false },
      { nombre: "CRON_SECRET", para: "Bearer que protege /api/cron/retention y /referral/process-payouts (sin él → 503). Fuera de Vercel hay que enviarlo a mano en la cabecera", obligatoria: "Sí (crons)", secreta: true },
    ],
  },
  {
    grupo: "Codeoscopic (motor de tarificación, OAuth2)",
    nota: "El prefijo real es CODESCOPIC_ (sin la O). Si falta cualquiera de las 5 obligatorias, la comparativa degrada a mock (fail-open).",
    vars: [
      { nombre: "CODESCOPIC_BASE_URL / _OAUTH_URL", para: "URL base de la API Integra y endpoint OAuth2 client_credentials", obligatoria: "Sí (precios reales)", secreta: false },
      { nombre: "CODESCOPIC_CLIENT_ID / _CLIENT_SECRET", para: "Credenciales OAuth2 de la correduría (el secret nunca al navegador)", obligatoria: "Sí", secreta: true },
      { nombre: "CODESCOPIC_APP_HEADER", para: "Cabecera X-Client-App que identifica esta web", obligatoria: "Sí", secreta: false },
      { nombre: "CODESCOPIC_USER_EMAIL", para: "X-User-Email para operar en nombre de un usuario Avant2", obligatoria: "Opcional", secreta: false },
    ],
  },
  {
    grupo: "Integraciones opcionales (modo degradado si faltan)",
    vars: [
      { nombre: "RETELL_API_KEY / _AGENT_ID / _FROM_NUMBER", para: "Llamada de voz automática (la API key es también el secreto HMAC del webhook)", obligatoria: "Opcional", secreta: true },
      { nombre: "BLAND_API_KEY / _PATHWAY_ID / _WEBHOOK_SECRET", para: "Alternativa a Retell (no activar ambos)", obligatoria: "Opcional", secreta: true },
      { nombre: "MANYCHAT_API_TOKEN / _WEBHOOK_SECRET / _THANKYOU_FLOW_NS / _VERIFICATION_FLOW_NS", para: "WhatsApp: saliente (api.manychat.com) y entrante (x-manychat-secret; sin él /api/manychat/* → 503)", obligatoria: "Sí si se usa el funnel entrante", secreta: true },
      { nombre: "META_CAPI_ACCESS_TOKEN", para: "Evento Lead server-side (el pixel cliente sigue sin él)", obligatoria: "Opcional", secreta: true },
      { nombre: "RESEND_API_KEY / EMAIL_FROM", para: "Email transaccional (sin él no hay correos; el acceso al área de cliente de fichas existentes queda desactivado)", obligatoria: "Recomendada", secreta: true },
      { nombre: "NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY", para: "CAPTCHA Cloudflare (sin él, solo rate-limit)", obligatoria: "Opcional (recomendada)", secreta: true },
      { nombre: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_SUBJECT", para: "Web Push (generar con npx web-push generate-vapid-keys; la pública debe coincidir en las dos vars)", obligatoria: "Opcional", secreta: true },
      { nombre: "TREMENDOUS_API_KEY / _FUNDING_SOURCE_ID / _CAMPAIGN_ID / _BASE_URL", para: "Pago de bonos de referidos (Amazon eGift)", obligatoria: "Sí (referidos)", secreta: true },
      { nombre: "SHEETS_WEBAPP_URL / SHEETS_WEBAPP_SECRET", para: "Informe \"Leads ManyChat\": lee el DASHBOARD de la hoja de Google Sheets vía Web App de Apps Script (ver docs/informe-manychat-google-sheets.md). Sin ellas el informe muestra \"no configurado\"", obligatoria: "Sí (informe ManyChat)", secreta: true },
      { nombre: "LEAD_WEBHOOK_URL + NEXT_PUBLIC_WHATSAPP_NUMBER / _CALLER_1/2 / _CONTACT_HOURS / _GOOGLE_REVIEW_URL / _WHATSAPP_FUNNEL_SALUD_URL", para: "Webhook saliente opcional de leads + marca/contacto (todas con fallback)", obligatoria: "Opcional", secreta: false },
    ],
  },
];

export const PLATFORM_DEPS: SecMeasure[] = [
  { titulo: "Almacén: SDK @upstash/redis (REST, no TCP)", detalle: "Un redis:// TCP normal NO sirve tal cual. Opciones: (1) seguir con Upstash gestionado (cero cambios de código); (2) Redis/Valkey propio + proxy REST compatible con Upstash (p.ej. SRH) que soporte GET/SET(EX,NX,PX)/DEL/ZADD/ZRANGE REV y EVAL (Lua, usado para liberar locks). Hay que MIGRAR los datos existentes, no basta con una base vacía." },
  { titulo: "Vercel Cron → cron del sistema", detalle: "vercel.json define retention (0 3 * * *) y process-payouts (0 4 * * *) en UTC. Replicar con crontab/systemd llamando por HTTP con Authorization: Bearer $CRON_SECRET. Ambos son GET idempotentes." },
  { titulo: "Resolución de dominio", detalle: "Fuera de Vercel no existen VERCEL_URL/VERCEL_PROJECT_PRODUCTION_URL → fijar NEXT_PUBLIC_SITE_URL o los enlaces absolutos apuntarían al .vercel.app." },
  { titulo: "Middleware Edge → Node", detalle: "El middleware (CSRF, gate global con Web Crypto, cabeceras COOP/CORP) corre igual bajo next start en Node, sin infraestructura Edge. Todas las rutas API declaran runtime = nodejs (ninguna Edge)." },
  { titulo: "maxDuration / timeouts del proxy", detalle: "Rutas de hasta 60s (quote/create, crons, codeoscopic-*). Subir proxy_read_timeout/proxy_send_timeout del reverse proxy a ≥65s para no cortar la cotización de Codeoscopic ni los crons." },
  { titulo: "Vercel Analytics / Speed Insights", detalle: "Fuera de Vercel quedan inertes (no rompen). Se pueden retirar del layout si se quiere limpiar." },
];

export const RUNTIME_REQS: SecMeasure[] = [
  { titulo: "Node.js", detalle: "No hay engines/.nvmrc. Next 14.2.x exige Node ≥ 18.17; recomendado Node 20 LTS." },
  { titulo: "Gestor de paquetes", detalle: "npm (package-lock.json). Instalar con npm ci." },
  { titulo: "Comandos", detalle: "npm run build (next build) → npm run start (next start, puerto 3000 por defecto). npm run typecheck (tsc --noEmit)." },
  { titulo: "Modo degradado", detalle: "La app funciona sin cada integración salvo el almacén: sin Codeoscopic → mock; sin Resend → sin correos; sin Retell/Bland → sin llamada; sin ManyChat → sin WhatsApp; sin Turnstile → solo rate-limit. Lo único que NO admite modo degradado sano en prod es el almacén (memoria = pérdida de datos)." },
];

export type ExternalService = { servicio: string; para: string; credencial: string };
export const EXTERNAL_SERVICES: ExternalService[] = [
  { servicio: "Codeoscopic (Integra / Avant2)", para: "Motor de tarificación real de salud + widget AvantProductForm (iframe)", credencial: "client_id, client_secret, X-Client-App, base URL y OAuth URL (soporteapi@codeoscopic.com)" },
  { servicio: "ManyChat", para: "WhatsApp bidireccional (funnel entrante + sync saliente)", credencial: "API token, flows (flow_ns), secreto x-manychat-secret" },
  { servicio: "Retell AI o Bland.ai", para: "Llamada de voz saliente automática (elegir uno)", credencial: "API key + agent/pathway id + número emisor + secreto de webhook" },
  { servicio: "Meta (Facebook)", para: "Pixel cliente + Conversions API server-side", credencial: "Token CAPI + ID de píxel (en admin)" },
  { servicio: "Resend", para: "Email transaccional (verificación, resúmenes, OTP)", credencial: "API key + dominio verificado para EMAIL_FROM" },
  { servicio: "Tremendous", para: "Pago de bonos de referidos (Amazon eGift 20€)", credencial: "API key + funding source id (+ campaña opcional)" },
  { servicio: "Cloudflare Turnstile", para: "CAPTCHA en formularios que disparan llamadas", credencial: "Site key + secret" },
  { servicio: "Google Tag Manager / GA", para: "Analítica cliente", credencial: "Contenedor GTM (ID en admin/analitica)" },
  { servicio: "Google Sheets (Apps Script Web App)", para: "Informe \"Leads ManyChat\" (lee el DASHBOARD de la hoja maestra en vivo, solo lectura)", credencial: "Web App /exec publicado en la hoja + secreto compartido (SHEETS_WEBAPP_URL / _SECRET)" },
];

export type ChecklistPhase = { fase: string; items: string[] };
export const MIGRATION_CHECKLIST: ChecklistPhase[] = [
  { fase: "1. Servidor", items: ["Node 20 LTS + npm; clonar repo; npm ci.", "Proceso gestionado (systemd/PM2) para next start; reverse proxy (nginx/Caddy) con TLS y proxy_read_timeout ≥ 65s."] },
  { fase: "2. Almacén (lo primero y más crítico)", items: ["Decidir Upstash gestionado (recomendado) o Redis propio + proxy REST con soporte EVAL.", "EXPORTAR los datos del KV actual e IMPORTARLOS al nuevo (todas las claves lead:*, idx:*, *:index, products:all, etc.).", "Verificar con /admin/integraciones → «Probar conexión» (round-trip real de escritura+lectura)."] },
  { fase: "3. Variables de entorno", items: ["Almacén + NEXT_PUBLIC_SITE_URL.", "Generar secretos (openssl rand -base64 32): ADMIN_TOKEN, *_SESSION_SECRET, *_TOKEN_SECRET, SITE_ACCESS_SECRET, CRON_SECRET, MANYCHAT_WEBHOOK_SECRET, BLAND_WEBHOOK_SECRET.", "⚠️ Si ya había sesiones/enlaces firmados en producción, REUSAR los mismos secretos que en Vercel para no invalidar cookies ni enlaces ya emitidos.", "Integraciones que se quieran activas (CODESCOPIC_*, RESEND, MANYCHAT, RETELL/BLAND, META_CAPI, TURNSTILE, VAPID, TREMENDOUS)."] },
  { fase: "4. Build y arranque", items: ["npm run typecheck → npm run build → npm run start.", "Confirmar que el middleware corre bien en Node (gate de acceso, cabeceras COOP/CORP en /api/*)."] },
  { fase: "5. Crons del sistema", items: ["Dos entradas (retención 03:00 UTC, referidos 04:00 UTC) con Authorization: Bearer $CRON_SECRET.", "Probar a mano que devuelven { ok: true } y no 401/503."] },
  { fase: "6. DNS / dominio", items: ["Apuntar el dominio real al servidor; TLS válido (el sitio fuerza HSTS preload).", "NEXT_PUBLIC_SITE_URL debe coincidir exactamente con el dominio servido."] },
  { fase: "7. Reapuntar webhooks entrantes", items: ["Retell → /api/retell/webhook; Bland → /api/bland/webhook; ManyChat (External Requests) → /api/manychat/*.", "Meta CAPI: verificar dominio si aplica. Estos endpoints están exentos del gate global y del CSRF por diseño."] },
  { fase: "8. Verificación funcional", items: ["Tarificar salud de punta a punta (precios reales, no mock).", "Login de agente (2FA por email → requiere Resend), sesión de cliente, enlace firmado de WhatsApp.", "Generar un PDF, un referido (opt-in) y un push de prueba; ejecutar los 2 crons a mano y revisar el registro de auditoría."] },
];
