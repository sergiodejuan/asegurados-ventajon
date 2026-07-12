"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Header } from "./Header";
import { CallRequestForm } from "./CallRequestForm";
import { Check } from "./icons";
import { BRAND_NAME, COBERTURAS, COMPARATIVA_SALUD, COMPARATIVA_VIDA, SERVICIOS_VIDA } from "@/lib/brand";
import {
  loadQuote, saludPrice, vidaPrice, quoteNumber, buildWhatsAppText, whatsAppUrl, slugify, type QuoteProfile,
} from "@/lib/quote";

function euros(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CompanyDetail() {
  const params = useParams<{ compania: string }>();
  const searchParams = useSearchParams();
  const producto = searchParams.get("producto") === "vida" ? "vida" : "salud";
  const [quote, setQuote] = useState<QuoteProfile | null>(null);

  useEffect(() => { setQuote(loadQuote()); }, []);

  const list = producto === "vida" ? COMPARATIVA_VIDA : COMPARATIVA_SALUD;
  const entry = list.find((c) => slugify(c.compania) === params.compania);

  if (!entry) {
    return (
      <>
        <Header />
        <main id="contenido" className="mx-auto max-w-app px-5 py-14 text-center md:max-w-xl md:py-20">
          <p className="text-[16px] leading-relaxed text-slate2">No encontramos esa opción.</p>
          <a href="/comparativa" className="mt-5 inline-block font-semibold text-navy underline">Volver a la comparativa</a>
        </main>
      </>
    );
  }

  const bullets = producto === "vida" ? SERVICIOS_VIDA : [...COBERTURAS.sin.bullets, ...COBERTURAS.con.bullets];
  const waText = buildWhatsAppText({ producto, compania: entry.compania, quote });

  return (
    <>
      <Header />
      <main id="contenido" className="mx-auto max-w-app px-5 py-10 md:max-w-2xl md:py-16">
        <a href="/comparativa" className="text-[13px] font-semibold text-navy underline print:hidden">← Volver a la comparativa</a>

        <p className="mt-4 text-[12px] font-bold uppercase tracking-wide text-brand-red">
          {producto === "vida" ? "Seguro de vida" : "Seguro de salud"}
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight text-navy">{entry.compania}</h1>
        {quote && <p className="mt-1 text-[13px] font-semibold tnums text-slate2">Presupuesto nº {quoteNumber(quote.id)}</p>}

        {producto === "vida" ? (
          <p className="mt-5 text-[32px] font-extrabold tnums text-navy">
            Desde {euros(vidaPrice(entry as { precio: number }, { fumador: quote?.fumador }).precio)} €
            <span className="text-[16px] font-medium text-slate2">/mes</span>
          </p>
        ) : (
          <div className="mt-5 flex gap-8">
            <div>
              <p className="text-[13px] text-slate2">Con copago</p>
              <p className="text-[24px] font-extrabold tnums text-navy">
                {euros(saludPrice(entry as { conCopago: number; sinCopago: number }, { numAsegurados: quote?.numAsegurados, coberturaDental: quote?.coberturaDental }).conCopago)} €/mes
              </p>
            </div>
            <div>
              <p className="text-[13px] text-slate2">Sin copago</p>
              <p className="text-[24px] font-extrabold tnums text-navy">
                {euros(saludPrice(entry as { conCopago: number; sinCopago: number }, { numAsegurados: quote?.numAsegurados, coberturaDental: quote?.coberturaDental }).sinCopago)} €/mes
              </p>
            </div>
          </div>
        )}
        <p className="mt-2 text-[12px] leading-relaxed text-slate2">
          Precio orientativo calculado para tu perfil. No es una cotización en firme: tu asesor te confirma la propuesta final, sin compromiso.
        </p>

        <ul className="mt-6 flex flex-col gap-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                <Check width={13} height={13} />
              </span>
              <span className="text-[14px] leading-relaxed text-ink">{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center rounded-card border border-navy px-5 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            Descargar presupuesto en PDF
          </button>
          <a
            href={whatsAppUrl(waText)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
          >
            Seguir por WhatsApp
          </a>
        </div>

        {/* Resumen imprimible: oculto en pantalla, visible solo al generar el PDF */}
        <div className="hidden print:block">
          <hr className="my-6 border-hair" />
          <p className="text-[13px] font-bold text-navy">{BRAND_NAME} · Presupuesto orientativo</p>
          {quote && (
            <dl className="mt-2 grid grid-cols-2 gap-y-1 text-[12px]">
              <dt className="text-slate2">Presupuesto nº</dt><dd>{quoteNumber(quote.id)}</dd>
              <dt className="text-slate2">Código postal</dt><dd>{quote.codigoPostal || "—"}</dd>
              {producto === "salud" && <><dt className="text-slate2">Personas a asegurar</dt><dd>{quote.numAsegurados ?? 1}</dd></>}
              {producto === "salud" && <><dt className="text-slate2">Cobertura dental</dt><dd>{quote.coberturaDental ? "Sí" : "No"}</dd></>}
              {producto === "vida" && <><dt className="text-slate2">Fumador</dt><dd>{quote.fumador ? "Sí" : "No"}</dd></>}
            </dl>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-slate2">
            Precio orientativo, no una cotización en firme. Sujeto a confirmación por un asesor de {BRAND_NAME} según el
            perfil final de la persona a asegurar.
          </p>
        </div>

        <div className="mt-10 print:hidden">
          <h2 className="text-[18px] font-bold text-navy">¿Quieres que te llamemos sobre esta opción?</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Déjanos tu teléfono y un asesor te llama para confirmar tu presupuesto con {entry.compania}.
          </p>
          <div className="mt-4">
            <CallRequestForm showHeading={false} />
          </div>
        </div>
      </main>
    </>
  );
}
