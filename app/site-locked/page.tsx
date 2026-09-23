import { BRAND_NAME } from "@/lib/brand";
import SiteLockForm from "./SiteLockForm";

export const dynamic = "force-dynamic";

// Página a la que el middleware reescribe (rewrite, no redirect: la URL
// visible en el navegador sigue siendo la que el visitante pedía) cuando el
// candado de mantenimiento está activo y no hay cookie de desbloqueo válida.
export default function SiteLockedPage({ searchParams }: { searchParams: { next?: string } }) {
  // Solo rutas internas relativas: evita que un "next" manipulado se use
  // como redirección abierta a un dominio externo tras desbloquear.
  const next =
    typeof searchParams.next === "string" && searchParams.next.startsWith("/") && !searchParams.next.startsWith("//")
      ? searchParams.next
      : "/";

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-5">
      <div className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 shadow-card">
        <p className="font-display text-[16px] font-extrabold text-navy" translate="no">{BRAND_NAME}</p>
        <h1 className="mt-3 text-[22px] font-extrabold text-navy">Acceso restringido</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate2">
          Esta web está temporalmente en mantenimiento. Introduce la contraseña de acceso para continuar.
        </p>
        <SiteLockForm next={next} />
      </div>
    </main>
  );
}
