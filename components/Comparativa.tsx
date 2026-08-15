"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MinimalTopBar } from "./MinimalTopBar";
import { NextSteps } from "./NextSteps";
import { WhatsAppHelpWidget } from "./WhatsAppHelpWidget";
import { Check } from "./icons";
import { BRAND_NAME, PARTNERS } from "@/lib/brand";
import { ZONA_OPTIONS } from "@/lib/forms";
import type { Product } from "@/lib/catalog";
import {
  loadQuote, updateQuote, saludPrice, vidaPrice, autoPrice, decesosPrice, quoteNumber, ageFromDob,
  buildWhatsAppText, whatsAppUrl, slugify, type QuoteProfile,
} from "@/lib/quote";

function euros(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "Mapfre, Adeslas, Asisa, Zurich y Generali" — nombrar las aseguradoras
// reales pesa más como prueba de que se ha comparado de verdad que un
// genérico "las principales compañías".
function naturalList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}
const PARTNERS_LIST = naturalList(PARTNERS);

function tarificadorHref(producto: string) {
  if (producto === "vida") return "/tarificador-vida";
  if (producto === "auto") return "/tarificador-auto";
  if (producto === "decesos") return "/tarificador-decesos";
  return "/tarificador";
}

const COBERTURA_LABELS: Record<string, string> = {
  terceros: "Terceros",
  terceros_ampliado: "Terceros ampliado",
  todo_riesgo: "Todo riesgo",
  no_lo_tengo_claro: "Sin decidir",
};

// Precios REALES devueltos por Codeoscopic (motor Avant2). Sólo se pide el
// snapshot para ramo salud (los otros aún no tienen mapper server-side, ver
// lib/codeoscopicMap.ts). Si Codeoscopic no está configurado, el endpoint
// responde { ok:false, reason:"not_configured" } y la comparativa se queda
// con el catálogo mock — degradación silenciosa documentada.
type RealQuote = {
  id: string;
  compania: string;
  producto: string;
  modalidad: string;
  premium: number | null;
  downPayment: number | null;
  frequency: string;
  estimate: boolean;
};
type RealStatus = "idle" | "loading" | "done" | "unavailable" | "error";

