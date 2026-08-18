// Árbol de la estructura de la web para el diagrama de cajas de
// /portal-desarrollo (ver components/admin/SiteStructureDiagram.tsx). Sin
// acceso a process.env ni a datos dinámicos: es un mapa de la arquitectura,
// no un listado en vivo — cuando se añada/quite una página real, hay que
// actualizar este árbol a mano (igual que el resto de lib/integrationsCatalog.ts).

export type SiteNodeKind = "grupo" | "pagina" | "tarificador" | "seccion";

export type SiteNode = {
  label: string;
  path?: string;
  kind: SiteNodeKind;
  funcion: string;
  children?: SiteNode[];
};

// -------------------------- Tarificadores (detalle) --------------------------
// Los 4 tipos de tarificador comparten el mismo motor genérico
// (lib/forms.ts + components/StepForm.tsx: un FormConfig con "steps"
// tipados, renderizados por un único componente) — solo cambian los pasos y
// el endpoint al que envían.
const TARIFICADORES: SiteNode[] = [
  {
    label: "Salud", path: "/tarificador", kind: "tarificador",
    funcion: "El único ya preparado para Codescopic: documento (DNI/NIE), apellidos separados, CP real, fumador y asegurados adicionales (fecha nac. + sexo).",
    children: [
      { label: "Fase 1 · Tu seguro", kind: "seccion", funcion: "Inicio deseado, zona (Canarias/Baleares/Península), nº de asegurados." },
      { label: "Fase 2 · Tus datos", kind: "seccion", funcion: "Titular (fecha nac. + sexo), identificación, ¿fuma?, asegurados adicionales, dental, seguro actual." },
      { label: "Fase 3 · Tu precio", kind: "seccion", funcion: "Contacto + consentimientos + Turnstile → envía a POST /api/lead." },
    ],
  },
  {
    label: "Vida", path: "/tarificador-vida", kind: "tarificador",
    funcion: "Motivo del seguro (familia/hipoteca/ahorro), fumador, sin nº de asegurados (es individual).",
    children: [
      { label: "Fase 1 · Tu seguro", kind: "seccion", funcion: "Motivo, zona." },
      { label: "Fase 2 · Tus datos", kind: "seccion", funcion: "Titular, ¿fuma?, seguro actual." },
      { label: "Fase 3 · Tu precio", kind: "seccion", funcion: "Contacto + consentimientos + Turnstile → envía a POST /api/vida." },
    ],
  },
  {
    label: "Auto", path: "/tarificador-auto", kind: "tarificador",
    funcion: "El más largo: vehículo, matrícula, uso, carnet y cobertura fusionados en un único paso para no alargarlo más.",
    children: [
      { label: "Fase 1 · Tu vehículo", kind: "seccion", funcion: "Tipo, matrícula (o marca/modelo/año si no la tiene), uso." },
      { label: "Fase 2 · Tu seguro", kind: "seccion", funcion: "Zona, conductor, carnet + cobertura (mismo paso), seguro actual." },
      { label: "Fase 3 · Tu precio", kind: "seccion", funcion: "Contacto + consentimientos + Turnstile → envía a POST /api/auto." },
    ],
  },
  {
    label: "Decesos", path: "/tarificador-decesos", kind: "tarificador",
    funcion: "Para quién es (uno mismo/familiar/toda la familia); el nº de asegurados solo se pregunta si no es \"para mí\".",
    children: [
      { label: "Fase 1 · Tu seguro", kind: "seccion", funcion: "Para quién, zona, nº de asegurados (condicional)." },
      { label: "Fase 2 · Tus datos", kind: "seccion", funcion: "Titular, seguro actual." },
      { label: "Fase 3 · Tu precio", kind: "seccion", funcion: "Contacto + consentimientos + Turnstile → envía a POST /api/decesos." },
    ],
  },
];

