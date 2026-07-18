import { IconByName } from "./icons";
import type { Promotion } from "@/lib/promotions";

// Tarjeta del listado /promociones: foto a sangre con degradado oscuro y
// titular/CTA superpuestos en blanco, al estilo de la referencia (Línea
// Directa). Toda la tarjeta es un único enlace, a diferencia de PostCard,
// porque aquí no hay una franja de texto aparte donde poner un segundo enlace.
export function PromotionCard({ promo }: { promo: Promotion }) {
  return (
    <li className="overflow-hidden rounded-[20px] shadow-soft">
      <a href={`/promociones/${promo.slug}`} className="group relative block h-64 w-full overflow-hidden bg-navy-deep">
        {promo.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={promo.imagenUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-navy to-navy-deep text-white/70">
            <IconByName name="shield" width={40} height={40} />
          </div>
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          {promo.categoria && (
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">{promo.categoria}</p>
          )}
          <p className="mt-1 max-w-xs text-[19px] font-extrabold leading-snug text-white">{promo.tituloTarjeta}</p>
          {promo.validoHasta && <p className="mt-1.5 text-[12px] text-white/80">{promo.validoHasta}</p>}
          <span className="mt-4 inline-flex items-center justify-center rounded-pill bg-white px-5 py-2.5 text-[13px] font-semibold text-ink transition-colors group-hover:bg-white/90">
            Ver promoción
          </span>
        </div>
      </a>
    </li>
  );
}
