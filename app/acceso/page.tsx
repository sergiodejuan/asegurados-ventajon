import { Suspense } from "react";
import type { Metadata } from "next";
import AccesoForm from "./AccesoForm";

export const metadata: Metadata = {
  title: "Acceso restringido",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

// Pantalla pública del bloqueo global. Se muestra cuando el middleware
// redirige aquí porque la web está en modo cerrado y el visitante no
// tiene la cookie firmada. El propio /acceso está exento del middleware
// (mismo prefijo) para no crear un bucle de redirección.
export default function AccesoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-4 py-10">
      <Suspense fallback={null}>
        <AccesoForm />
      </Suspense>
    </main>
  );
}
