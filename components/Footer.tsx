import { BRAND_NAME, CONTACT_HOURS } from "@/lib/brand";
import { PRODUCT_PAGES } from "@/lib/productPages";
import { GEO_LANDING_PAGES } from "@/lib/geoLandingPages";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="safe-bottom mt-14 border-t border-hair bg-white md:mt-24">
      <div className="mx-auto max-w-app px-5 py-8 md:max-w-5xl md:py-12 lg:max-w-6xl">
        <div className="md:grid md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr] md:gap-8 lg:gap-10">
          <div>
            <p className="font-display text-[15px] font-extrabold text-navy" translate="no">{BRAND_NAME}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate2 md:max-w-sm">Correduría de seguros. Trabajamos en toda España. Atención {CONTACT_HOURS}.</p>
            <p className="mt-2 text-[12px] leading-relaxed text-slate2 md:max-w-sm">[Pendiente de validación legal: identificación registral de la correduría y textos obligatorios.]</p>
          </div>

          <nav aria-label="Seguros" className="mt-6 md:mt-0">
            <p className="text-[13px] font-bold text-navy">Seguros</p>
            <ul className="mt-3 flex flex-col gap-2 text-[13px]">
              {PRODUCT_PAGES.map((p) => (
                <li key={p.slug}><a href={p.path} className="font-medium text-slate2 transition-colors hover:text-navy">{p.badge}</a></li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Seguro de salud por isla" className="mt-6 md:mt-0">
            <p className="text-[13px] font-bold text-navy">Salud en Canarias</p>
            <ul className="mt-3 flex flex-col gap-2 text-[13px]">
              {GEO_LANDING_PAGES.map((g) => (
                <li key={g.slug}><a href={g.path} className="font-medium text-slate2 transition-colors hover:text-navy">{g.islandName}</a></li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Empresa" className="mt-6 md:mt-0">
            <p className="text-[13px] font-bold text-navy">Empresa</p>
            <ul className="mt-3 flex flex-col gap-2 text-[13px]">
              <li><a href="/quienes-somos" className="font-medium text-slate2 transition-colors hover:text-navy">Quiénes somos</a></li>
              <li><a href="/actualidad" className="font-medium text-slate2 transition-colors hover:text-navy">Actualidad</a></li>
              <li><a href="/quiero-que-me-llamen" className="font-medium text-slate2 transition-colors hover:text-navy">Te llamamos gratis</a></li>
              <li><a href="/recursos-seguros-canarias-baleares" className="font-medium text-slate2 transition-colors hover:text-navy">Guías gratis (Canarias y Baleares)</a></li>
              <li><a href="/area-cliente" className="font-medium text-slate2 transition-colors hover:text-navy">Mi área de cliente</a></li>
            </ul>
          </nav>

          <nav aria-label="Enlaces legales" className="mt-6 md:mt-0">
            <p className="text-[13px] font-bold text-navy">Legal</p>
            <ul className="mt-3 flex flex-col gap-2 text-[13px]">
              <li><a href="/legal" className="font-medium text-slate2 transition-colors hover:text-navy">Política de privacidad</a></li>
              <li><a href="/legal" className="font-medium text-slate2 transition-colors hover:text-navy">Condiciones de uso</a></li>
              <li><a href="/legal" className="font-medium text-slate2 transition-colors hover:text-navy">Aviso legal</a></li>
            </ul>
          </nav>
        </div>
        <p className="mt-8 text-[12px] text-slate2">© {year} {BRAND_NAME}</p>
      </div>
    </footer>
  );
}
