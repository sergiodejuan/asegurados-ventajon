import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { Check } from "@/components/icons";

// Página de feedback tras el opt-in del referido.
// ?ok=1 → éxito (vale Amazon en camino).
// ?ok=0 → link inválido/caducado.
// Nunca revelamos si el token existió o no — la página es la misma para
// ambos casos, solo cambia el copy en función del query param.

export const metadata: Metadata = {
  title: `Confirmación — Programa Amigos ${BRAND_NAME}`,
  robots: { index: false, follow: false, nocache: true },
};

export default function ReferralOptInPage({ searchParams }: { searchParams: { ok?: string } }) {
  const ok = searchParams?.ok === "1";
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 bg-mist px-5 py-14 text-center">
      <div className={`grid h-16 w-16 place-items-center rounded-full ${ok ? "bg-emerald-600" : "bg-slate2"} text-white`}>
        <Check width={30} height={30} />
      </div>
      <div>
        <h1 className="text-[26px] font-extrabold text-navy">
          {ok ? "¡Confirmado!" : "El enlace no es válido"}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate2">
          {ok
            ? "Tu vale Amazon está en camino — te llegará al mismo email en las próximas 24-48 horas laborables."
            : "El enlace puede haber caducado o ya haberse usado. Si crees que es un error, escríbenos y lo revisamos."}
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex min-h-[48px] items-center justify-center rounded-pill bg-navy px-6 text-[15px] font-bold text-white hover:bg-navy-deep"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
