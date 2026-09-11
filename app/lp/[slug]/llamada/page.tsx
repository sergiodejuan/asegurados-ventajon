import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PaidLlamadaPageCard } from "@/components/landings/PaidLlamadaPageCard";
import { getLandingBySlug, getTheme } from "@/lib/store";
import { buildTarificadorHref, type LandingProducto } from "@/lib/landings";
import { BRAND_NAME } from "@/lib/brand";
import { ArrowRight, IconByName, Phone } from "@/components/icons";

// Otros ramos que se ofrecen como cross-sell al final de esta página. El
// primero (el ramo de la propia landing) enlaza a su tarificador real —
// embebido para salud, de página completa para el resto —; los siguientes
// enlazan al tarificador/landing estándar del site (no la landing SEO
// genérica) para no repetir tráfico paid en dos sitios.
const PRODUCTO_INFO: Record<LandingProducto, { icon: string; label: string; href: string; price?: string }> = {
  salud: { icon: "shield", label: "Salud", href: "/tarificador", price: "Desde 35 €/mes" },
  auto: { icon: "car", label: "Coche", href: "/tarificador-auto" },
  hogar: { icon: "home", label: "Hogar", href: "/seguro-de-hogar" },
  vida: { icon: "shield", label: "Vida", href: "/tarificador-vida" },
  decesos: { icon: "doc", label: "Decesos", href: "/tarificador-decesos" },
};
const CROSS_SELL_ORDER: LandingProducto[] = ["salud", "auto", "hogar", "vida", "decesos"];

export const dynamic = "force-dynamic";

// Página de "que me llamen" de una landing paid, con el diseño minimalista
// de la referencia de Línea Directa: barra top con logo + teléfono, tarjeta
// centrada con formulario (teléfono + fecha + hora + botón), cross-sell
// horizontal a otros ramos, footer sencillo con legal + rating. Aparte del
// resto de "quiero-que-me-llamen" para no mezclar tráfico paid con orgánico.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const landing = await getLandingBySlug(params.slug, { onlyPublished: true });
  if (!landing) return {};
  return {
    title: `Te llamamos gratis — ${BRAND_NAME}`,
    description: landing.metaDescription,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function LpSlugLlamadaPage({ params }: { params: { slug: string } }) {
  const [landing, theme] = await Promise.all([
    getLandingBySlug(params.slug, { onlyPublished: true }),
    getTheme(),
  ]);
  if (!landing) notFound();

  const logo = theme.logoUrl || theme.minimalLogoUrl || "";
  const phone = landing.phone;
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;
  const ownTarificadorHref = landing.producto === "salud" ? `/lp/${landing.slug}/tarificador` : buildTarificadorHref(landing);
  const crossSell = [
    { ...PRODUCTO_INFO[landing.producto], href: ownTarificadorHref, accent: true },
    ...CROSS_SELL_ORDER.filter((p) => p !== landing.producto).slice(0, 3).map((p) => ({ ...PRODUCTO_INFO[p], accent: false })),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-mist text-ink">
      {/* Top bar: logo (clicable → tarificador) + teléfono */}
      <header className="border-b border-hair bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href={ownTarificadorHref} aria-label={`${BRAND_NAME} — calcular seguro`} className="inline-flex items-center">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={BRAND_NAME} className="h-10 w-auto max-w-[180px] object-contain" />
            ) : (
              <span translate="no" className="font-display text-[16px] font-extrabold text-navy">{BRAND_NAME}</span>
            )}
          </Link>
          <a href={phoneHref} className="inline-flex items-center gap-2 text-[16px] font-bold text-emerald-600">
            <Phone width={18} height={18} aria-hidden="true" />
            <span className="tnums">{phone}</span>
          </a>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 md:py-16">
        <PaidLlamadaPageCard phone={phone} backHref={`/lp/${landing.slug}`} producto={landing.producto} landingSlug={landing.slug} />

        <p className="mx-auto mt-6 max-w-xl text-center text-[12px] leading-relaxed text-slate2">
          Si nos solicitas que te llamemos tus datos serán tratados por {BRAND_NAME}, para ponernos en contacto contigo con la finalidad de gestionar tu petición de seguros. Puedes consultar más información{" "}
          <Link href="/legal#privacidad" className="text-navy underline">aquí</Link> donde se informa, entre otros aspectos, de cómo ejercitar los derechos de acceso, rectificación, supresión, limitación, oposición o portabilidad de datos.
        </p>

        {/* Cross-sell: calcula tu seguro en 1 minuto + otros ramos, en ancho
            completo (mobile-first) para que sean fáciles de tocar en móvil. */}
        <div className="mx-auto mt-10 max-w-xl rounded-[16px] bg-white p-5 shadow-soft md:mt-14 md:max-w-3xl md:p-6">
          <p className="text-center text-[14px] font-semibold text-navy">Calcula tu seguro en 1 minuto</p>
          <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {crossSell.map((item, i) => (
              <Link
                key={`${item.label}-${i}`}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-[12px] border px-4 py-3.5 transition-colors ${
                  item.accent
                    ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-hair bg-white text-navy hover:bg-mist"
                }`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${item.accent ? "bg-emerald-100 text-emerald-700" : "bg-brand-red/10 text-brand-red"}`}>
                  <IconByName name={item.icon} width={18} height={18} />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-[14px] font-bold">{item.label}</span>
                  {item.price && (
                    <span className="block text-[12px] font-semibold text-emerald-800/80">{item.price}</span>
                  )}
                </span>
                <ArrowRight width={16} height={16} className={item.accent ? "text-emerald-700" : "text-slate2"} />
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-hair bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-[13px] text-slate2 md:flex-row">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <li><Link href="/legal" className="hover:text-navy">Aviso legal</Link></li>
            <li><Link href="/legal#cookies" className="hover:text-navy">Política de cookies</Link></li>
            <li><Link href="/legal#privacidad" className="hover:text-navy">Política de privacidad</Link></li>
          </ul>
          {(landing.rating.valor || landing.rating.numValoraciones) && (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-amber-500">★★★★★</span>
              <span className="font-bold text-navy">{landing.rating.valor}</span>
              <span>{landing.rating.numValoraciones}</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
