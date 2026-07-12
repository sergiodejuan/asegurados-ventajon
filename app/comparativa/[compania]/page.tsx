import { Suspense } from "react";
import type { Metadata } from "next";
import { CompanyDetail } from "@/components/CompanyDetail";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Tu presupuesto — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function CompanyDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-mist" />}>
      <CompanyDetail />
    </Suspense>
  );
}
