import type { Metadata } from "next";
import { Suspense } from "react";
import { VerificarAccesoContent } from "@/components/VerificarAccesoContent";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Confirma tu acceso — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function VerificarAcceso() {
  return (
    <Suspense fallback={null}>
      <VerificarAccesoContent />
    </Suspense>
  );
}
