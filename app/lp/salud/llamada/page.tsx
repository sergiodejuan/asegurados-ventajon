import type { Metadata } from "next";
import Link from "next/link";
import { PaidLlamadaForm } from "@/components/landings/PaidLlamadaForm";
import { getPaidLandingSaludConfig, getTheme } from "@/lib/store";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

// Página de "que me llamen" exclusiva de /lp/salud, con el diseño minimalista
// de la referencia de Línea Directa: barra top con logo + teléfono, tarjeta
// centrada con formulario (teléfono + fecha + hora + botón), cross-sell
// horizontal a otros ramos, footer sencillo con legal + rating. Aparte del
// resto de "quiero-que-me-llamen" para no mezclar tráfico paid con orgánico.
export async function generateMetadata(): Promise<Metadata> {
  const config = await getPaidLandingSaludConfig();
  return {
    title: `Te llamamos gratis — ${BRAND_NAME}`,
    description: config.metaDescription,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function LpSaludLlamadaPage() {
  const [config, theme] = await Promise.all([
    getPaidLandingSaludConfig(),
    getTheme(),
  ]);
  const logo = theme.logoUrl || theme.minimalLogoUrl || "";
  const phone = config.phone;
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;

  return (
    <div className="min-h-screen bg-mist text-ink">
      {/* Top bar: logo (clicable → tarificador) + teléfono */}
      <header className="border-b border-hair bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/lp/salud/tarificador" aria-label={`${BRAND_NAME} — calcular seguro`} className="inline-flex items-center">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={BRAND_NAME} className="h-10 w-auto max-w-[180px] object-contain" />
            ) : (
              <span translate="no" className="font-display text-[16px] font-extrabold text-navy">{BRAND_NAME}</span>
            )}
          </Link>
          <a href={phoneHref} className="inline-flex items-center gap-2 text-[16px] font-bold text-emerald-600">
            <span aria-hidden="true">📞</span>
            <span className="tnums">{phone}</span>
          </a>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-6xl px-5 py-10 md:py-16">
        <div className="mx-auto max-w-xl rounded-[20px] bg-white p-6 shadow-soft md:p-10">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red">
              👤
            </span>
            <h1 className="text-[22px] font-extrabold leading-tight text-navy md:text-[26px]">
              Solicita tu presupuesto personalizado
            </h1>
          </div>
          <div className="mt-6">
            <PaidLlamadaForm />
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-[12px] leading-relaxed text-slate2">
          Si nos solicitas que te llamemos tus datos serán tratados por {BRAND_NAME}, para ponernos en contacto contigo con la finalidad de gestionar tu petición de seguros. Puedes consultar más información{" "}
          <Link href="/legal#privacidad" className="text-navy underline">aquí</Link> donde se informa, entre otros aspectos, de cómo ejercitar los derechos de acceso, rectificación, supresión, limitación, oposición o portabilidad de datos.
        </p>

        {/* Cross-sell: calcula tu seguro en 2 minutos + otros ramos */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-[16px] bg-white p-5 shadow-soft md:mt-14 md:flex-row md:gap-6 md:px-6 md:py-5">
          <p className="shrink-0 text-center text-[14px] font-semibold text-navy md:text-left">
            Calcula tu seguro<br className="hidden md:block" /> en 2 minutos
          </p>
          <Link
            href="/lp/salud/tarificador"
            className="inline-flex items-center gap-2 rounded-pill border border-emerald-500/40 bg-emerald-50 px-4 py-2 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100"
          >
            <span aria-hidden="true">❤️</span>
            <span>Salud</span>
            <span className="text-[12px] font-semibold text-emerald-800/80">Desde 19,90 €/mes sin copago</span>
          </Link>
          <Link href="/tarificador-auto" className="inline-flex flex-col items-center rounded-[12px] border border-hair bg-white px-4 py-3 text-[12px] font-semibold text-navy hover:bg-mist">
            <span aria-hidden="true">🚗</span>Coche
          </Link>
          <Link href="/seguro-de-hogar" className="inline-flex flex-col items-center rounded-[12px] border border-hair bg-white px-4 py-3 text-[12px] font-semibold text-navy hover:bg-mist">
            <span aria-hidden="true">🏠</span>Hogar
          </Link>
          <Link href="/tarificador-auto" className="inline-flex flex-col items-center rounded-[12px] border border-hair bg-white px-4 py-3 text-[12px] font-semibold text-navy hover:bg-mist">
            <span aria-hidden="true">🏍️</span>Moto
          </Link>
        </div>
      </main>

      <footer className="border-t border-hair bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-[13px] text-slate2 md:flex-row">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <li><Link href="/legal" className="hover:text-navy">Aviso legal</Link></li>
            <li><Link href="/legal#cookies" className="hover:text-navy">Política de cookies</Link></li>
            <li><Link href="/legal#privacidad" className="hover:text-navy">Política de privacidad</Link></li>
          </ul>
          {(config.rating.valor || config.rating.numValoraciones) && (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-amber-500">★★★★★</span>
              <span className="font-bold text-navy">{config.rating.valor}</span>
              <span>{config.rating.numValoraciones}</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
