import type { Metadata } from "next";
import { ValoracionContent } from "@/components/ValoracionContent";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Tu opinión — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function ValoracionPage({ params }: { params: { id: string } }) {
  return <ValoracionContent id={params.id} />;
}
