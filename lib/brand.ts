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

/* -------------------------- Banner de promoción ---------------------------
 * Estilo del reclamo de la referencia (recuadro mint + claim + "ver bases").
 * ⚠️ SIN precios ni % de descuento sin validación de Gabriel. Cuando haya una
 * promo aprobada, cámbiala aquí (headline/sub/badge) y punto.
 */
export const PROMO = {
  badge: "Comparativa gratis",
  headline: "Tu seguro de salud, elegido con cabeza",
  sub: "Comparamos entre las mejores compañías para que pagues lo justo.",
  legalNote: "Sujeto a condiciones.", // enlace "Ver condiciones" → /legal
};

/* ------------------------- Contenido de la landing ------------------------- */

export const VENTAJAS = [
  { icon: "shield", t: "De tu lado", d: "Somos tu asesor, no el vendedor de la compañía." },
  { icon: "compare", t: "Comparamos por ti", d: "Entre las mejores aseguradoras del país." },
  { icon: "doc", t: "Sin letra pequeña", d: "Te explicamos lo que cubre y lo que no, en claro." },
  { icon: "pin", t: "Cerca de ti", d: "Atención personalizada en Canarias y Baleares." },
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

export const OTROS_PRODUCTOS = [
  { icon: "life", t: "Vida", d: "Protege a los tuyos y tu hipoteca. Comparamos por ti.", producto: "vida", href: "/tarificador-vida" },
  { icon: "flower", t: "Decesos", d: "Tranquilidad para tu familia, sin tabúes.", producto: "decesos", href: "/quiero-que-me-llamen?producto=decesos" },
  { icon: "home", t: "Hogar", d: "Tu casa cubierta al mejor precio del mercado.", producto: "hogar", href: "/quiero-que-me-llamen?producto=hogar" },
  { icon: "car", t: "Auto", d: "El coche protegido, pagando lo justo.", producto: "auto", href: "/quiero-que-me-llamen?producto=auto" },
];

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
