// 5 mensajes preformateados para el seguimiento de presupuestos desde admin,
// uno por etapa del pipeline. Los campos dinámicos se rellenan con los datos
// del presupuesto/lead; si falta algún dato, la plantilla se degrada con
// naturalidad (sin dejar huecos raros en el texto).

export type WaTemplateCtx = {
  nombre: string;
  producto: string; // "salud" | "vida"
  precioAprox: number | null;
  quoteNumber: string;
  compania?: string;
  precioElegido?: number | null;
  status: string; // estado del presupuesto, para preseleccionar la plantilla
};

function primerNombre(nombre: string) {
  return nombre.trim().split(/\s+/)[0] || "";
}

function seguro(producto: string) {
  return producto === "vida" ? "seguro de vida" : "seguro de salud";
}

export type WaTemplate = {
  key: string;
  label: string; // etapa a la que corresponde, se muestra en el selector
  build: (ctx: WaTemplateCtx) => string;
};

export const WHATSAPP_TEMPLATES: WaTemplate[] = [
  {
    key: "nuevo",
    label: "Primer contacto (nuevo)",
    build: (c) => {
      const nombre = primerNombre(c.nombre);
      const saludo = nombre ? `Hola ${nombre},` : "Hola,";
      const precio = c.precioAprox != null ? ` (desde ${Math.round(c.precioAprox)} €/mes orientativo)` : "";
      return `${saludo} soy tu asesor de Asegurados Ventajon. Vi que acabas de calcular tu presupuesto de ${seguro(c.producto)}${precio}, nº ${c.quoteNumber}. ¿Tienes 5 minutos para que te ayude a confirmarlo sin compromiso?`;
    },
  },
  {
    key: "en_seguimiento",
    label: "Seguimiento",
    build: (c) => {
      const nombre = primerNombre(c.nombre);
      const saludo = nombre ? `Hola ${nombre},` : "Hola,";
      return `${saludo} te escribo para saber si pudiste ver tu presupuesto de ${seguro(c.producto)} (nº ${c.quoteNumber}). ¿Te ayudo a resolver alguna duda o prefieres que te llame?`;
    },
  },
  {
    key: "enviado",
    label: "Presupuesto enviado",
    build: (c) => {
      const nombre = primerNombre(c.nombre);
      const saludo = nombre ? `Hola ${nombre},` : "Hola,";
      const compania = c.compania ? ` con ${c.compania}` : "";
      const precio = c.precioElegido != null ? ` a ${Math.round(c.precioElegido)} €/mes` : c.precioAprox != null ? ` desde ${Math.round(c.precioAprox)} €/mes` : "";
      return `${saludo} te adjunto tu presupuesto de ${seguro(c.producto)}${compania}${precio} (nº ${c.quoteNumber}). Échale un vistazo con calma, cualquier duda me escribes.`;
    },
  },
  {
    key: "negociando",
    label: "Negociando",
    build: (c) => {
      const nombre = primerNombre(c.nombre);
      const saludo = nombre ? `Hola ${nombre},` : "Hola,";
      return `${saludo} sobre tu presupuesto de ${seguro(c.producto)} (nº ${c.quoteNumber}), ¿qué te parece si ajustamos las coberturas para mejorar el precio? Cuéntame qué es lo más importante para ti y te preparo una alternativa.`;
    },
  },
  {
    key: "cierre",
    label: "Cierre (ganado / perdido)",
    build: (c) => {
      const nombre = primerNombre(c.nombre);
      const saludo = nombre ? `${nombre},` : "Hola,";
      const compania = c.compania ? ` con ${c.compania}` : "";
      return `¡Enhorabuena ${saludo.replace(",", "")}! Ya tienes tu ${seguro(c.producto)}${compania} en marcha (presupuesto nº ${c.quoteNumber}). Cualquier gestión que necesites, aquí estoy. — Si prefieres dejarlo por ahora, sin problema: cuando quieras retomarlo, aquí me tienes.`;
    },
  },
];

export function templateForStatus(status: string): WaTemplate {
  const map: Record<string, string> = {
    nuevo: "nuevo",
    en_seguimiento: "en_seguimiento",
    enviado: "enviado",
    negociando: "negociando",
    ganado: "cierre",
    perdido: "cierre",
  };
  const key = map[status] ?? "nuevo";
  return WHATSAPP_TEMPLATES.find((t) => t.key === key) ?? WHATSAPP_TEMPLATES[0];
}

export function waMeUrl(telefono: string, text: string) {
  const digits = telefono.replace(/\D/g, "");
  const withCountry = digits.startsWith("34") ? digits : `34${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}

export function waWebUrl(telefono: string, text: string) {
  const digits = telefono.replace(/\D/g, "");
  const withCountry = digits.startsWith("34") ? digits : `34${digits}`;
  return `https://web.whatsapp.com/send?phone=${withCountry}&text=${encodeURIComponent(text)}`;
}
