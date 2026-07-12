import { BRAND_NAME, CONTACT_HOURS } from "@/lib/brand";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="safe-bottom mt-14 border-t border-hair bg-white md:mt-24">
      <div className="mx-auto max-w-app px-5 py-8 md:max-w-5xl md:py-10 lg:max-w-6xl">
        <div className="md:flex md:items-start md:justify-between md:gap-10">
          <div>
            <p className="font-display text-[15px] font-extrabold text-navy" translate="no">{BRAND_NAME}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate2 md:max-w-sm">Correduría de seguros. Atención {CONTACT_HOURS}.</p>
            <p className="mt-2 text-[12px] leading-relaxed text-slate2 md:max-w-sm">[Pendiente de validación legal: identificación registral de la correduría y textos obligatorios.]</p>
          </div>
          <nav aria-label="Enlaces legales" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] md:mt-0 md:shrink-0 md:flex-col md:items-end">
            <a href="/legal" className="font-medium text-navy underline">Política de privacidad</a>
            <a href="/legal" className="font-medium text-navy underline">Condiciones de uso</a>
            <a href="/legal" className="font-medium text-navy underline">Aviso legal</a>
          </nav>
        </div>
        <p className="mt-6 text-[12px] text-slate2">© {year} {BRAND_NAME}</p>
      </div>
    </footer>
  );
}
