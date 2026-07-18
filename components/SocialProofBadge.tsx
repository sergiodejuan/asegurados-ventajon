import { Star } from "./icons";
import { BRAND_NAME, RATING_VALUE } from "@/lib/brand";

const AVATARS = [
  { initials: "CR", bg: "bg-navy" },
  { initials: "JM", bg: "bg-brand-red" },
  { initials: "AT", bg: "bg-navy-deep" },
];

// Prueba social del hero (avatares + valoración), estilo Línea Directa:
// reutilizada en todas las cabeceras a dos columnas (home, páginas de
// producto, quiénes somos, landings SEO/geo de salud). Solo escritorio: en
// el hero compacto de móvil añadiría ruido sin espacio para respirar.
export function SocialProofBadge() {
  return (
    <div className="mt-5 hidden items-center gap-3 md:flex">
      <div className="flex -space-x-3" aria-hidden="true">
        {AVATARS.map((a) => (
          <span
            key={a.initials}
            className={`grid h-10 w-10 place-items-center rounded-full border-2 border-white text-[12px] font-bold text-white ${a.bg}`}
          >
            {a.initials}
          </span>
        ))}
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5 text-amber-400" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => <Star key={i} />)}
          </div>
          <span className="text-[13px] font-bold tnums text-ink">{RATING_VALUE}</span>
        </div>
        <p className="mt-0.5 text-[13px] font-semibold text-ink">
          Únete a +350.000 clientes que ya confían en {BRAND_NAME}
        </p>
      </div>
    </div>
  );
}
