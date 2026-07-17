type Nps = { score: number; comentario: string; createdAt: string } | null;

function categoryLabel(score: number): { label: string; color: string } {
  if (score >= 9) return { label: "Promotor", color: "bg-emerald-100 text-emerald-700" };
  if (score >= 7) return { label: "Pasivo", color: "bg-amber-100 text-amber-700" };
  return { label: "Detractor", color: "bg-brand-red/10 text-brand-red-deep" };
}

// Respuesta a la encuesta de satisfacción (0-10) enviada al cerrar la
// llamada o ganar el presupuesto — mismo bloque en ambas fichas de detalle.
export function NpsCard({ nps }: { nps: Nps }) {
  return (
    <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
      <p className="text-[13px] font-semibold text-ink">Satisfacción del cliente</p>
      {nps ? (
        <>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[26px] font-extrabold tnums text-navy">{nps.score}</span>
            <span className="text-[13px] text-slate2">/10</span>
            <span className={`ml-1 rounded-pill px-2.5 py-1 text-[11px] font-bold ${categoryLabel(nps.score).color}`}>
              {categoryLabel(nps.score).label}
            </span>
          </div>
          {nps.comentario && <p className="mt-2 text-[13px] leading-relaxed text-ink">&ldquo;{nps.comentario}&rdquo;</p>}
        </>
      ) : (
        <p className="mt-1.5 text-[12px] text-slate2">El cliente todavía no ha respondido a la encuesta.</p>
      )}
    </div>
  );
}
