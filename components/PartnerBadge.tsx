import { CompanyLogo } from "./Comparativa";

// Insignia de aseguradora aliada (home, Quiénes somos, seguros, landing de
// campaña). Pastilla redondeada con fondo blanco, como siempre: con logo
// subido se muestra solo el logo (sin el nombre); sin logo, el nombre en
// texto, como hasta ahora.
export function PartnerBadge({ name, logoUrl }: { name: string; logoUrl?: string }) {
  return (
    <li className="flex h-12 items-center rounded-pill border border-hair bg-white px-4">
      {logoUrl ? (
        <CompanyLogo logoUrl={logoUrl} compania={name} size="h-7 max-w-[120px]" />
      ) : (
        <span className="text-[14px] font-semibold text-navy">{name}</span>
      )}
    </li>
  );
}
