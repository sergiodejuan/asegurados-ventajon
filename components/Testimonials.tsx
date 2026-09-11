import { Star } from "./icons";

export type Testimonial = { name: string; place: string; quote: string };

export const EXAMPLE_TESTIMONIALS: Testimonial[] = [
  { name: "Carmen R.", place: "Las Palmas de Gran Canaria", quote: "Me explicaron las opciones sin prisa y sin venderme nada de más. Se agradece." },
  { name: "Javier M.", place: "Palma de Mallorca", quote: "Comparé con lo que ya tenía y acabé pagando menos por más cobertura." },
  { name: "Ana T.", place: "Santa Cruz de Tenerife", quote: "Todo por teléfono, sin ir a ninguna oficina. Rápido y sin letra pequeña." },
];

// Sin reseñas reales todavía: preferimos decirlo en vez de inventar
// testimonios. En cuanto haya valoraciones verificadas (Google, Trustpilot o
// encuestas propias), esta sección se sustituye por ellas con nombre y
// enlace verificable.
export function Testimonials({
  heading = "Lo que dicen quienes ya han comparado",
  items,
}: {
  heading?: string;
  items?: Testimonial[];
}) {
  if (!items) {
    return (
      <section aria-labelledby="testimonios" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
        <h2 id="testimonios" className="text-[22px] font-extrabold text-navy md:text-[26px]">{heading}</h2>
        <div className="mt-5 rounded-card border border-hair bg-white p-6 shadow-soft md:max-w-xl">
          <p className="text-[15px] font-bold text-ink">Todavía no tenemos aquí tus reseñas</p>
          <p className="mt-2 text-[14px] leading-relaxed text-slate2">
            Preferimos no inventar testimonios. En cuanto tengamos valoraciones verificadas de clientes reales
            (Google, Trustpilot o encuestas propias), las publicamos aquí con nombre y enlace verificable.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="testimonios" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-5xl lg:max-w-6xl">
      <h2 id="testimonios" className="text-[22px] font-extrabold text-navy md:text-[26px]">{heading}</h2>
      <ul className="mt-5 grid gap-4 md:grid-cols-3">
        {items.map((t) => (
          <li key={t.name} className="relative rounded-card border border-hair bg-white p-5 shadow-soft">
            <span className="absolute right-4 top-4 rounded-pill bg-mist px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate2">Ejemplo</span>
            <div className="flex gap-0.5 text-brand-red" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => <Star key={i} />)}
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-ink">&ldquo;{t.quote}&rdquo;</p>
            <p className="mt-3 text-[13px] font-semibold text-navy">{t.name} <span className="font-normal text-slate2">· {t.place}</span></p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] leading-relaxed text-slate2">
        Reseñas de ejemplo mientras recopilamos las de nuestros clientes reales — dinos si prefieres esperar a tenerlas antes de publicar esta sección.
      </p>
    </section>
  );
}
