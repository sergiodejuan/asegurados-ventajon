"use client";

import { useEffect, useState } from "react";
import { getAvailability } from "@/lib/availability";

// Se calcula en el cliente (depende de la hora actual): en el primer render
// de servidor no se muestra nada, para no arriesgar un desajuste de hidratación.
export function AvailabilityBadge({ className = "" }: { className?: string }) {
  const [state, setState] = useState<{ open: boolean; message: string } | null>(null);

  useEffect(() => {
    setState(getAvailability());
    const id = setInterval(() => setState(getAvailability()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!state) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill border border-hair bg-white px-3 py-1.5 text-[12px] font-semibold text-ink ${className}`}>
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${state.open ? "bg-emerald-500" : "bg-slate2/50"}`} />
      {state.message}
    </span>
  );
}
