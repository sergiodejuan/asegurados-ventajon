import type { Metadata } from "next";
import { Suspense } from "react";
import { AreaClienteContent } from "@/components/AreaClienteContent";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Tu área de cliente — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function AreaCliente() {
  return (
    <Suspense fallback={null}>
      <AreaClienteContent />
    </Suspense>
  );
}
