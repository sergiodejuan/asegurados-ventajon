import { VENTAJAS, TRUST_STATS } from "@/lib/brand";
import { IconByName, Star } from "./icons";
import { EXAMPLE_TESTIMONIALS } from "./Testimonials";

export type SidebarStage = "ventajas" | "reviews" | "social";

// Cada dos pasos del tarificador cambia el contenido de prueba social del
// bloque izquierdo, para que se sienta vivo sin distraer del formulario.
export function stageForStep(idx: number): SidebarStage {
  if (idx < 2) return "ventajas";
  if (idx < 4) return "reviews";
  return "social";
}

export function TarificadorSidebarCards({ stage }: { stage: SidebarStage }) {
  return (
    <div key={stage} className="motion-safe:animate-fade-up">
      {stage === "ventajas" && (
        <div className="grid grid-cols-2 gap-3">
          {VENTAJAS.map((v) => (
            <div key={v.t} className="rounded-card border border-hair bg-white p-4 shadow-soft">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                <IconByName name={v.icon} width={18} height={18} />
              </span>
              <p className="mt-3 text-[15px] font-bold text-ink">{v.t}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-slate2">{v.d}</p>
            </div>
          ))}
        </div>
      )}

      {stage === "reviews" && (
        <div className="flex flex-col gap-3">
          {EXAMPLE_TESTIMONIALS.slice(0, 2).map((t) => (
            <div key={t.name} className="relative rounded-card border border-hair bg-white p-4 shadow-soft">
              <span className="absolute right-4 top-4 rounded-pill bg-mist px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate2">Ejemplo</span>
              <div className="flex gap-0.5 text-brand-red" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => <Star key={i} />)}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-2 text-[12px] font-semibold text-navy">{t.name} <span className="font-normal text-slate2">· {t.place}</span></p>
            </div>
          ))}
        </div>
      )}

      {stage === "social" && (
        <div className="rounded-card border border-hair bg-white p-5 shadow-soft">
          <p className="text-[14px] font-bold text-navy">Miles de personas ya han comparado con nosotros</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {TRUST_STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-[20px] font-extrabold tnums text-navy">{s.value}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-slate2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
