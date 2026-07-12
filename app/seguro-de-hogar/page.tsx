import type { Metadata } from "next";
import { ProductLandingPage } from "@/components/ProductLandingPage";
import { getProductPage } from "@/lib/productPages";

const page = getProductPage("hogar")!;

export const metadata: Metadata = {
  title: page.metaTitle,
  description: page.metaDescription,
};

export default function SeguroDeHogarPage() {
  return <ProductLandingPage page={page} />;
}
