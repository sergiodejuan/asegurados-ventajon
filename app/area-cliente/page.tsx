import type { Metadata } from "next";
import { AreaClienteContent } from "@/components/AreaClienteContent";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Tu área de cliente — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function AreaCliente() {
  return <AreaClienteContent />;
}
