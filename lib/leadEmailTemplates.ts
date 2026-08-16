// Plantillas de correo reutilizables para el envío manual desde la ficha de
// un lead en /admin (ver app/api/admin/leads/[id]/enviar-email y
// components/admin/SendEmailModal.tsx). Mismo patrón de colección editable
// que testimonios/promociones: un documento JSON en el store
// (lib/store.ts), con semilla aditiva de 6 plantillas de partida,
// gestionable desde /admin/configuracion/plantillas-email.
//
// El cuerpo (cuerpoHtml) es HTML simple — el que produce el editor WYSIWYG
// (párrafos, negrita, enlaces, listas) —, sin las tablas con estilos en
// línea que usa lib/comparativaEmail.ts para el correo automático: aquí el
// tono es el de un correo personal de un agente, no una comparativa de
// precios con maquetación de marketing.
//
// El enlace seguro de acceso al presupuesto NO se escribe como variable
// dentro del cuerpo editable: el endpoint de envío lo añade siempre al
// final del correo cuando hay presupuestos asociados (ver §5 del plan), así
// no depende de que el agente conserve intacto un placeholder dentro del
// editor.

export type EmailTemplate = {
  id: string;
  nombre: string;
  asunto: string;
  cuerpoHtml: string;
  createdAt: string;
  updatedAt: string;
};

export type EmailTemplateDraft = Partial<Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">>;

export type EmailVariable = { key: string; label: string; sample: string };

// Catálogo de variables insertables en el editor (asunto y cuerpo). El
// valor real se calcula en el endpoint de envío a partir del lead y (si se
// asoció) el primer presupuesto elegido.
export const EMAIL_VARIABLES: EmailVariable[] = [
  { key: "nombre", label: "Nombre completo", sample: "María García" },
  { key: "primer_nombre", label: "Primer nombre", sample: "María" },
  { key: "producto", label: "Producto", sample: "seguro de salud" },
  { key: "compania", label: "Aseguradora elegida", sample: "Adeslas" },
  { key: "precio", label: "Precio orientativo", sample: "45,90 €/mes" },
  { key: "numero_presupuesto", label: "Nº de presupuesto", sample: "10234" },
  { key: "agente_nombre", label: "Nombre del agente", sample: "Laura" },
];

export function renderEmailTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}

const now = new Date().toISOString();

export const SEED_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "seed-presupuesto-listo",
    nombre: "Presupuesto listo",
    asunto: "{{primer_nombre}}, tu presupuesto de {{producto}} ya está listo",
    cuerpoHtml:
      "<p>Hola {{primer_nombre}},</p>" +
      "<p>Ya tenemos preparado tu presupuesto de {{producto}} con <strong>{{compania}}</strong>, desde <strong>{{precio}}</strong>.</p>" +
      "<p>Justo debajo tienes un enlace seguro para verlo con todo el detalle, cuando quieras.</p>" +
      "<p>Cualquier duda, escríbenos y te ayudamos a decidir sin compromiso.</p>",
    createdAt: now, updatedAt: now,
  },
  {
    id: "seed-seguimiento",
    nombre: "Seguimiento",
    asunto: "¿Seguimos con tu {{producto}}, {{primer_nombre}}?",
    cuerpoHtml:
      "<p>Hola {{primer_nombre}},</p>" +
      "<p>Hace unos días vimos tu interés en un {{producto}}, pero no hemos podido hablar todavía.</p>" +
      "<p>¿Te viene bien que te llamemos, o prefieres que sigamos por aquí? Tu presupuesto sigue disponible en el enlace de abajo.</p>",
    createdAt: now, updatedAt: now,
  },
  {
    id: "seed-antes-de-que-caduque",
    nombre: "Antes de que caduque",
    asunto: "{{primer_nombre}}, tu precio de {{producto}} no está garantizado para siempre",
    cuerpoHtml:
      "<p>Hola {{primer_nombre}},</p>" +
      "<p>Los precios que comparamos contigo para tu {{producto}} pueden variar con el tiempo — las aseguradoras actualizan sus tarifas.</p>" +
      "<p>Si sigue interesándote <strong>{{compania}}</strong> desde {{precio}}, este es un buen momento para confirmarlo. Tienes el enlace a tu presupuesto justo debajo.</p>",
    createdAt: now, updatedAt: now,
  },
  {
    id: "seed-bienvenida",
    nombre: "Bienvenida",
    asunto: "Hola {{primer_nombre}}, gracias por confiar en nosotros",
    cuerpoHtml:
      "<p>Hola {{primer_nombre}},</p>" +
      "<p>Gracias por pedirnos ayuda con tu {{producto}}. Somos correduría independiente: comparamos varias aseguradoras para encontrar la que mejor encaja contigo, sin coste para ti.</p>" +
      "<p>En breve te llamamos para conocer mejor lo que necesitas. Si prefieres adelantarnos algo, responde a este correo.</p>",
    createdAt: now, updatedAt: now,
  },
  {
    id: "seed-otra-comparativa",
    nombre: "Otra comparativa",
    asunto: "{{primer_nombre}}, ¿comparamos también tu otro seguro?",
    cuerpoHtml:
      "<p>Hola {{primer_nombre}},</p>" +
      "<p>Ya que estamos comparando tu {{producto}}, ¿quieres que echemos un vistazo también a algún otro seguro que tengas (auto, decesos, vida)? Muchas veces sale a cuenta revisarlos juntos.</p>" +
      "<p>Contesta a este correo o pide que te llamemos y lo vemos sin compromiso.</p>",
    createdAt: now, updatedAt: now,
  },
  {
    id: "seed-cierre-y-gracias",
    nombre: "Cierre y gracias",
    asunto: "Gracias por confiar en nosotros, {{primer_nombre}}",
    cuerpoHtml:
      "<p>Hola {{primer_nombre}},</p>" +
      "<p>Ya está todo listo con <strong>{{compania}}</strong>. Gracias por confiar en {{agente_nombre}} y en el equipo para encontrar tu {{producto}}.</p>" +
      "<p>Si en el futuro necesitas revisar algo o comparar otro seguro, aquí estamos.</p>",
    createdAt: now, updatedAt: now,
  },
];
