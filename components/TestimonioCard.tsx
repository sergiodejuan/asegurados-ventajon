import { IconByName } from "./icons";
import type { Testimonio } from "@/lib/testimonios";

// Tarjeta del grid de /testimonios, mismo lenguaje visual que PromotionCard
// (foto a sangre + degradado + texto superpuesto) pero con tono emocional:
// nombre de la familia, ubicación y un teaser humano, no un CTA comercial.
export function TestimonioCard({ testimonio }: { testimonio: Testimonio }) {
  return (
    <li className="overflow-hidden rounded-[20px] shadow-soft">
      <a href={`/testimonios/${testimonio.slug}`} className="group relative block h-72 w-full overflow-hidden bg-navy-deep">
        {testimonio.fotoDestacada ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={testimonio.fotoDestacada} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-navy to-navy-deep text-white/70">
            <IconByName name="life" width={40} height={40} />
          </div>
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink from-0% via-ink/85 via-45% to-transparent to-95%" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          {testimonio.ubicacion && (
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">{testimonio.ubicacion}</p>
          )}
          <p className="mt-1 text-[19px] font-extrabold leading-snug text-white">{testimonio.nombre}</p>
          {testimonio.resumen && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/85">{testimonio.resumen}</p>}
          <span className="mt-4 inline-flex items-center justify-center rounded-pill bg-white px-5 py-2.5 text-[13px] font-semibold text-ink transition-colors group-hover:bg-white/90">
            Leer su historia
          </span>
        </div>
      </a>
    </li>
  );
}
