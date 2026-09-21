// Helpers de formato compartidos por las páginas del panel /admin
// (fichas de lead y de presupuesto usan los mismos datos de tarificador).

export const SUBMISSION_FIELD_LABELS: Record<string, string> = {
  inicio: "Inicio deseado", fechaInicioPersonalizada: "Fecha elegida", codigoPostal: "Código postal",
  numAsegurados: "Personas a asegurar", coberturaDental: "Cobertura dental", motivo: "Motivo",
  fumador: "Fumador", fechaNacimiento: "Fecha de nacimiento", sexo: "Sexo", yaTieneSeguro: "Ya tenía seguro",
  seguroActualImporte: "Pagaba antes", seguroActualPeriodo: "Periodicidad", seguroActualServicios: "Servicios actuales",
  compania: "Compañía de interés", producto: "Producto",
  diaLlamada: "Día preferido", turnoLlamada: "Turno preferido",
  tipoVehiculo: "Tipo de vehículo", matricula: "Matrícula", marcaVehiculo: "Marca", modeloVehiculo: "Modelo",
  anioVehiculo: "Año de matriculación", usoVehiculo: "Uso del vehículo", antiguedadCarnet: "Antigüedad del carnet",
  coberturaDeseada: "Cobertura deseada",
};

export function formatSubmissionValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}

export function fmt(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso)); }
  catch { return iso; }
}

export const PRESUPUESTO_STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-brand-red/10 text-brand-red-deep",
  en_seguimiento: "bg-navy/10 text-navy",
  enviado: "bg-sky-100 text-sky-700",
  negociando: "bg-amber-100 text-amber-700",
  ganado: "bg-emerald-100 text-emerald-700",
  perdido: "bg-slate-200 text-slate-600",
  caducado: "bg-slate-100 text-slate-400",
};
