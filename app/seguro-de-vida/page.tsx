import type { Metadata } from "next";
import { ProductLandingPage } from "@/components/ProductLandingPage";
import { getProductPage } from "@/lib/productPages";

const page = getProductPage("vida")!;

export const metadata: Metadata = {
  title: page.metaTitle,
  description: page.metaDescription,
};

export default function SeguroDeVidaPage() {
  return <ProductLandingPage page={page} />;
}
