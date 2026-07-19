import { Header } from "./Header";
import { Footer } from "./Footer";
import { StickyMobileCta } from "./StickyMobileCta";
import { TestimonioCard } from "./TestimonioCard";
import { ScrollReveal } from "./ScrollReveal";
import { ReadingProgressBar } from "./ReadingProgressBar";
import { WhatsApp } from "./icons";
import { SITE_URL } from "@/lib/brand";
import { withTestimonioUtm, type Testimonio, type TestimonioCapitulo } from "@/lib/testimonios";
import { otherTestimonios } from "@/lib/store";

// Reparte los capítulos del relato en grupos (uno por foto de galería + un
// grupo final), para intercalar cada foto entre bloques de texto en vez de
// amontonarlas todas juntas o dejarlas sueltas al final.
function chunkEvenly<T>(items: T[], parts: number): T[][] {
  if (parts <= 1 || items.length === 0) return [items];
  const size = Math.ceil(items.length / parts);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function ChapterBlock({ capitulo, index }: { capitulo: TestimonioCapitulo; index: number }) {
  const parrafos = capitulo.texto.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <ScrollReveal className="mx-auto max-w-2xl px-5 py-10 md:py-14">
      <span aria-hidden="true" className="mb-3 block text-[13px] font-bold uppercase tracking-wide text-brand-red">
        {String(index + 1).padStart(2, "0")}
      </span>
      {capitulo.titulo && (
        <h2 className="text-[22px] font-extrabold leading-tight text-navy md:text-[28px]">{capitulo.titulo}</h2>
      )}
      <div className="mt-4 flex flex-col gap-4">
        {parrafos.map((p, i) => (
          <p key={i} className="text-[16px] leading-relaxed text-ink md:text-[17px]">{p}</p>
        ))}
      </div>
    </ScrollReveal>
  );
}

function GalleryPhoto({ src }: { src: string }) {
  return (
    <ScrollReveal>
      <div className="mx-auto max-w-4xl px-5 py-6 md:py-10">
        <div className="overflow-hidden rounded-[24px] bg-mist">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-[280px] w-full object-cover md:h-[440px]" />
        </div>
      </div>
    </ScrollReveal>
  );
}

// Página propia de una historia ("/testimonios/[slug]"): scrollytelling
// emocional (fondo claro, tipografía editorial, fotos a página completa entre
// capítulos con micro-animaciones de scroll) — deliberadamente menos
// "comercial" que una landing de producto, aunque termina en un CTA real y en
// el grid de más historias, igual que hace /promociones.
export async function TestimonioStoryPage({ testimonio }: { testimonio: Testimonio }) {
  const related = await otherTestimonios(testimonio.id);
  const ctaHref = withTestimonioUtm(testimonio.ctaHref, testimonio.slug);
  const llamadmeHref = withTestimonioUtm(
    `/quiero-que-me-llamen${testimonio.producto ? `?producto=${testimonio.producto}` : ""}`,
    testimonio.slug
  );
  const pageUrl = `${SITE_URL}/testimonios/${testimonio.slug}`;
  const galeria = testimonio.galeria.filter(Boolean);
  const grupos = chunkEvenly(testimonio.capitulos, galeria.length + 1);

  return (
    <>
      <ReadingProgressBar />
      <Header crumbs={[{ label: "Testimonios", href: "/testimonios" }, { label: testimonio.nombre }]} />
      <main id="contenido">
        {/* Hero a sangre: foto + nombre/ubicación + cita destacada, tono
            editorial (no tarjeta flotante de venta como en promociones). */}
        <section className="relative h-[70vh] min-h-[420px] w-full overflow-hidden bg-navy-deep">
          {testimonio.fotoDestacada ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={testimonio.fotoDestacada} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-navy to-navy-deep" />
          )}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink from-0% via-ink/70 via-50% to-ink/10 to-100%" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-14">
            <div className="mx-auto max-w-3xl">
              {testimonio.ubicacion && (
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/75">{testimonio.ubicacion}</p>
              )}
              <h1 className="mt-2 font-display text-[32px] font-extrabold leading-[1.1] text-white md:text-[48px]">
                {testimonio.nombre}
              </h1>
              {testimonio.cita && (
                <p className="mt-5 max-w-xl text-[18px] font-medium italic leading-relaxed text-white/90 md:text-[21px]">
                  “{testimonio.cita}”
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Narrativa: capítulos + fotos de galería intercaladas */}
        <div className="bg-white">
          {grupos.map((grupo, gi) => (
            <div key={gi}>
              {grupo.map((cap, ci) => (
                <ChapterBlock key={cap.id} capitulo={cap} index={grupo.slice(0, ci).length + grupos.slice(0, gi).reduce((n, g) => n + g.length, 0)} />
              ))}
              {galeria[gi] && <GalleryPhoto src={galeria[gi]} />}
            </div>
          ))}
        </div>

        {/* CTA emocional pero real: pasa de la historia a la acción sin
            perder el tono cercano. */}
        <ScrollReveal className="mx-auto max-w-app px-5 pb-14 pt-4 md:max-w-4xl">
          <div className="rounded-[24px] bg-navy p-6 text-center text-white md:p-12">
            <h2 className="text-[22px] font-extrabold leading-tight md:text-[28px]">
              ¿Quieres esa misma tranquilidad?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-white/80 md:text-[16px]">
              Comparamos por ti, sin coste ni compromiso, para que también tengas tu historia que contar.
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a href={ctaHref} className="flex w-full items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep sm:w-auto">
                {testimonio.ctaTexto}
              </a>
              <a href={llamadmeHref} className="flex w-full items-center justify-center rounded-card border border-white/30 px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto">
                Que te llamen gratis
              </a>
            </div>
          </div>

          {/* Compartir */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <p className="text-[13px] font-semibold text-ink">Compartir esta historia</p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${testimonio.nombre}, ${testimonio.ubicacion} — ${pageUrl}`)}`}
              target="_blank" rel="noopener noreferrer" aria-label="Compartir por WhatsApp"
              className="grid h-9 w-9 place-items-center rounded-full bg-mist text-navy transition-colors hover:bg-hair"
            >
              <WhatsApp className="text-[#25D366]" />
            </a>
          </div>
        </ScrollReveal>

        {related.length > 0 && (
          <section aria-labelledby="mas-historias" className="mx-auto mt-4 max-w-app px-5 pb-14 md:max-w-5xl lg:max-w-6xl">
            <h2 id="mas-historias" className="text-[22px] font-extrabold text-navy md:text-[26px]">Más historias</h2>
            <ul className="mt-5 grid gap-6 md:grid-cols-3">
              {related.map((t) => <TestimonioCard key={t.id} testimonio={t} />)}
            </ul>
          </section>
        )}
      </main>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <Footer />
      <StickyMobileCta label={testimonio.ctaTexto} href={ctaHref} secondaryLabel="Que te llamen gratis" secondaryHref={llamadmeHref} />
    </>
  );
}
