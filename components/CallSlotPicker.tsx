"use client";

import { useEffect, useState } from "react";

export type CallSlot = { fecha: string; turno: "Mañana" | "Tarde" };
type Availability = { fecha: string; dayKey: string; label: string; manana: boolean; tarde: boolean };

// Selector de "cuándo te llamamos": los próximos días laborables (máximo 3)
// que devuelva /api/agenda/disponibilidad, con sus turnos de mañana/tarde —
// ya viene filtrado por la disponibilidad real del equipo, así que aquí solo
// hay que pintarlo y dejar elegir.
export function CallSlotPicker({ value, onChange }: { value: CallSlot | null; onChange: (v: CallSlot) => void }) {
  const [slots, setSlots] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(value?.fecha ?? null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/agenda/disponibilidad");
        const body = await res.json();
        if (cancelled) return;
        if (res.ok && body.ok) {
          setSlots(body.slots);
          const firstAvailable = (body.slots as Availability[]).find((s) => s.manana || s.tarde);
          if (!value && firstAvailable) setSelectedDay(firstAvailable.fecha);
        }
      } catch { /* se ofrece "cuando sea" más abajo si esto falla */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const day = slots.find((s) => s.fecha === selectedDay);

  function pickDay(fecha: string) {
    setSelectedDay(fecha);
  }
  function pickTurno(turno: "Mañana" | "Tarde") {
    if (!selectedDay) return;
    onChange({ fecha: selectedDay, turno });
  }

  if (loading) return <p className="text-[13px] text-slate2">Cargando disponibilidad…</p>;

  const hayHuecos = slots.some((s) => s.manana || s.tarde);
  if (!hayHuecos) {
    return <p className="text-[13px] text-slate2">No tenemos huecos libres en los próximos días — te llamamos en cuanto podamos.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Elige el día">
        {slots.map((s) => {
          const disabled = !s.manana && !s.tarde;
          return (
            <button
              key={s.fecha} type="button" disabled={disabled} aria-pressed={selectedDay === s.fecha}
              onClick={() => pickDay(s.fecha)}
              className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors ${
                disabled ? "cursor-not-allowed border-hair bg-mist text-slate2/60"
                  : selectedDay === s.fecha ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {day && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Elige el turno">
          {(["Mañana", "Tarde"] as const).map((t) => {
            const disponible = t === "Mañana" ? day.manana : day.tarde;
            const selected = value?.fecha === day.fecha && value?.turno === t;
            return (
              <button
                key={t} type="button" disabled={!disponible} aria-pressed={selected}
                onClick={() => pickTurno(t)}
                className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  !disponible ? "cursor-not-allowed border-hair bg-mist text-slate2/60"
                    : selected ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"
                }`}
              >
                {t}{!disponible ? " (completo)" : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
