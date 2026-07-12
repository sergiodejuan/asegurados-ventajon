// Disponibilidad real de asesores, derivada de un horario configurado (no
// texto libre): evita parsear CONTACT_HOURS y da un mensaje honesto tipo
// "disponible ahora" / "te llamamos mañana a las 9:00".
//
// ⚠️ Debe reflejar el horario real. Si CONTACT_HOURS (lib/brand.ts) cambia,
// actualiza también BUSINESS_HOURS aquí.

export const BUSINESS_HOURS = {
  timeZone: "Atlantic/Canary",
  days: [1, 2, 3, 4, 5] as number[], // lunes(1)…viernes(5); domingo=0
  startHour: 9,
  endHour: 20,
};

const DAY_LABELS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function nowInZone(tz: string): { day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")!.value;
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = Number(parts.find((p) => p.type === "hour")!.value) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")!.value);
  return { day: dayMap[weekday], hour, minute };
}

export function getAvailability(): { open: boolean; message: string } {
  const { day, hour, minute } = nowInZone(BUSINESS_HOURS.timeZone);
  const minutesNow = hour * 60 + minute;
  const startMin = BUSINESS_HOURS.startHour * 60;
  const endMin = BUSINESS_HOURS.endHour * 60;
  const isBusinessDay = BUSINESS_HOURS.days.includes(day);

  if (isBusinessDay && minutesNow >= startMin && minutesNow < endMin) {
    return { open: true, message: "Asesores disponibles ahora" };
  }

  const startHourStr = `${String(BUSINESS_HOURS.startHour).padStart(2, "0")}:00`;
  const isBeforeOpenToday = isBusinessDay && minutesNow < startMin;
  if (isBeforeOpenToday) {
    return { open: false, message: `Te llamamos hoy a las ${startHourStr}` };
  }

  let nextDay = day;
  let daysAhead = 0;
  do {
    nextDay = (nextDay + 1) % 7;
    daysAhead++;
  } while (!BUSINESS_HOURS.days.includes(nextDay));

  const label = daysAhead === 1 ? "mañana" : `el ${DAY_LABELS[nextDay]}`;
  return { open: false, message: `Te llamamos ${label} a las ${startHourStr}` };
}
