import { WORK_DAYS, type WorkDay } from "./crm";

// Franjas horarias genéricas de referencia (coherentes con CONTACT_HOURS,
// 9:00–20:00) — se usan solo para descartar un turno de HOY si ya ha
// pasado, no para fijar el horario real de cada agente (eso vive en su
// propia disponibilidad).
const TURNO_CUTOFF_HOUR: Record<"manana" | "tarde", number> = { manana: 14, tarde: 20 };

const DOW_TO_WORKDAY: WorkDay[] = ["lunes", "martes", "miercoles", "jueves", "viernes"]; // getDay() 1..5

export type BusinessDay = { fecha: string; dayKey: WorkDay; label: string };

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Próximos N días laborables (lunes a viernes, sin festivos por ahora),
// empezando por HOY si aún queda algún turno útil, o mañana si no.
export function nextBusinessDays(count: number, from: Date = new Date()): BusinessDay[] {
  const out: BusinessDay[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  let first = true;
  while (out.length < count) {
    const dow = cursor.getDay(); // 0 domingo .. 6 sábado
    if (dow >= 1 && dow <= 5) {
      const isToday = first && cursor.toDateString() === new Date(from).toDateString();
      if (!(isToday && from.getHours() >= TURNO_CUTOFF_HOUR.tarde)) {
        out.push({ fecha: toISODate(cursor), dayKey: DOW_TO_WORKDAY[dow - 1], label: cursor.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }) });
      }
    }
    first = false;
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Si el día es HOY, ¿ya ha pasado la hora de corte de ese turno?
export function turnoYaPaso(fecha: string, turno: "manana" | "tarde", now: Date = new Date()): boolean {
  const today = toISODate(now);
  if (fecha !== today) return false;
  return now.getHours() >= TURNO_CUTOFF_HOUR[turno];
}

export { WORK_DAYS };
