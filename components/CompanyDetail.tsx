"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { MinimalTopBar } from "./MinimalTopBar";
import { CallRequestForm } from "./CallRequestForm";
import { WhatsAppHelpWidget } from "./WhatsAppHelpWidget";
import { CompanyLogo } from "./Comparativa";
import { Check } from "./icons";
import type { Product } from "@/lib/catalog";
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { setQuote(loadQuote()); }, []);

  useEffect(() => {
    fetch(`/api/products?producto=${producto}`)
      .then((r) => r.json())
      .then((body) => { if (body.ok) setProducts(body.products); })
      .finally(() => setLoaded(true));
  }, [producto]);

  const entry = products.find((c) => slugify(c.compania) === params.compania);

  if (loaded && !entry) {
    return (
      <>
        <MinimalTopBar />
        <main id="contenido" className="mx-auto max-w-app px-5 py-14 text-center md:max-w-xl md:py-20">
          <p className="text-[16px] leading-relaxed text-slate2">No encontramos esa opción.</p>
          <a href="/comparativa" className="mt-5 inline-block font-semibold text-navy underline">Volver a la comparativa</a>
        </main>
      </>
    );
  }
  if (!entry) return null;

  const waText = buildWhatsAppText({ producto, compania: entry.compania, quote });
  const widgetWaText = buildWhatsAppText({ producto, compania: entry.compania, quote, origen: `ficha ${entry.compania}` });
  const precioSalud = saludPrice({ conCopago: entry.precioConCopago ?? 0, sinCopago: entry.precioSinCopago ?? 0 }, { numAsegurados: quote?.numAsegurados, coberturaDental: quote?.coberturaDental });
  const precioVida = vidaPrice({ precio: entry.precio ?? 0 }, { fumador: quote?.fumador });

  async function downloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch("/api/presupuesto/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto, compania: entry!.compania, quote,
          precio: producto === "vida" ? { precio: precioVida.precio } : { conCopago: precioSalud.conCopago, sinCopago: precioSalud.sinCopago },
          servicios: entry!.servicios, condiciones: entry!.condiciones,
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presupuesto-${quote ? quoteNumber(quote.id) : "asegurados-ventajon"}-${slugify(entry!.compania)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <MinimalTopBar />
      <main id="contenido" className="mx-auto max-w-app px-5 py-10 md:max-w-2xl md:py-16">
        <a href="/comparativa" className="text-[13px] font-semibold text-navy underline">← Volver a la comparativa</a>

        <p className="mt-4 text-[12px] font-bold uppercase tracking-wide text-brand-red">
          {producto === "vida" ? "Seguro de vida" : "Seguro de salud"}
        </p>
        <h1 className="mt-1 flex items-center gap-2.5 text-[28px] font-extrabold leading-tight text-navy">
          <CompanyLogo logoUrl={entry.logoUrl} compania={entry.compania} />
          {entry.compania}
        </h1>
        {quote && <p className="mt-1 text-[13px] font-semibold tnums text-slate2">Presupuesto nº {quoteNumber(quote.id)}</p>}

        {producto === "vida" ? (
          <p className="mt-5 text-[32px] font-extrabold tnums text-navy">
            Desde {euros(precioVida.precio)} €
            <span className="text-[16px] font-medium text-slate2">/mes</span>
          </p>
        ) : (
          <div className="mt-5 flex gap-8">
            <div>
              <p className="text-[13px] text-slate2">Con copago</p>
              <p className="text-[24px] font-extrabold tnums text-navy">{euros(precioSalud.conCopago)} €/mes</p>
            </div>
            <div>
              <p className="text-[13px] text-slate2">Sin copago</p>
              <p className="text-[24px] font-extrabold tnums text-navy">{euros(precioSalud.sinCopago)} €/mes</p>
            </div>
          </div>
        )}
        <p className="mt-2 text-[12px] leading-relaxed text-slate2">
          Precio orientativo calculado para tu perfil. No es una cotización en firme: tu asesor te confirma la propuesta final, sin compromiso.
        </p>

        <ul className="mt-6 flex flex-col gap-2.5">
          {entry.servicios.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                <Check width={13} height={13} />
              </span>
              <span className="text-[14px] leading-relaxed text-ink">{b}</span>
            </li>
          ))}
        </ul>

        {entry.condiciones && (
          <div className="mt-5 rounded-card border border-hair bg-mist p-4">
            <p className="text-[12px] font-bold text-navy">Condiciones</p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate2">{entry.condiciones}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!quote || downloading}
            title={!quote ? "Calcula tu precio primero para generar tu presupuesto en PDF." : undefined}
            className="flex items-center justify-center rounded-card border border-navy px-5 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:border-hair disabled:text-slate2/60 disabled:hover:bg-transparent"
          >
            {downloading ? "Generando…" : "Descargar presupuesto en PDF"}
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

        <div className="mt-10">
          <h2 className="text-[18px] font-bold text-navy">¿Quieres que te llamemos sobre esta opción?</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Déjanos tu teléfono y un asesor te llama para confirmar tu presupuesto con {entry.compania}.
          </p>
          <div className="mt-4">
            <CallRequestForm
              showHeading={false}
              compania={entry.compania}
              precioElegido={producto === "vida" ? precioVida.precio : precioSalud.conCopago}
            />
          </div>
        </div>
      </main>
      <WhatsAppHelpWidget message={`¿Necesitas ayuda con tu opción con ${entry.compania}?`} waHref={whatsAppUrl(widgetWaText)} />
    </>
  );
}
