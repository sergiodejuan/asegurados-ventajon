import { CompanyLogo } from "./Comparativa";

// Insignia de aseguradora aliada (home, Quiénes somos, landing de campaña).
// Con logo subido: solo el logo, sin texto ni fondo/pastilla — a tamaño
// legible y alineado con el resto en una misma línea. Sin logo: se
// mantiene el nombre en una pastilla de texto, como hasta ahora.
export function PartnerBadge({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    return (
      <li className="flex h-12 items-center">
        <CompanyLogo logoUrl={logoUrl} compania={name} size="h-10 max-w-[150px] sm:h-12 sm:max-w-[170px]" />
      </li>
    );
  }
  return (
    <li className="flex h-12 items-center rounded-pill border border-hair bg-white px-4 text-[14px] font-semibold text-navy">
      {name}
    </li>
  );
}
