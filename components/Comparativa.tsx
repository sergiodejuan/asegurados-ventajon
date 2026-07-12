"use client";

import { useSearchParams } from "next/navigation";
import { Header } from "./Header";
import { NextSteps } from "./NextSteps";
import { Check } from "./icons";
import { BRAND_NAME, COMPARATIVA_SALUD, COMPARATIVA_VIDA } from "@/lib/brand";

function euros(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Comparativa() {
  const searchParams = useSearchParams();
  const producto = searchParams.get("producto") === "vida" ? "vida" : "salud";
  const nRaw = Number(searchParams.get("n"));
  const n = Number.isFinite(nRaw) && nRaw >= 1 && nRaw <= 9 ? nRaw : 1;

  return (
    <>
      <Header />
      <main id="contenido" className="mx-auto max-w-app px-5 py-14 md:max-w-2xl md:py-20">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-navy text-white">
          <Check width={30} height={30} />
        </div>
        <h1 className="mt-6 text-[28px] font-extrabold leading-tight text-navy">
          Ya tenemos tu comparativa
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-slate2">
          {producto === "vida"
            ? "Así de orientativo se mueve el precio de un seguro de vida entre las compañías con las que trabajamos."
            : `Así de orientativo se mueve el precio de un seguro de salud para ${n === 1 ? "1 persona" : `${n} personas`} entre las compañías con las que trabajamos.`}
          {" "}Un asesor de {BRAND_NAME} te llama para confirmar tu propuesta final, sin compromiso.
        </p>

        <div className="mt-5 rounded-card border border-hair bg-mist p-4">
          <p className="text-[13px] font-bold text-navy">Precios orientativos</p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Son precios de ejemplo, no una cotización en firme: el precio final depende de tu perfil
            (edad, coberturas, código postal…) y te lo confirma tu asesor sin compromiso.
          </p>
        </div>

        <ul className="mt-5 flex flex-col gap-3">
          {producto === "vida"
            ? COMPARATIVA_VIDA.map((c) => (
                <li key={c.compania} className="flex items-center justify-between gap-3 rounded-card border border-hair bg-white p-4 shadow-soft">
                  <p className="text-[16px] font-bold text-ink">{c.compania}</p>
                  <p className="text-right text-[14px] text-slate2">
                    Desde <span className="text-[17px] font-extrabold tnums text-navy">{euros(c.precio)} €</span>/mes
                  </p>
                </li>
              ))
            : COMPARATIVA_SALUD.map((c) => (
                <li key={c.compania} className="rounded-card border border-hair bg-white p-4 shadow-soft">
                  <p className="text-[16px] font-bold text-ink">{c.compania}</p>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[13px] text-slate2">
                    <span>Con copago</span>
                    <span className="text-[15px] font-extrabold tnums text-navy">{euros(c.conCopago * n)} €/mes</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[13px] text-slate2">
                    <span>Sin copago</span>
                    <span className="text-[15px] font-extrabold tnums text-navy">{euros(c.sinCopago * n)} €/mes</span>
                  </div>
                </li>
              ))}
        </ul>

        <NextSteps />
      </main>
    </>
  );
}
