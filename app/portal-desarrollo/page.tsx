import type { Metadata } from "next";
import PortalDesarrolloClient from "./PortalDesarrolloClient";

// Página secreta de onboarding técnico: no enlazada desde ningún menú ni el
// sitemap (ver app/sitemap.ts) y, además, marcada explícitamente para no
// indexar por si algún rastreador la encuentra igualmente.
export const metadata: Metadata = {
  title: "Documentación técnica",
  robots: { index: false, follow: false },
};

export default function PortalDesarrolloPage() {
  return <PortalDesarrolloClient />;
}
