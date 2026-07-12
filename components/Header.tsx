import { BRAND_NAME, WHATSAPP_URL } from "@/lib/brand";
import { WhatsApp } from "./icons";

export function Wordmark() {
  const parts = BRAND_NAME.split(" ");
  const first = parts[0];
  const rest = parts.slice(1).join(" ");
  return (
    <span className="inline-flex items-baseline gap-1.5 font-display text-[17px] font-extrabold tracking-tight text-navy" translate="no">
      <span aria-hidden="true" className="mr-0.5 inline-block h-3 w-3 translate-y-[1px] rounded-[3px] bg-brand-red" />
      {first}
      {rest ? <span className="text-brand-red">{rest}</span> : null}
    </span>
  );
}

const NAV_LINKS = [
  { href: "/#cob", label: "Seguro de salud" },
  { href: "/#otros", label: "Otros productos" },
  { href: "/#conf", label: "Por qué nosotros" },
];

export function Header() {
  return (
    <header className="safe-top sticky top-0 z-40 border-b border-hair bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-app items-center justify-between px-5 md:max-w-5xl lg:h-16 lg:max-w-6xl">
        <a href="/" className="rounded-md" aria-label={`${BRAND_NAME} · Inicio`}>
          <Wordmark />
        </a>
        <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[14px] font-semibold text-slate2 transition-colors hover:text-navy">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-pill border border-hair px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:border-navy/30 hover:bg-mist"
          >
            <WhatsApp className="text-[#25D366]" />
            Escríbenos
          </a>
          <a
            href="/tarificador"
            className="hidden items-center rounded-pill bg-brand-red px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep lg:inline-flex"
          >
            Calcula tu precio
          </a>
        </div>
      </div>
    </header>
  );
}
