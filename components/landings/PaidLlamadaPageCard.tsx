"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, IconByName } from "@/components/icons";
import { PaidLlamadaForm, type PaidLlamadaSuccess } from "./PaidLlamadaForm";
import { PaidLlamadaGracias } from "./PaidLlamadaGracias";

// Tarjeta interactiva de /lp/salud/llamada: igual que en el resto de la
// landing, al enviar el formulario no navega a /gracias — se sustituye por
// un "¡Gracias!" con la preferencia de día/hora, sin salir de /lp/salud. Al
// pulsar "Volver a {marca}" aquí sí navega (a /lp/salud): a diferencia de
// los modales, esta es una página dedicada, así que "volver" significa
// salir de ella hacia la landing, no vaciar el formulario para repetirlo.
export function PaidLlamadaPageCard({ phone }: { phone: string }) {
  const router = useRouter();
  const [result, setResult] = useState<PaidLlamadaSuccess | null>(null);

  return (
    <div className="mx-auto max-w-xl rounded-[20px] bg-white p-6 shadow-soft md:p-10">
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red">
          {result ? <Check width={20} height={20} /> : <IconByName name="doc" width={20} height={20} />}
        </span>
        <h1 className="text-[22px] font-extrabold leading-tight text-navy md:text-[26px]">
          {result ? "¡Gracias!" : "Solicita tu presupuesto personalizado"}
        </h1>
      </div>
      <div className="mt-6">
        {result ? (
          <PaidLlamadaGracias telefono={result.telefono} dia={result.dia} turno={result.turno} phone={phone} onClose={() => router.push("/lp/salud")} />
        ) : (
          <PaidLlamadaForm onSuccess={setResult} />
        )}
      </div>
    </div>
  );
}