// ------------------------------ Árbol completo ------------------------------
export const SITE_STRUCTURE: SiteNode[] = [
  {
    label: "Sitio público", kind: "grupo",
    funcion: "Todo lo que ve un visitante sin iniciar sesión.",
    children: [
      {
        label: "Home", path: "/", kind: "pagina",
        funcion: "Punto de entrada principal: presenta los 5 productos y dirige a cada tarificador.",
        children: [
          { label: "Hero", kind: "seccion", funcion: "Titular, subtítulo y CTAs configurables desde /admin/diseno/home-hero." },
          { label: "Coverage tabs", kind: "seccion", funcion: "Pestaña por producto (salud/vida/auto/decesos/hogar) con su propio CTA orientado a keyword." },
          { label: "Barra de confianza + Por qué elegirnos", kind: "seccion", funcion: "Argumentario de marca (lib/brand.ts)." },
          { label: "Campaña", kind: "seccion", funcion: "Slides configurables desde /admin/campana." },
          { label: "Testimonios y FAQ", kind: "seccion", funcion: "Prueba social y preguntas frecuentes de la home." },
        ],
      },
      {
        label: "Páginas de producto (5)", kind: "pagina",
        path: "/seguro-de-{salud|vida|auto|decesos|hogar}",
        funcion: "Contenido SEO propio por producto — canonical, OpenGraph y JSON-LD (Service) — con CTA al tarificador correspondiente.",
      },
      {
        label: "Tarificadores (4 tipos)", kind: "pagina",
        funcion: "Formularios multi-paso que capturan el lead. Mismo motor genérico (lib/forms.ts + components/StepForm.tsx), pasos y endpoint distintos por producto.",
        children: TARIFICADORES,
      },
      {
        label: "Comparativa", kind: "pagina", path: "/comparativa",
        funcion: "Resultado del tarificador: comparativa orientativa entre aseguradoras aliadas.",
        children: [
          { label: "Detalle de compañía", path: "/comparativa/[compania]", kind: "seccion", funcion: "Precio, coberturas y botón \"Descargar presupuesto en PDF\" (POST /api/presupuesto/pdf)." },
        ],
      },
      {
        label: "Gracias", path: "/gracias", kind: "pagina",
        funcion: "Página de agradecimiento tras \"quiero que me llamen\"/exit-intent, con cross-sell suave a un segundo producto.",
      },
      {
        label: "Landings SEO geo (2)", path: "/seguro-de-salud-{gran-canaria|lanzarote-fuerteventura}", kind: "pagina",
        funcion: "Contenido único por zona (no plantilla genérica) para evitar canibalización SEO entre ellas y con la página de producto.",
      },
      {
        label: "Landings SEO de captación (5)", kind: "pagina",
        path: "/seguro-de-salud-{barato|barato-sin-copagos|las-palmas|mallorca|tenerife}",
        funcion: "No enlazadas en el menú (se llega por buscadores) — incluyen una calculadora de ahorro embebida (POST /api/calculadora-ahorro).",
      },
      {
        label: "Contenido editorial", kind: "pagina",
        funcion: "Gestionado desde el panel admin (Blog, Promociones, Testimonios).",
        children: [
          { label: "Actualidad (blog)", path: "/actualidad, /actualidad/[slug]", kind: "seccion", funcion: "Artículos gestionados en /admin/blog." },
          { label: "Promociones", path: "/promociones, /promociones/[slug]", kind: "seccion", funcion: "Ofertas gestionadas en /admin/promociones." },
          { label: "Testimonios", path: "/testimonios, /testimonios/[slug]", kind: "seccion", funcion: "Reseñas gestionadas en /admin/testimonios." },
        ],
      },
      {
        label: "Área de cliente", path: "/area-cliente", kind: "pagina",
        funcion: "El propio lead consulta/actualiza sus datos sin registro, identificado por cookie de sesión (ver /api/client/*).",
        children: [
          { label: "Verificación", path: "/area-cliente/verificar", kind: "seccion", funcion: "Canjea el enlace de un solo uso (email/WhatsApp) por una sesión." },
        ],
      },
      {
        label: "Otras páginas", kind: "pagina",
        path: "/quienes-somos · /preguntas-frecuentes · /recursos-seguros-canarias-baleares · /mes-gratis · /quiero-que-me-llamen · /legal · /valoracion/[id]",
        funcion: "Páginas de apoyo: institucional, FAQ, guías descargables, captación ligera y encuesta NPS post-llamada/presupuesto.",
      },
    ],
  },
  {
    label: "Panel de administración", path: "/admin", kind: "grupo",
    funcion: "CRM interno del equipo, protegido por ADMIN_TOKEN o cuenta de agente con permisos por módulo.",
    children: [
      { label: "Ventas", kind: "pagina", path: "/admin, /admin/presupuestos, /admin/llamadas, /admin/tareas", funcion: "Leads, presupuestos, \"quiero que me llamen\" y tareas del equipo." },
      { label: "Contenido", kind: "pagina", path: "/admin/blog, /admin/testimonios, /admin/promociones, /admin/exit-intents", funcion: "Blog, testimonios, promociones/campaña y exit-intent de la web general." },
      { label: "Productos", path: "/admin/productos", kind: "pagina", funcion: "Catálogo de precios aproximados por producto/compañía." },
      { label: "Diseño (8 secciones)", path: "/admin/diseno/*", kind: "pagina", funcion: "Colores, tipografías, logos, portadas, aseguradoras, loader, hero de home y widget de auto." },
      { label: "Integraciones", path: "/admin/integraciones/*", kind: "pagina", funcion: "Codescopic, API propia y webhooks — documentación, estado real y pruebas de conexión." },
      { label: "Analítica", kind: "pagina", path: "/admin/informes, /admin/utm", funcion: "Informes del negocio y seguimiento de campañas UTM." },
      { label: "Configuración", kind: "pagina", path: "/admin/configuracion/*, /admin/rgpd", funcion: "Cookies, seguimiento (GTM/GA4), accesibilidad y RGPD." },
      { label: "Equipo", kind: "pagina", path: "/admin/agentes, /admin/permisos, /admin/registro", funcion: "Altas de agentes, su matriz de permisos por módulo y el registro de auditoría." },
    ],
  },
  {
    label: "Portal de desarrollo", path: "/portal-desarrollo", kind: "grupo",
    funcion: "Esta página: documentación técnica de onboarding, no enlazada en ningún menú, protegida por el permiso \"desarrollador\".",
  },
];
