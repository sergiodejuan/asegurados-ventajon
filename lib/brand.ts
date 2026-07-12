/**
 * Configuración central de marca y contenido.
 *
 * ⚠️ DECISIÓN PENDIENTE (Sergio): el nombre.
 * Memoria de marca: «Asegurados Ventajon» (sin tilde). Estrategia: «Asegurados Ventajón».
 * Por defecto SIN tilde. Cambia solo esta línea si Gabriel confirma la forma acentuada.
 */
export const BRAND_NAME = "Asegurados Ventajon";

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "34600000000";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export const CONTACT_HOURS =
  process.env.NEXT_PUBLIC_CONTACT_HOURS ?? "L–V · 9:00–20:00 (hora canaria)";

/* ------------------------- Números desde los que llamamos -----------------
 * Se muestran en la página de gracias para que el usuario los reconozca, los
 * guarde y no tome la llamada por spam.
 * ⚠️ PENDIENTE (Sergio): sustituir por los números REALES de la centralita.
 * Recordatorio: desde octubre 2026 las llamadas comerciales requieren
 * numeración 400 + solicitud previa. Configúralos con las env
 * NEXT_PUBLIC_CALLER_1 / NEXT_PUBLIC_CALLER_2 antes de publicar.
 */
export const CALLER_NUMBERS = [
  { label: "Asesoría Asegurados", number: process.env.NEXT_PUBLIC_CALLER_1 ?? "+34 928 000 000" },
  { label: "Línea alternativa", number: process.env.NEXT_PUBLIC_CALLER_2 ?? "+34 971 000 000" },
];

export const PARTNERS = ["Mapfre", "Adeslas", "Asisa", "Zurich", "Generali"];
export const ECOSYSTEM_MEMBERS = "350.000 socios";

// Datos de confianza reales (sin inventar cifras): reutilizados en la home y
// en los bloques de prueba social del tarificador.
export const TRUST_STATS = [
  { value: ECOSYSTEM_MEMBERS, label: "en el ecosistema Ventajon" },
  { value: String(PARTNERS.length), label: "aseguradoras líderes comparadas" },
  { value: "0 €", label: "coste de comparar, siempre" },
  { value: "100 %", label: "online, sin desplazamientos" },
];

// El catálogo de compañías/precios de la comparativa vive en lib/catalog.ts
// (editable desde /admin/productos), no aquí.

/* -------------------------- Banner de promoción ---------------------------
 * Estilo del reclamo de la referencia (recuadro mint + claim + "ver bases").
 * ⚠️ SIN precios ni % de descuento sin validación de Gabriel. Cuando haya una
 * promo aprobada, cámbiala aquí (headline/sub/badge) y punto.
 */
export const PROMO = {
  badge: "Comparativa gratis",
  headline: "Tu seguro de salud, elegido con cabeza",
  sub: "Comparamos entre las mejores compañías para que pagues lo justo.",
  legalNote: "Sujeto a condiciones.",
  // Contenido del modal "Ver condiciones" (no navega, se abre en la misma página).
  // ⚠️ Texto provisional: pendiente de redacción/validación legal definitiva.
  conditions: [
    "La comparativa y el asesoramiento son gratuitos y sin ningún compromiso de contratación.",
    "El precio final depende del perfil de cada persona a asegurar (edad, coberturas, código postal…) y de la compañía elegida.",
    "Somos correduría de seguros: comparamos entre varias compañías, no vendemos un único producto.",
    "Los datos que nos dejas se usan únicamente para preparar tu comparativa y que un asesor te contacte, conforme a nuestra política de privacidad.",
  ],
};

/* ------------------------- Contenido de la landing ------------------------- */

export const VENTAJAS = [
  { icon: "shield", t: "De tu lado", d: "Somos tu asesor, no el vendedor de la compañía." },
  { icon: "compare", t: "Comparamos por ti", d: "Entre las mejores aseguradoras del país." },
  { icon: "doc", t: "Sin letra pequeña", d: "Te explicamos lo que cubre y lo que no, en claro." },
  { icon: "pin", t: "Cerca de ti", d: "Trabajamos en toda España, con cercanía especial en Canarias y Baleares." },
];

export const COBERTURAS = {
  sin: {
    label: "Sin copago",
    title: "Salud sin copago",
    bullets: [
      "Asistencia sanitaria completa con hospitalización.",
      "Amplio cuadro médico y especialistas.",
      "Sin pagar por cada visita: lo llevas todo incluido.",
    ],
  },
  con: {
    label: "Con copago",
    title: "Salud con copago",
    bullets: [
      "Prima mensual más ajustada.",
      "Pequeña aportación solo cuando usas el médico.",
      "Ideal si acudes poco a consulta.",
    ],
  },
};

/* --------------------- Preferencia de horario de llamada ------------------ */
export const DIAS_LLAMADA = ["Cualquier día", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
export const TURNOS_LLAMADA = ["Cualquier turno", "Mañana", "Tarde"];

export const SELLING_POINTS = [
  "Sin coste y sin compromiso.",
  "Un asesor compara por ti entre las mejores compañías.",
  "Te llamamos en tu franja horaria de atención.",
  "Sin trucos, sin letra pequeña.",
];

/* -------------------- Servicios incluidos (comparativa) ------------------- */
// Se muestran cuando el usuario indica que YA tiene seguro, para comparar.
export const SERVICIOS_SALUD = [
  "Hospitalización",
  "Dental",
  "Especialistas",
  "Sin copago",
  "Cobertura internacional",
  "Reembolso de gastos",
];

export const SERVICIOS_VIDA = [
  "Fallecimiento",
  "Invalidez absoluta",
  "Enfermedades graves",
  "Cobertura de hipoteca",
];
