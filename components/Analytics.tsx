"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";

// Captura la atribución (UTM + landing page) y emite un "page_view" virtual
// en cada cambio de ruta. Usa window.location.search en vez de
// useSearchParams para no forzar el árbol entero a client-side rendering
// (useSearchParams exige un límite <Suspense>; usePathname no).
export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    const search = window.location.search;
    captureAttribution(pathname, search);
    pushDataLayerEvent("page_view", { page_path: pathname + search });
  }, [pathname]);

  return null;
}
