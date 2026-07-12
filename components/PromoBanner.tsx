import { PROMO } from "@/lib/brand";
import { IconByName } from "./icons";

// Banner de reclamo tipo referencia (recuadro mint + claim + "ver condiciones").
// ⚠️ Sin % ni precios: el texto se edita en lib/brand.ts (PROMO) tras validación de Gabriel.
export function PromoBanner() {
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-mint px-5 py-4 pr-24">
      <span className="inline-flex items-center rounded-pill bg-white/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-mint-deep">
        {PROMO.badge}
      </span>
      <p className="mt-2 text-[18px] font-extrabold leading-tight text-navy-deep">{PROMO.headline}</p>
      <p className="mt-1 text-[13px] leading-snug text-navy-deep/80">{PROMO.sub}</p>
      <a href="/legal" className="mt-1.5 inline-block text-[12px] font-semibold text-mint-deep underline">
        Ver condiciones
      </a>
      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-mint-deep/70">
        <IconByName name="shield" width={56} height={56} />
      </span>
    </div>
  );
}
