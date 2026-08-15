"use client";

import { Star } from "@/components/icons";

type Review = {
  autor: string;
  lugar: string;
  estrellas: number;
  texto: string;
};

// Carrusel autoscroll infinito de reseñas de clientes.
// Técnica: duplicamos la lista y animamos translateX del track de 0 a -50%
// (justo el ancho de la primera copia); al llegar al final, la segunda copia
// ocupa exactamente la posición de la primera y el loop es continuo sin
// saltos. Pausa en hover para poder leer una reseña sin que se escape.
export function PaidReviewsCarousel({ title, items }: { title: string; items: Review[] }) {
  if (!items?.length) return null;

  // Segundo pase idéntico para que el loop encadene sin cortes.
  const looped = [...items, ...items];

  // Velocidad: ~6s por tarjeta se lee cómodo sin aburrir. Duplicamos el
  // total porque el track mide 2× (dos pases): 6s * items da la duración
  // percibida de un ciclo, y multiplicar por 2 hace un desplazamiento real
  // de 100% del track (que corresponde a 50% del contenido visible).
  const cycleSeconds = Math.max(24, items.length * 6);

  return (
    <section aria-labelledby="lp-reviews-title" className="mx-auto mt-16 max-w-6xl px-5 md:mt-24">
      <h2 id="lp-reviews-title" className="text-center text-[22px] font-extrabold text-navy md:text-[28px]">{title}</h2>

      {/* Máscara con degradados a los lados para el fade in/out. */}
      <div
        className="relative mt-8 overflow-hidden"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)",
          maskImage:
            "linear-gradient(to right, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)",
        }}
      >
        <div
          className="lp-reviews-track flex w-max gap-5"
          style={{ animationDuration: `${cycleSeconds}s` }}
        >
          {looped.map((r, i) => (
            <article
              key={i}
              aria-hidden={i >= items.length}
              className="w-[85vw] max-w-[360px] shrink-0 rounded-[20px] bg-white p-5 shadow-soft md:w-[340px] md:p-6"
            >
              <div className="flex items-center gap-0.5 text-amber-400" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, s) => (
                  <span key={s} className={s < r.estrellas ? "" : "opacity-25"}>
                    <Star width={16} height={16} />
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-ink md:text-[15px]">&ldquo;{r.texto}&rdquo;</p>
              <p className="mt-4 text-[13px] font-semibold text-navy">{r.autor}</p>
              <p className="text-[12px] text-slate2">{r.lugar}</p>
            </article>
          ))}
        </div>
      </div>

      <style jsx>{`
        .lp-reviews-track {
          animation-name: lpReviewsScroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .lp-reviews-track:hover,
        .lp-reviews-track:focus-within {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-reviews-track {
            animation: none;
          }
        }
        @keyframes lpReviewsScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
