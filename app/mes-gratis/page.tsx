import type { Metadata } from "next";
import { MesGratisLanding } from "@/components/MesGratisLanding";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `1 mes gratis en tu seguro de salud — ${BRAND_NAME}`,
  description: "Contrata ahora tu seguro de salud y te regalamos 1 mes. Compara gratis entre las mejores aseguradoras, sin compromiso.",
  robots: { index: false, follow: false }, // campaña con texto DEMO, pendiente de validación legal
};

export default function MesGratisPage() {
  return <MesGratisLanding />;
}