export function Comparativa() {
  const searchParams = useSearchParams();
  const productoParam = searchParams.get("producto");
  const producto = productoParam === "vida" ? "vida" : productoParam === "auto" ? "auto" : productoParam === "decesos" ? "decesos" : "salud";
  const presupuestoIdParam = searchParams.get("pid") ?? "";

  const [quote, setQuote] = useState<QuoteProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState(false);
  const [cp, setCp] = useState("");
  const [n, setN] = useState(1);
  const [dental, setDental] = useState(false);
  const [fumador, setFumador] = useState(false);
  const [coberturaDeseada, setCoberturaDeseada] = useState("");
  // Precios reales de Codeoscopic. Se pueblan al montar si producto=salud y
  // hay ?pid=... en la URL. Fallback silencioso al catálogo mock si falta
  // cualquier pieza (Codeoscopic no configurado, lead sin datos suficientes,
  // etc.). Ver app/api/quote/create y app/api/quote/[insuranceId].
  const [realQuotes, setRealQuotes] = useState<RealQuote[]>([]);
  const [realStatus, setRealStatus] = useState<RealStatus>("idle");
  // insuranceId real de Codeoscopic — se muestra al pie de la sección de
  // precios reales como "Cotización Codeoscopic Nº XYZ" para que el asesor
  // lo pueda referenciar en la llamada. Se rellena al primer POST /create.
  const [insuranceId, setInsuranceId] = useState("");
  // Modal de coberturas de una cotización concreta (Ver coberturas → detalle).
  const [coveragesFor, setCoveragesFor] = useState<RealQuote | null>(null);
  const pollingRef = useRef<{ stop: boolean }>({ stop: false });

  useEffect(() => {
    const q = loadQuote();
    setQuote(q);
    setLoaded(true);
    if (q) {
      setCp(q.codigoPostal ?? "");
      setN(q.numAsegurados ?? 1);
      setDental(!!q.coberturaDental);
      setFumador(!!q.fumador);
      setCoberturaDeseada(q.coberturaDeseada ?? "");
    }
  }, []);

  useEffect(() => {
    fetch(`/api/products?producto=${producto}`)
      .then((r) => r.json())
      .then((body) => { if (body.ok) setProducts(body.products); })
      .catch(() => {});
  }, [producto]);

  // Solicita cotizaciones reales a Codeoscopic + polling hasta que dejen de
  // estar en estimate=true (o hasta un timeout de 90s: pasado ese tiempo,
  // dejamos de martillear y mostramos lo que haya). Sólo salud por ahora.
  useEffect(() => {
    if (producto !== "salud" || !presupuestoIdParam) return;
    const local: { stop: boolean } = { stop: false };
    pollingRef.current = local;
    setRealStatus("loading");

    function parseSnapshot(snapshot: unknown): RealQuote[] {
      if (!snapshot || typeof snapshot !== "object") return [];
      const s = snapshot as { mainQuotes?: unknown[]; addonQuotes?: unknown[] };
      const all = [...(s.mainQuotes ?? []), ...(s.addonQuotes ?? [])];
      return all
        .map((raw): RealQuote | null => {
          if (!raw || typeof raw !== "object") return null;
          const q = raw as {
            id?: string;
            product?: { name?: string; vendor?: { name?: string }; modality?: { name?: string; category?: { name?: string } } };
            premium?: number;
            downPayment?: number;
            paymentFrequency?: { id?: string };
            estimate?: boolean;
          };
          if (!q.id) return null;
          const compania = q.product?.vendor?.name?.trim() || "";
          const modalidad = q.product?.modality?.name?.trim() || "";
          return {
            id: q.id,
            compania: compania || (q.product?.name ?? "Compañía"),
            producto: q.product?.name?.trim() || "",
            modalidad,
            premium: typeof q.premium === "number" ? q.premium : null,
            downPayment: typeof q.downPayment === "number" ? q.downPayment : null,
            frequency: q.paymentFrequency?.id ?? "",
            estimate: !!q.estimate,
          };
        })
        .filter((q): q is RealQuote => q !== null);
    }

    (async () => {
      try {
        const createRes = await fetch("/api/quote/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presupuestoId: presupuestoIdParam }),
        });
        const createBody = (await createRes.json().catch(() => null)) as
          | { ok: true; insuranceId: string; snapshot: unknown }
          | { ok: false; reason: string }
          | null;
        if (local.stop) return;
        if (!createBody?.ok) {
          setRealStatus(createBody?.reason === "not_configured" ? "unavailable" : "error");
          return;
        }
        const initial = parseSnapshot(createBody.snapshot);
        if (initial.length) setRealQuotes(initial);
        setInsuranceId(createBody.insuranceId);
        // Si ya vinieron cerradas todas de golpe, no polleamos.
        const alreadyDone = initial.length > 0 && initial.every((q) => !q.estimate && q.premium != null);
        if (alreadyDone) { setRealStatus("done"); return; }

        const insuranceId = createBody.insuranceId;
        const started = Date.now();
        const TIMEOUT_MS = 90_000;
        const INTERVAL_MS = 4_000;
        while (!local.stop && Date.now() - started < TIMEOUT_MS) {
          await new Promise((r) => setTimeout(r, INTERVAL_MS));
          if (local.stop) return;
          // Pasamos pid al polling para que el endpoint persista el snapshot
          // en el presupuesto server-side (para el bloque de admin).
          const pollRes = await fetch(`/api/quote/${encodeURIComponent(insuranceId)}?pid=${encodeURIComponent(presupuestoIdParam)}`);
          const pollBody = (await pollRes.json().catch(() => null)) as
            | { ok: true; done: boolean; snapshot: unknown }
            | { ok: false }
            | null;
          if (local.stop) return;
          if (!pollBody?.ok) continue;
          const parsed = parseSnapshot(pollBody.snapshot);
          if (parsed.length) setRealQuotes(parsed);
          if (pollBody.done) { setRealStatus("done"); return; }
        }
        setRealStatus("done"); // timeout: mostramos lo que haya llegado
      } catch (err) {
        console.error("[comparativa] Codeoscopic falló:", err);
        if (!local.stop) setRealStatus("error");
      }
    })();

    return () => { local.stop = true; };
  }, [producto, presupuestoIdParam]);

  function saveEdits() {
    const next = updateQuote({
      codigoPostal: cp,
      numAsegurados: Math.max(1, Math.min(9, n)),
      coberturaDental: dental,
      fumador,
      coberturaDeseada,
    });
    if (next) setQuote(next);
    setEditing(false);
  }

  if (loaded && !quote) {
    return (
      <>
        <main id="contenido" className="mx-auto max-w-app px-5 py-14 text-center md:max-w-xl md:py-20">
          <MinimalTopBar />
          <p className="text-[16px] leading-relaxed text-slate2">
            No encontramos los datos de tu comparativa. Vuelve a calcular tu precio para verla.
          </p>
          <a
            href={tarificadorHref(producto)}
            className="mt-5 inline-flex items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
          >
            Calcula tu precio
          </a>
        </main>
      </>
    );
  }

  const age = ageFromDob(quote?.fechaNacimiento);
  const waText = buildWhatsAppText({ producto, quote });
  const widgetWaText = buildWhatsAppText({ producto, quote, origen: "comparativa" });
  const firstName = quote?.nombre?.trim().split(/\s+/)[0];

  return (
    <>
      <main id="contenido" className="mx-auto max-w-app px-5 py-14 md:max-w-2xl md:py-20">
        <MinimalTopBar />
        <div className="grid h-16 w-16 place-items-center rounded-full bg-navy text-white">
          <Check width={30} height={30} />
        </div>
        <h1 className="mt-6 text-[28px] font-extrabold leading-tight text-navy">
          {firstName ? `${firstName}, esto es lo que puedes pagar` : "Esto es lo que puedes pagar"}
        </h1>
        {quote && (
          <p className="mt-1 text-[13px] font-semibold tnums text-slate2">Presupuesto nº {quoteNumber(quote.id)}</p>
        )}
        <p className="mt-3 text-[16px] leading-relaxed text-slate2">
          Hemos comparado tu perfil entre {PARTNERS_LIST} para darte el precio más ajustado.
          {" "}Un asesor de {BRAND_NAME} te llama para confirmar tu propuesta final, sin compromiso.
        </p>

        {/* Recap + edición de datos */}
        {quote && (
          <div className="mt-5 rounded-card border border-hair bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-bold text-navy">Tus datos</p>
              <button
                type="button"
                onClick={() => setEditing((e) => !e)}
                className="text-[13px] font-semibold text-navy underline"
              >
                {editing ? "Cancelar" : "Editar y recalcular"}
              </button>
            </div>

            {!editing ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <dt className="text-slate2">Zona</dt>
                <dd className="text-right font-semibold text-ink">{quote.codigoPostal || "—"}</dd>
                {producto === "salud" && (
                  <>
                    <dt className="text-slate2">Personas a asegurar</dt>
                    <dd className="text-right font-semibold tnums text-ink">{quote.numAsegurados ?? 1}</dd>
                    <dt className="text-slate2">Cobertura dental</dt>
                    <dd className="text-right font-semibold text-ink">{quote.coberturaDental ? "Sí" : "No"}</dd>
                  </>
                )}
                {producto === "vida" && (
                  <>
                    <dt className="text-slate2">Fumador</dt>
                    <dd className="text-right font-semibold text-ink">{quote.fumador ? "Sí" : "No"}</dd>
                  </>
                )}
                {producto === "decesos" && (
                  <>
                    <dt className="text-slate2">Personas a asegurar</dt>
                    <dd className="text-right font-semibold tnums text-ink">{quote.numAsegurados ?? 1}</dd>
                  </>
                )}
                {producto === "auto" && (
                  <>
                    <dt className="text-slate2">Vehículo</dt>
                    <dd className="text-right font-semibold capitalize text-ink">{quote.tipoVehiculo || "—"}</dd>
                    <dt className="text-slate2">Cobertura</dt>
                    <dd className="text-right font-semibold text-ink">{COBERTURA_LABELS[quote.coberturaDeseada ?? ""] ?? "—"}</dd>
                  </>
                )}
                {age !== null && (
                  <>
                    <dt className="text-slate2">Edad</dt>
                    <dd className="text-right font-semibold tnums text-ink">{age} años</dd>
                  </>
                )}
              </dl>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <span className="mb-1.5 block text-[13px] font-semibold text-ink">Zona</span>
                  <div className="flex flex-wrap gap-2">
                    {ZONA_OPTIONS.map((z) => (
                      <button key={z.value} type="button" aria-pressed={cp === z.value} onClick={() => setCp(z.value)}
                        className={`rounded-pill border px-3.5 py-2 text-[13px] font-medium transition-colors ${cp === z.value ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}>
                        {z.label}
                      </button>
                    ))}
                  </div>
                </div>
                {producto === "salud" && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-semibold text-ink">Personas a asegurar</span>
                      <input
                        type="number" min={1} max={9} value={n}
                        onChange={(e) => setN(Number(e.target.value) || 1)}
                        className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[15px] tnums text-ink"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between rounded-card border border-hair px-4 py-3">
                      <span className="text-[13px] font-semibold text-ink">Cobertura dental</span>
                      <input type="checkbox" checked={dental} onChange={(e) => setDental(e.target.checked)} className="h-5 w-5 accent-navy" />
                    </label>
                  </>
                )}
                {producto === "vida" && (
                  <label className="flex cursor-pointer items-center justify-between rounded-card border border-hair px-4 py-3">
                    <span className="text-[13px] font-semibold text-ink">Fumador</span>
                    <input type="checkbox" checked={fumador} onChange={(e) => setFumador(e.target.checked)} className="h-5 w-5 accent-navy" />
                  </label>
                )}
                {producto === "decesos" && (
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-semibold text-ink">Personas a asegurar</span>
                    <input
                      type="number" min={1} max={9} value={n}
                      onChange={(e) => setN(Number(e.target.value) || 1)}
                      className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[15px] tnums text-ink"
                    />
                  </label>
                )}
                {producto === "auto" && (
                  <div>
                    <span className="mb-1.5 block text-[13px] font-semibold text-ink">Cobertura deseada</span>
                    <div className="flex flex-wrap gap-2">
                      {(["terceros", "terceros_ampliado", "todo_riesgo"] as const).map((c) => (
                        <button key={c} type="button" aria-pressed={coberturaDeseada === c} onClick={() => setCoberturaDeseada(c)}
                          className={`rounded-pill border px-3.5 py-2 text-[13px] font-medium transition-colors ${coberturaDeseada === c ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}>
                          {COBERTURA_LABELS[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={saveEdits}
                  className="mt-1 flex items-center justify-center rounded-card bg-navy px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep"
                >
                  Recalcular precios
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 rounded-card border border-hair bg-mist p-4">
          <p className="text-[13px] font-bold text-navy">
            {producto === "salud" && realQuotes.length > 0 ? "Precios reales de las aseguradoras" : "Precios orientativos"}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            {producto === "salud" && realStatus === "loading" && (
              realQuotes.length > 0
                ? `Consultando en tiempo real con las aseguradoras — ${realQuotes.length} ${realQuotes.length === 1 ? "compañía" : "compañías"} ${realQuotes.length === 1 ? "ha" : "han"} respondido, esperando al resto…`
                : "Estamos afinando los precios en tiempo real con las aseguradoras… esto puede tardar unos segundos."
            )}
            {producto === "salud" && realStatus === "done" && realQuotes.length > 0 && `Precios reales de ${realQuotes.length} ${realQuotes.length === 1 ? "aseguradora" : "aseguradoras"} devueltos por el motor de tarificación. Tu asesor confirma el detalle final sin compromiso.`}
            {(producto !== "salud" || realStatus === "unavailable" || realStatus === "error" || (realStatus !== "loading" && realQuotes.length === 0)) && "El precio final depende de tu perfil; tu asesor te lo confirma sin compromiso."}
          </p>
        </div>

        {producto === "salud" && realQuotes.length > 0 && (
          <ul className="mt-5 flex flex-col gap-3">
            {realQuotes.map((q) => (
              <li key={q.id} className="rounded-card border border-brand-red bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[16px] font-bold text-ink">{q.compania}</span>
                    {(q.producto || q.modalidad) && (
                      <span className="text-[12px] text-slate2">
                        {[q.producto, q.modalidad].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                  <p className="text-right text-[14px] text-slate2">
                    {q.premium != null
                      ? <>Desde <span className="text-[17px] font-extrabold tnums text-navy">{euros(q.premium)} €</span>/{q.frequency === "Monthly" ? "mes" : "año"}</>
                      : <span className="text-[13px] italic text-slate2">Calculando…</span>}
                  </p>
                </div>
                {q.downPayment != null && q.downPayment > 0 && q.downPayment !== q.premium && (
                  <p className="mt-1 text-[12px] text-slate2">
                    Primera prima: <span className="font-semibold tnums text-ink">{euros(q.downPayment)} €</span>
                  </p>
                )}
                {q.estimate && <p className="mt-1 text-[11px] italic text-slate2">Precio orientativo — puede afinarse con más datos.</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setCoveragesFor(q)}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy underline underline-offset-2 hover:text-brand-red"
                  >
                    Ver coberturas
                  </button>
                  {q.premium != null && <CompanyActions producto={producto} compania={q.compania} precio={q.premium} />}
                </div>
              </li>
            ))}
          </ul>
        )}
        {coveragesFor && insuranceId && (
          <CoveragesModal insuranceId={insuranceId} quote={coveragesFor} onClose={() => setCoveragesFor(null)} />
        )}

        {producto === "salud" && realQuotes.length > 0 && insuranceId && (
          <p className="mt-3 text-[11px] leading-relaxed text-slate2">
            Cotización Codeoscopic Nº <span className="tnums font-semibold text-ink">{insuranceId}</span>
            <span className="text-slate2/80"> · Guárdalo por si tu asesor te lo pide para localizarlo al instante.</span>
          </p>
        )}

        <ul className={`mt-5 flex-col gap-3 ${producto === "salud" && realQuotes.length > 0 ? "hidden" : "flex"}`}>
          {producto !== "salud"
            ? products.map((c) => {
                const price = producto === "auto"
                  ? autoPrice({ precio: c.precio ?? 0 }, { antiguedadCarnet: quote?.antiguedadCarnet, coberturaDeseada: quote?.coberturaDeseada })
                  : producto === "decesos"
                  ? decesosPrice({ precio: c.precio ?? 0 }, { numAsegurados: quote?.numAsegurados })
                  : vidaPrice({ precio: c.precio ?? 0 }, { fumador: quote?.fumador });
                return (
                  <li key={c.id} className={`rounded-card border bg-white p-4 shadow-soft ${c.destacado ? "border-brand-red" : "border-hair"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {c.logoUrl
                          ? <CompanyLogo logoUrl={c.logoUrl} compania={c.compania} size="h-8 max-w-[110px]" />
                          : <span className="text-[16px] font-bold text-ink">{c.compania}</span>}
                        {c.destacado && <span className="rounded-pill bg-brand-red/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-red">Recomendado</span>}
                      </div>
                      <p className="text-right text-[14px] text-slate2">
                        Desde <span className="text-[17px] font-extrabold tnums text-navy">{euros(price.precio)} €</span>/mes
                      </p>
                    </div>
                    <CompanyActions producto={producto} compania={c.compania} precio={price.precio} />
                  </li>
                );
              })
            : products.map((c) => {
                const price = saludPrice({ conCopago: c.precioConCopago ?? 0, sinCopago: c.precioSinCopago ?? 0 }, { numAsegurados: quote?.numAsegurados, coberturaDental: quote?.coberturaDental });
                return (
                  <li key={c.id} className={`rounded-card border bg-white p-4 shadow-soft ${c.destacado ? "border-brand-red" : "border-hair"}`}>
                    <div className="flex items-center gap-2">
                      {c.logoUrl
                        ? <CompanyLogo logoUrl={c.logoUrl} compania={c.compania} size="h-8 max-w-[110px]" />
                        : <span className="text-[16px] font-bold text-ink">{c.compania}</span>}
                      {c.destacado && <span className="rounded-pill bg-brand-red/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-red">Recomendado</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[13px] text-slate2">
                      <span>Con copago</span>
                      <span className="text-[15px] font-extrabold tnums text-navy">{euros(price.conCopago)} €/mes</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-[13px] text-slate2">
                      <span>Sin copago</span>
                      <span className="text-[15px] font-extrabold tnums text-navy">{euros(price.sinCopago)} €/mes</span>
                    </div>
                    <CompanyActions producto={producto} compania={c.compania} precio={price.conCopago} />
                  </li>
                );
              })}
        </ul>

        <NextSteps whatsappHref={whatsAppUrl(waText)} showCaller={false} />
      </main>
      <WhatsAppHelpWidget message={firstName ? `${firstName}, ¿necesitas ayuda para elegir?` : "¿Necesitas ayuda para elegir?"} waHref={whatsAppUrl(widgetWaText)} />
    </>
  );
}

export function CompanyLogo({
  logoUrl, compania, size = "h-6 max-w-[72px]",
}: { logoUrl?: string; compania: string; size?: string }) {
  if (!logoUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={logoUrl} alt={compania} className={`w-auto shrink-0 object-contain ${size}`} />;
}

function CompanyActions({ producto, compania, precio }: { producto: string; compania: string; precio: number }) {
  return (
    <div className="mt-3 flex gap-2">
      <a
        href={`/comparativa/${slugify(compania)}?producto=${producto}`}
        className="flex-1 rounded-card border border-hair px-3 py-2.5 text-center text-[13px] font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-mist"
      >
        Más información
      </a>
      <a
        href={`/quiero-que-me-llamen?producto=${producto}&compania=${encodeURIComponent(compania)}&precio=${precio}`}
        className="flex-1 rounded-card bg-brand-red px-3 py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
      >
        Que te llamen gratis
      </a>
    </div>
  );
}

/* ---------------------------- Modal de coberturas -------------------------- */
// Detalle de coberturas real de la cotización, tal cual lo devuelve
// Codeoscopic. Se agrupan por categoría (Coberturas médicas, Dental,
// Extras…) — el shape lo normaliza el propio endpoint server-side
// (/api/quote/{id}/coverages), aquí solo pintamos.
type CoverageItem = { concepto: string; descripcion: string; cubierto: boolean; limite: string; copago: string };
type CoverageGroup = { categoria: string; items: CoverageItem[] };
type CoveragesState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; grupos: CoverageGroup[] };

function CoveragesModal({ insuranceId, quote, onClose }: { insuranceId: string; quote: RealQuote; onClose: () => void }) {
  const [state, setState] = useState<CoveragesState>({ kind: "loading" });

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const res = await fetch(`/api/quote/${encodeURIComponent(insuranceId)}/coverages?quoteId=${encodeURIComponent(quote.id)}`);
        const body = (await res.json().catch(() => null)) as { ok: true; grupos: CoverageGroup[] } | { ok: false; reason: string } | null;
        if (stop) return;
        if (!body?.ok) {
          const reasonLabel =
            body?.reason === "not_configured" ? "El motor de coberturas no está activo en este momento."
            : body?.reason === "offer_not_found" ? "No pudimos localizar el detalle de coberturas para esta cotización."
            : "No pudimos cargar las coberturas. Inténtalo de nuevo en un momento.";
          setState({ kind: "error", message: reasonLabel });
          return;
        }
        setState({ kind: "ok", grupos: body.grupos });
      } catch {
        if (!stop) setState({ kind: "error", message: "Fallo de red. Inténtalo de nuevo." });
      }
    })();
    return () => { stop = true; };
  }, [insuranceId, quote.id]);

  // Bloquear scroll de fondo mientras el modal está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Coberturas de ${quote.compania}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-t-[24px] bg-white shadow-card md:rounded-[24px]">
        <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-hair bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate2">Coberturas</p>
            <h3 className="truncate text-[17px] font-extrabold text-navy">{quote.compania}</h3>
            {(quote.producto || quote.modalidad) && (
              <p className="truncate text-[12px] text-slate2">
                {[quote.producto, quote.modalidad].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button
            type="button" onClick={onClose} aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-slate2 transition-colors hover:bg-mist"
          >
            ✕
          </button>
        </header>
        <div className="max-h-[calc(90vh-72px)] overflow-y-auto px-5 pb-6 pt-4">
          {state.kind === "loading" && (
            <p className="py-8 text-center text-[13px] text-slate2">Cargando coberturas…</p>
          )}
          {state.kind === "error" && (
            <p role="alert" className="py-8 text-center text-[13px] font-medium text-brand-red">{state.message}</p>
          )}
          {state.kind === "ok" && state.grupos.length === 0 && (
            <p className="py-8 text-center text-[13px] text-slate2">La aseguradora no ha proporcionado detalle de coberturas para este producto.</p>
          )}
          {state.kind === "ok" && state.grupos.map((g) => (
            <section key={g.categoria} className="mt-4 first:mt-0">
              <h4 className="text-[13px] font-bold uppercase tracking-wide text-brand-red">{g.categoria}</h4>
              <ul className="mt-2 divide-y divide-hair rounded-card border border-hair bg-white">
                {g.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-3 p-3">
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                        it.cubierto ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                      aria-hidden="true"
                    >
                      {it.cubierto ? <Check width={14} height={14} /> : "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-ink">{it.concepto}</p>
                      {it.descripcion && <p className="mt-0.5 text-[12px] leading-relaxed text-slate2">{it.descripcion}</p>}
                      {(it.limite || it.copago) && (
                        <p className="mt-1 text-[12px] tnums text-slate2">
                          {it.limite && <>Límite: <span className="font-semibold text-ink">{it.limite}</span></>}
                          {it.limite && it.copago && <span className="px-1.5 text-slate2/50">·</span>}
                          {it.copago && <>Copago: <span className="font-semibold text-ink">{it.copago}</span></>}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
