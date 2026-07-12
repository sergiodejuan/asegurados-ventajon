"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "./icons";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function formatLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

export function DatePicker({
  value, onChange, minDate,
}: {
  value?: string; onChange: (iso: string) => void; minDate?: Date;
}) {
  const min = startOfDay(minDate ?? new Date());
  const initial = value ? new Date(value + "T00:00:00") : min;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const first = new Date(viewYear, viewMonth, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];

  const canGoPrev = new Date(viewYear, viewMonth, 1) > new Date(min.getFullYear(), min.getMonth(), 1);

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <div className="rounded-card border border-hair bg-white p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => changeMonth(-1)} disabled={!canGoPrev} aria-label="Mes anterior"
          className="grid h-8 w-8 place-items-center rounded-full text-navy transition-colors hover:bg-mist disabled:pointer-events-none disabled:opacity-30">
          <ChevronLeft width={18} height={18} />
        </button>
        <p className="text-[14px] font-bold capitalize text-navy">{MESES[viewMonth]} {viewYear}</p>
        <button type="button" onClick={() => changeMonth(1)} aria-label="Mes siguiente"
          className="grid h-8 w-8 place-items-center rounded-full text-navy transition-colors hover:bg-mist">
          <ChevronRight width={18} height={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate2">
        {DIAS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`empty-${i}`} aria-hidden="true" />;
          const iso = toISO(d);
          const disabled = d < min;
          const selected = value === iso;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={formatLong(iso)}
              onClick={() => onChange(iso)}
              className={`aspect-square rounded-lg text-[13px] font-semibold tnums transition-colors ${
                selected
                  ? "bg-navy text-white"
                  : disabled
                  ? "text-slate2/30"
                  : "text-ink hover:bg-mist"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {value && (
        <p className="mt-3 text-[13px] font-medium text-navy">Elegido: {formatLong(value)}</p>
      )}
    </div>
  );
}
