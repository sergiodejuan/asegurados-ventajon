import Link from "next/link";

type Props = {
  producto?: string;
  className?: string;
  compact?: boolean;
};

export function PriceMatchCrossSellBar({ producto, className, compact = false }: Props) {
  const query = producto ? `?producto=${encodeURIComponent(producto)}` : "";
  const href = `/precio-mejor-garantizado${query}`;
  const baseClass = compact
    ? "flex items-center justify-between gap-3 rounded-[16px] border border-hair bg-mist/60 p-4 transition-colors hover:border-navy/40 hover:bg-mist"
    : "flex flex-col gap-3 rounded-[20px] border border-hair bg-mist/60 p-5 transition-colors hover:border-navy/40 hover:bg-mist sm:flex-row sm:items-center sm:justify-between";
  return (
    <Link href={href} className={`${baseClass} ${className ?? ""}`.trim()}>
      <div className="min-w-0">
        <p className={`${compact ? "text-[14px]" : "text-[15px]"} font-bold text-navy`}>
          ¿Ya tienes un precio de otra compañía?
        </p>
        <p className={`${compact ? "text-[12px]" : "text-[13px]"} mt-0.5 leading-relaxed text-slate2`}>
          Envíanoslo y estudiamos la mejor alternativa del mercado. Gratis y sin compromiso.
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-navy">
        Enviar precio <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
