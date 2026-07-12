import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { GraciasContent } from "@/components/GraciasContent";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Gracias — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function Gracias() {
  return (
    <>
      <Header />
      <main id="contenido" className="mx-auto max-w-app px-5 py-14 md:max-w-xl md:py-20">
        <GraciasContent />
      </main>
    </>
  );
}
