import { Suspense } from "react";
import type { Metadata } from "next";
import { Comparativa } from "@/components/Comparativa";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Tu comparativa — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function ComparativaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-mist" />}>
      <Comparativa />
    </Suspense>
  );
}
