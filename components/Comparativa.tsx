"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MinimalTopBar } from "./MinimalTopBar";
import { NextSteps } from "./NextSteps";
import { WhatsAppHelpWidget } from "./WhatsAppHelpWidget";
import { ComparativaHelpBar } from "./ComparativaHelpBar";
import { Check } from "./icons";
import { PriceMatchForm } from "./PriceMatchForm";
import { EssentialConsentCheckbox, ComercialConsentCheckbox } from "./EssentialConsent";
import { BRAND_NAME, PARTNERS } from "@/lib/brand";
import { ZONA_OPTIONS } from "@/lib/forms";
import { normalizePhone } from "@/lib/schema";
import type { Product } from "@/lib/catalog";
import {
  loadQuote, updateQuote, saludPrice, vidaPrice, autoPrice, decesosPrice, quoteNumber, ageFromDob,
  buildWhatsAppText, whatsAppUrl, slugify, type QuoteProfile,
  loadLeadDraft, clearLeadDraft,
} from "@/lib/quote";
import { saveClientProfile, addClientQuote } from "@/lib/clientArea";
import { pushDataLayerEvent } from "@/lib/dataLayer";

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
  imageUrl?: string;
  categoria?: string;
  rating?: number | null;
  deductible?: number | null;
  docUrl?: string;
};
type RealStatus = "idle" | "loading" | "done" | "unavailable" | "error";

/* -------------------------- Filtros de salud ------------------------------ */
// Filtros multi-selección de la comparativa de salud. Clasificamos cada opción
// (producto manual o cotización real) por sus propiedades conocidas; cuando una
// propiedad es DESCONOCIDA (típico en las modalidades de Codeoscopic, que no la
// declaran en el nombre) NO se oculta la opción — solo se descarta cuando se
// sabe con certeza que no cumple. Así el filtro es preciso con las opciones
// negociadas (datos explícitos) y no vacía la lista con las reales.
type SaludFilter = "copago" | "sinCopago" | "dental" | "reembolso" | "sinReembolso";
const SALUD_FILTERS: { key: SaludFilter; label: string }[] = [
  { key: "copago", label: "Con copago" },
  { key: "sinCopago", label: "Sin copago" },
  { key: "dental", label: "Con dental" },
  { key: "reembolso", label: "Con reembolso" },
  { key: "sinReembolso", label: "Sin reembolso" },
];
type OptClass = { copago: Set<"con" | "sin"> | null; dental: boolean | null; reembolso: boolean | null };

function classifyText(text: string): OptClass {
  const t = (text || "").toLowerCase();
  const copago = new Set<"con" | "sin">();
  if (t.includes("sin copago") || t.includes("reembolso") || t.includes("reintegro")) copago.add("sin");
  if (t.includes("copago") && !t.includes("sin copago")) copago.add("con");
  return {
    copago: copago.size ? copago : null,
    dental: t.includes("dental") ? true : null,
    reembolso: t.includes("reembolso") || t.includes("reintegro") ? true : null,
  };
}

// Producto manual del catálogo: datos explícitos (precios con/sin copago +
// servicios), así que su clasificación es fiable.
function classifyProduct(p: Product): OptClass {
  const copago = new Set<"con" | "sin">();
  if (p.precioConCopago != null) copago.add("con");
  if (p.precioSinCopago != null) copago.add("sin");
  const servicios = (p.servicios ?? []).join(" ").toLowerCase();
  return {
    copago: copago.size ? copago : null,
    dental: servicios.includes("dental"),
    reembolso: servicios.includes("reembolso") || servicios.includes("reintegro"),
  };
}

function matchesSaludFilters(cls: OptClass, active: SaludFilter[]): boolean {
  if (!active.length) return true;
  const wantCon = active.includes("copago");
  const wantSin = active.includes("sinCopago");
  if ((wantCon || wantSin) && cls.copago) {
    const ok = (wantCon && cls.copago.has("con")) || (wantSin && cls.copago.has("sin"));
    if (!ok) return false;
  }
  if (active.includes("dental") && cls.dental === false) return false;
  if (active.includes("reembolso") && cls.reembolso === false) return false;
  if (active.includes("sinReembolso") && cls.reembolso === true) return false;
  return true;
}

export function Comparativa() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productoParam = searchParams.get("producto");
  const producto = productoParam === "vida" ? "vida" : productoParam === "auto" ? "auto" : productoParam === "decesos" ? "decesos" : "salud";
  // leadId es el ancla de la tarificación real de Codeoscopic (que cuelga del
  // lead, no de un presupuesto). Viene del URL (?lead=, o ?pid= heredado) si
  // el lead ya existe, o se rellena al desbloquear el gate (que es cuando se
  // crea el lead REAL en el backend).
  const initialLead = searchParams.get("lead") ?? searchParams.get("pid") ?? "";
  const [leadId, setLeadId] = useState(initialLead);

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
  // Orden elegido por el usuario para los precios reales.
  const [sortBy, setSortBy] = useState<"default" | "precio" | "valoracion">("default");
  // Filtros multi-selección (salud): con/sin copago, dental, con/sin reembolso.
  const [filters, setFilters] = useState<SaludFilter[]>([]);
  function toggleFilter(k: SaludFilter) {
    setFilters((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
  }
  const sortedRealQuotes = useMemo(() => {
    const list = realQuotes.filter((q) => matchesSaludFilters(classifyText(`${q.producto} ${q.modalidad} ${q.categoria ?? ""}`), filters));
    if (sortBy === "precio") {
      // Precio menor primero; los que aún no tienen premium van al final.
      list.sort((a, b) => (a.premium ?? Infinity) - (b.premium ?? Infinity));
    } else if (sortBy === "valoracion") {
      // Mayor valoración primero; sin valoración al final.
      list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    }
    return list; // "default": orden tal cual llega de Codeoscopic
  }, [realQuotes, sortBy, filters]);
  // Opciones NEGOCIADAS por Asegurados Ventajón = catálogo manual de salud
  // (todas las activas visibles, ordenadas destacado→orden por listProducts).
  // Se muestran SIEMPRE arriba del todo, como recomendadas con badge, por
  // encima de los precios reales de Codeoscopic. Se les aplican los filtros.
  const negociadas = useMemo(
    () => products.filter((p) => matchesSaludFilters(classifyProduct(p), filters)),
    [products, filters],
  );
  // insuranceId real de Codeoscopic — se muestra al pie de la sección de
  // precios reales como "Cotización Codeoscopic Nº XYZ" para que el asesor
  // lo pueda referenciar en la llamada. Se rellena al primer POST /create.
  const [insuranceId, setInsuranceId] = useState("");
  // Modal de coberturas de una cotización concreta (Ver coberturas → detalle).
  const [coveragesFor, setCoveragesFor] = useState<RealQuote | null>(null);
  // Modal de rescate "igualación de precio" — se ofrece al usuario que ya
  // vio las cotizaciones (reales o mock) por si tiene un precio más bajo de
  // otra fuente y quiere que se lo estudiemos.
  const [priceMatchOpen, setPriceMatchOpen] = useState(false);
  const pollingRef = useRef<{ stop: boolean }>({ stop: false });

  // Comparativa bloqueada tras un blur pesado + modal fullscreen hasta que
  // el usuario confirma contacto y consentimientos. Dos modos:
  //  · "gate-obligatorio" (nuevo flujo salud/vida): no hay pid, hay un
  //    draft de tarificación en sessionStorage. Al enviar el modal, se
  //    crea el lead REAL en backend con todos los datos combinados.
  //  · "gate-legacy" (auto/decesos, o link antiguo con pid): el lead ya
  //    existe; el modal solo pide los datos que puedan faltar y refresca
  //    el contacto vía /api/client/update-contact.
  const [unlocked, setUnlocked] = useState(false);
  const [gateNombre, setGateNombre] = useState("");
  const [gateApellido1, setGateApellido1] = useState("");
  // Segundo apellido: Codeoscopic exige nombre + DOS apellidos para el titular
  // con DNI ("The name and surnames of the holder are not valid." si falta).
  const [gateApellido2, setGateApellido2] = useState("");
  // DNI/NIE del titular: obligatorio en salud para que Codeoscopic tarifique
  // con precios reales (no de catálogo).
  const [gateDocumentoTipo, setGateDocumentoTipo] = useState<"Dni" | "Nie">("Dni");
  const [gateDocumento, setGateDocumento] = useState("");
  const [gateTelefono, setGateTelefono] = useState("");
  const [gateEmail, setGateEmail] = useState("");
  // Un único check cubre privacidad + autorización de contacto + (si aplica)
  // datos de salud — ver components/EssentialConsent.tsx.
  const [gateAceptaEsencial, setGateAceptaEsencial] = useState(false);
  const [gateAceptaComercial, setGateAceptaComercial] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  // Producto es salud/vida: el consentimiento art. 9 RGPD es obligatorio.
  const isHealthLike = producto === "salud" || producto === "vida";
  // Modal obligatorio (no cerrable) cuando estamos creando el lead ahora
  // desde el modal — es decir, cuando hay draft pendiente. Cuando el lead
  // ya existe (pid en URL), el modal actúa como refresco opcional pero se
  // puede cerrar con "Ver sin completar" como antes.
  const mustGate = hasDraft;

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
      setGateNombre(q.nombre ?? "");
      setGateTelefono(q.telefono ?? "");
      setGateEmail(q.email ?? "");
    }
    // Detectar draft pendiente — significa que venimos del tarificador y
    // aún no se ha creado el lead (flujo salud/vida unificado 2026-08).
    const draft = loadLeadDraft();
    if (draft) {
      setHasDraft(true);
    } else {
      // El lead ya existe (volvemos de "Más información" o de una opción, o
      // recargamos con ?pid=...). No hay que volver a bloquear ni re-pedir los
      // datos: restauramos el pid y desbloqueamos si ya se pasó el gate antes
      // (tenemos pid en la URL, o un presupuesto/contacto guardado).
      const restoredLead = initialLead || q?.leadId || "";
      if (restoredLead && !leadId) setLeadId(restoredLead);
      const yaPasoGate = !!(restoredLead || (q?.nombre && q?.telefono && q?.email));
      if (yaPasoGate) setUnlocked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function unlockComparativa(e: React.FormEvent) {
    e.preventDefault();
    setGateError(null);
    if (!gateNombre.trim() || gateNombre.trim().length < 2) { setGateError("Dinos tu nombre."); return; }
    if (producto === "salud" && (!gateApellido1.trim() || gateApellido1.trim().length < 2)) {
      setGateError("Dinos tu primer apellido."); return;
    }
    if (producto === "salud" && (!gateApellido2.trim() || gateApellido2.trim().length < 2)) {
      setGateError("Dinos tu segundo apellido."); return;
    }
    if (producto === "salud") {
      const doc = gateDocumento.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
      if (!/^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(doc)) {
        setGateError("Revisa tu DNI o NIE (p. ej. 12345678Z)."); return;
      }
    }
    if (!/^[6-9]\d{8}$/.test(normalizePhone(gateTelefono))) { setGateError("Introduce un móvil español válido (9 dígitos)."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gateEmail.trim())) { setGateError("Revisa tu correo electrónico."); return; }
    if (!gateAceptaEsencial) {
      setGateError(isHealthLike
        ? "Necesitamos tu consentimiento para tratar tus datos de salud (art. 9 RGPD)."
        : "Necesitamos que aceptes la política de privacidad."
      );
      return;
    }

    setGateSubmitting(true);
    const nowIso = new Date().toISOString();
    try {
      const draft = loadLeadDraft();
      if (draft) {
        // Nuevo flujo: creamos el lead REAL con datos combinados. El
        // backend ya valida strict con los schemas Zod correspondientes.
        const consent = {
          privacidadAt: nowIso,
          contactoAt: nowIso,
          ...(isHealthLike ? { datosSaludAt: nowIso } : {}),
          ...(gateAceptaComercial ? { comercialAt: nowIso } : {}),
        };
        const payload = {
          ...draft.data,
          nombre: gateNombre,
          ...(producto === "salud"
            ? { apellido1: gateApellido1, apellido2: gateApellido2, documentoTipo: gateDocumentoTipo, documento: gateDocumento.trim().toUpperCase() }
            : {}),
          telefono: gateTelefono,
          email: gateEmail,
          aceptaPrivacidad: true,
          autorizaContacto: true,
          ...(isHealthLike ? { aceptaDatosSalud: true } : {}),
          aceptaComercial: gateAceptaComercial,
          consent,
        };
        const res = await fetch(draft.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; error?: string; errors?: Record<string, string[]> } | null;
        if (!res.ok || !body?.ok) {
          const first = body?.errors ? Object.values(body.errors).find((v) => v && v[0])?.[0] : undefined;
          setGateError(first ?? body?.error ?? "No hemos podido enviar tus datos. Inténtalo de nuevo.");
          setGateSubmitting(false);
          return;
        }
        // /api/lead ya no crea presupuesto: devuelve el leadId, que es el
        // ancla de la tarificación real de Codeoscopic.
        const newLead = body.id ?? "";
        const updated = updateQuote({
          nombre: gateNombre, telefono: gateTelefono, email: gateEmail,
          leadId: newLead, consentAt: consent,
        }) ?? {
          id: newLead, leadId: newLead, producto: draft.producto, createdAt: nowIso,
          nombre: gateNombre, telefono: gateTelefono, email: gateEmail,
          consentAt: consent,
        };
        if (updated) {
          setQuote(updated);
          addClientQuote(updated);
        }
        saveClientProfile({ nombre: gateNombre, telefono: gateTelefono, email: gateEmail });
        clearLeadDraft();
        setHasDraft(false);
        pushDataLayerEvent("generate_lead", { producto: draft.producto, form: "comparativa-gate" });
        // Reflejamos el leadId en la URL para que /comparativa recargable
        // siga funcionando (compartir enlace, back/forward) sin re-bloquear.
        if (newLead) {
          const nextUrl = `/comparativa?producto=${producto}&lead=${encodeURIComponent(newLead)}`;
          router.replace(nextUrl);
          // También seteamos el estado local para disparar el useEffect
          // de Codeoscopic sin esperar a re-lectura de searchParams.
          setLeadId(newLead);
        }
      } else {
        // Flujo legacy: el lead ya existe; solo refrescamos contacto.
        await fetch("/api/client/update-contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lookupPhone: quote?.telefono,
            lookupEmail: quote?.email,
            patch: { nombre: gateNombre, telefono: gateTelefono, email: gateEmail, aceptaComercial: gateAceptaComercial },
          }),
        });
        const next = updateQuote({ nombre: gateNombre, telefono: gateTelefono, email: gateEmail });
        if (next) setQuote(next);
      }
    } catch {
      setGateError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
      setGateSubmitting(false);
      return;
    } finally {
      setGateSubmitting(false);
    }
    setUnlocked(true);
  }

  // Salir sin dejar más datos: SOLO permitido en modo legacy (lead ya
  // existe). En modo obligatorio (draft pendiente) no hay salida — sin
  // datos de contacto no podemos crear el lead ni mostrar precios.
  function skipGate() {
    if (mustGate) return;
    setUnlocked(true);
  }

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
    if (producto !== "salud" || !leadId) return;
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
            product?: {
              name?: string; vendor?: { name?: string };
              modality?: { name?: string; category?: { name?: string }; rating?: number };
              imageUrl?: string;
            };
            premium?: number;
            downPayment?: number;
            deductible?: number;
            paymentFrequency?: { id?: string };
            estimate?: boolean;
            links?: { name?: string; url?: string }[];
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
            imageUrl: q.product?.imageUrl?.trim() || undefined,
            categoria: q.product?.modality?.category?.name?.trim() || undefined,
            rating: typeof q.product?.modality?.rating === "number" ? q.product.modality.rating : null,
            deductible: typeof q.deductible === "number" ? q.deductible : null,
            docUrl: q.links?.find((l) => l?.url)?.url?.trim() || undefined,
          };
        })
        .filter((q): q is RealQuote => q !== null);
    }

    (async () => {
      try {
        const createRes = await fetch("/api/quote/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: leadId }),
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
          // El polling se autoriza por la cookie de sesión de cliente (el lead
          // dueño de este insurance). No hace falta pasar ids en la URL.
          const pollRes = await fetch(`/api/quote/${encodeURIComponent(insuranceId)}`);
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
  }, [producto, leadId]);

  // "Que te llamen gratis" en salud = mostrar interés en una opción concreta.
  // ESTE es el momento en el que se crea el presupuesto (antes solo hay un
  // lead que ha tarificado). Después llevamos al flujo de solicitud de llamada.
  async function solicitarSalud(opts: { compania: string; precio?: number | null; quoteId?: string; modalidad?: string; insuranceId?: string }) {
    const destino = `/quiero-que-me-llamen?producto=salud&compania=${encodeURIComponent(opts.compania)}${opts.precio != null ? `&precio=${opts.precio}` : ""}`;
    try {
      if (leadId) {
        await fetch("/api/quote/interes", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            insuranceId: opts.insuranceId || undefined,
            quoteId: opts.quoteId,
            compania: opts.compania,
            precio: opts.precio ?? undefined,
            modalidad: opts.modalidad,
          }),
        });
      }
    } catch { /* best-effort: aunque falle el registro, llevamos al usuario al flujo de llamada */ }
    router.push(destino);
  }

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

  if (loaded && !quote && !hasDraft) {
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

  // Blur pesado + no scroll + inerte cuando el gate está activo. El modal
  // se renderiza APARTE (fuera del blur) para que sea nítido y usable.
  const gateBlocking = !unlocked;
  const mainBlurred = gateBlocking ? "pointer-events-none select-none blur-md" : "";
  // Bloquea el scroll del body mientras el gate esté visible — evita
  // desplazamientos por debajo del modal (que además está en blur y
  // aria-hidden). Al desbloquear, se restaura.
  useEffect(() => {
    if (!loaded || !gateBlocking) return;
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => { body.style.overflow = prev; };
  }, [gateBlocking, loaded]);

  return (
    <>
      <main id="contenido" aria-hidden={gateBlocking} className={`mx-auto max-w-app px-5 py-14 md:max-w-2xl md:py-20 ${mainBlurred}`}>
        <MinimalTopBar />
        <div className="grid h-16 w-16 place-items-center rounded-full bg-navy text-white">
          <Check width={30} height={30} />
        </div>
        <h1 className="mt-6 text-[28px] font-extrabold leading-tight text-navy">
          {firstName ? `${firstName}, esto es lo que puedes pagar` : "Esto es lo que puedes pagar"}
        </h1>
        {quote && (
          // Es una COTIZACIÓN mientras el usuario no elige una opción. Solo pasa
          // a "presupuesto" cuando pulsa "Que te llamen" (ver /api/quote/interes).
          <p className="mt-1 text-[13px] font-semibold tnums text-slate2">Cotización nº {quoteNumber(quote.leadId || quote.id)}</p>
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

        <div className="mt-5">
          <div>
            <div className="rounded-card border border-hair bg-mist p-4">
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

            {/* Ofertas comerciales cerradas por el asesor (productos del
                catálogo marcados como destacado). Van SIEMPRE arriba del todo,
                por encima de los precios reales de Codeoscopic, con badge.
                Solo cuando hay precios reales: en el fallback sin Codeoscopic,
                la lista mock de abajo ya coloca los destacados primero. */}
            {/* Barra de filtros (multi-selección) + orden. Los filtros afectan
                TANTO a las opciones negociadas como a los precios reales; el
                orden solo aplica a los precios reales de Codeoscopic. El usuario
                puede activar varios filtros a la vez (con/sin copago, dental,
                con/sin reembolso). */}
            {producto === "salud" && (negociadas.length > 0 || realQuotes.length > 0) && (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {SALUD_FILTERS.map((f) => {
                    const active = filters.includes(f.key);
                    return (
                      <button
                        key={f.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleFilter(f.key)}
                        tabIndex={unlocked ? 0 : -1}
                        className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                          active
                            ? "border-brand-red bg-brand-red text-white"
                            : "border-hair bg-white text-navy hover:border-navy/40 hover:bg-mist"
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                  {filters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilters([])}
                      tabIndex={unlocked ? 0 : -1}
                      className="text-[12px] font-semibold text-slate2 underline underline-offset-2 hover:text-brand-red"
                    >
                      Quitar filtros
                    </button>
                  )}
                </div>
                {realQuotes.length > 1 && (
                  <div className="flex items-center justify-end gap-2">
                    <label htmlFor="cmp-sort" className="text-[12px] font-semibold text-slate2">Ordenar por</label>
                    <select
                      id="cmp-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      tabIndex={unlocked ? 0 : -1}
                      className="rounded-card border border-hair bg-white px-2.5 py-1.5 text-[12px] font-semibold text-navy focus:border-navy focus:outline-none"
                    >
                      <option value="default">Recomendado</option>
                      <option value="precio">Precio (menor primero)</option>
                      <option value="valoracion">Valoración</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Opciones NEGOCIADAS por Asegurados Ventajón (catálogo manual del
                admin): van SIEMPRE arriba del todo, como recomendadas con badge
                y borde reforzado, por encima de los precios reales de
                Codeoscopic. Visibles aunque haya cotizaciones reales — ambas
                listas conviven. Si los filtros activos dejan la lista vacía, se
                indica en lugar de desaparecer sin explicación. */}
            {producto === "salud" && negociadas.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-pill bg-brand-red px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Recomendado</span>
                  <h3 className="text-[14px] font-bold text-navy">Opciones negociadas por tu asesor</h3>
                </div>
                <ul className="flex flex-col gap-3">
                  {negociadas.map((c) => {
                    const price = saludPrice(
                      { conCopago: c.precioConCopago ?? 0, sinCopago: c.precioSinCopago ?? 0 },
                      { numAsegurados: quote?.numAsegurados, coberturaDental: quote?.coberturaDental },
                    );
                    const hasCon = c.precioConCopago != null;
                    const hasSin = c.precioSinCopago != null;
                    // Precio que viaja al "interés": con copago si existe, si no
                    // sin copago, y como último recurso el precio base.
                    const precioInteres = hasCon ? price.conCopago : hasSin ? price.sinCopago : (c.precio ?? 0);
                    return (
                      <li key={c.id} className="rounded-card border-2 border-brand-red bg-brand-red/[0.04] p-4 shadow-card">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            {c.logoUrl
                              ? <CompanyLogo logoUrl={c.logoUrl} compania={c.compania} size="h-8 max-w-[110px]" />
                              : <span className="truncate text-[16px] font-bold text-ink">{c.compania}</span>}
                            <span className="shrink-0 rounded-pill bg-brand-red/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-red">Recomendado</span>
                          </div>
                        </div>
                        {(hasCon || hasSin) && (
                          <div className="mt-2 space-y-1">
                            {hasCon && (
                              <div className="flex items-center justify-between gap-3 text-[13px] text-slate2">
                                <span>Con copago</span>
                                <span className="text-[15px] font-extrabold tnums text-navy">{euros(price.conCopago)} €/mes</span>
                              </div>
                            )}
                            {hasSin && (
                              <div className="flex items-center justify-between gap-3 text-[13px] text-slate2">
                                <span>Sin copago</span>
                                <span className="text-[15px] font-extrabold tnums text-navy">{euros(price.sinCopago)} €/mes</span>
                              </div>
                            )}
                          </div>
                        )}
                        {c.servicios?.[0] && <p className="mt-1.5 text-[12px] text-slate2">{c.servicios[0]}</p>}
                        <CompanyActions producto={producto} compania={c.compania} precio={precioInteres} locked={!unlocked} recommended onSolicitar={() => solicitarSalud({ compania: c.compania, precio: precioInteres, modalidad: "Opción negociada" })} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {producto === "salud" && negociadas.length === 0 && filters.length > 0 && (
              <p className="mt-5 rounded-card border border-hair bg-mist/40 px-4 py-3 text-[13px] text-slate2">
                Ninguna opción negociada coincide con los filtros seleccionados.
              </p>
            )}

            {producto === "salud" && realQuotes.length > 0 && (
              <p className="mt-6 mb-1 text-[13px] font-bold text-navy">Precios reales de las aseguradoras</p>
            )}
            {producto === "salud" && realQuotes.length > 0 && sortedRealQuotes.length === 0 && (
              <p className="mt-3 rounded-card border border-hair bg-mist/40 px-4 py-3 text-[13px] text-slate2">
                Ninguna cotización de las aseguradoras coincide con los filtros seleccionados.
              </p>
            )}
            {producto === "salud" && realQuotes.length > 0 && (
              <ul className="mt-3 flex flex-col gap-3">
                {sortedRealQuotes.map((q) => (
                  <li key={q.id} className="rounded-card border border-hair bg-white p-4 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {q.imageUrl
                          ? <CompanyLogo logoUrl={q.imageUrl} compania={q.compania} size="h-8 max-w-[96px]" />
                          : null}
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[16px] font-bold text-ink">{q.compania}</span>
                          {(q.producto || q.modalidad || q.categoria) && (
                            <span className="truncate text-[12px] text-slate2">
                              {[q.modalidad || q.producto, q.categoria].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {typeof q.rating === "number" && q.rating > 0 && (
                            <span aria-label={`Valoración ${q.rating} de 5`} className="text-[12px] leading-none text-amber-500">
                              {"★".repeat(Math.round(q.rating))}<span className="text-slate2/40">{"★".repeat(Math.max(0, 5 - Math.round(q.rating)))}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="shrink-0 text-right text-[14px] text-slate2">
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
                    <div className="mt-3 flex flex-col gap-2.5">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <button
                          type="button"
                          onClick={() => setCoveragesFor(q)}
                          tabIndex={unlocked ? 0 : -1}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy underline underline-offset-2 hover:text-brand-red"
                        >
                          Ver coberturas
                        </button>
                        {q.docUrl && (
                          <a
                            href={q.docUrl} target="_blank" rel="noopener noreferrer"
                            tabIndex={unlocked ? 0 : -1}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate2 underline underline-offset-2 hover:text-navy"
                          >
                            Condiciones (PDF)
                          </a>
                        )}
                      </div>
                      {q.premium != null && <CompanyActions producto={producto} compania={q.compania} precio={q.premium} locked={!unlocked} onMasInfo={() => setCoveragesFor(q)} onSolicitar={() => solicitarSalud({ compania: q.compania, precio: q.premium, quoteId: q.id, modalidad: q.modalidad, insuranceId: insuranceId || undefined })} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {coveragesFor && insuranceId && unlocked && (
              <CoveragesModal
                insuranceId={insuranceId}
                quote={coveragesFor}
                onClose={() => setCoveragesFor(null)}
                onSolicitar={() => solicitarSalud({ compania: coveragesFor.compania, precio: coveragesFor.premium, quoteId: coveragesFor.id, modalidad: coveragesFor.modalidad, insuranceId: insuranceId || undefined })}
              />
            )}

            {producto === "salud" && realQuotes.length > 0 && insuranceId && (
              <p className="mt-3 text-[11px] leading-relaxed text-slate2">
                Cotización Codeoscopic Nº <span className="tnums font-semibold text-ink">{insuranceId}</span>
                <span className="text-slate2/80"> · Guárdalo por si tu asesor te lo pide para localizarlo al instante.</span>
              </p>
            )}

            {/* Catálogo orientativo para el resto de ramos (auto/vida/decesos).
                Salud NO se renderiza aquí: sus opciones negociadas se muestran
                siempre arriba (bloque "Opciones negociadas por tu asesor") y las
                cotizaciones reales debajo. */}
            {producto !== "salud" && (
              <ul className="mt-5 flex flex-col gap-3">
                {products.map((c) => {
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
                      <CompanyActions producto={producto} compania={c.compania} precio={price.precio} locked={!unlocked} recommended={!!c.destacado} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Rescate "igualación de precio": bloque discreto pero visible
            debajo de las cotizaciones. Objetivo — recuperar al usuario que
            no se convence por precio y tiene otra oferta que quiere
            estudiar. Genera un lead con source="price-match-comparativa"
            para poder medir por separado la efectividad de este canal. */}
        <div className="mt-6 rounded-[20px] border border-hair bg-mist/50 p-5">
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-navy">¿Ya tienes un precio más bajo?</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-slate2">
                Envíanoslo y estudiamos la mejor alternativa del mercado en menos de 24 h. Gratis y sin compromiso.
              </p>
            </div>
            <button
              type="button" onClick={() => setPriceMatchOpen(true)}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-card border-2 border-navy bg-white px-5 text-[14px] font-semibold text-navy transition-colors hover:bg-mist"
            >
              Envíanos tu presupuesto →
            </button>
          </div>
        </div>

        {priceMatchOpen && (
          <div
            role="dialog" aria-modal="true" aria-label="Envíanos tu presupuesto"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
            onClick={(e) => { if (e.currentTarget === e.target) setPriceMatchOpen(false); }}
          >
            <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-[24px] bg-white shadow-card md:rounded-[24px]">
              <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-hair bg-white px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-red">Igualación de precio</p>
                  <h3 className="text-[16px] font-extrabold text-navy">Envíanos tu presupuesto</h3>
                </div>
                <button type="button" onClick={() => setPriceMatchOpen(false)} aria-label="Cerrar"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-slate2 hover:bg-mist">
                  ✕
                </button>
              </header>
              <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">
                <p className="mb-3 text-[13px] leading-relaxed text-slate2">
                  Un asesor humano estudia tu caso entre las principales aseguradoras del mercado y te responde en menos de 24 h.
                </p>
                <PriceMatchForm
                  origen="comparativa"
                  defaultProducto={producto as "salud" | "vida" | "auto" | "decesos"}
                  onSuccess={() => setPriceMatchOpen(false)}
                  redirectOnSuccess={false}
                />
              </div>
            </div>
          </div>
        )}

        <NextSteps whatsappHref={whatsAppUrl(waText)} showCaller={false} />
      </main>
      {gateBlocking && (
        <ComparativaGate
          producto={producto}
          isHealthLike={isHealthLike}
          mustGate={mustGate}
          nombre={gateNombre} onNombre={setGateNombre}
          apellido1={gateApellido1} onApellido1={setGateApellido1}
          apellido2={gateApellido2} onApellido2={setGateApellido2}
          documentoTipo={gateDocumentoTipo} onDocumentoTipo={setGateDocumentoTipo}
          documento={gateDocumento} onDocumento={setGateDocumento}
          telefono={gateTelefono} onTelefono={setGateTelefono}
          email={gateEmail} onEmail={setGateEmail}
          aceptaEsencial={gateAceptaEsencial} onAceptaEsencial={setGateAceptaEsencial}
          aceptaComercial={gateAceptaComercial} onAceptaComercial={setGateAceptaComercial}
          error={gateError}
          submitting={gateSubmitting}
          onSubmit={unlockComparativa}
          onSkip={skipGate}
        />
      )}
      {!gateBlocking && <WhatsAppHelpWidget raised message={firstName ? `${firstName}, ¿necesitas ayuda para elegir?` : "¿Necesitas ayuda para elegir?"} waHref={whatsAppUrl(widgetWaText)} />}
      {!gateBlocking && <ComparativaHelpBar quote={quote} producto={producto} />}
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

// El botón primario se muestra en verde mientras la comparativa está
// bloqueada tras el velo (empuja a completar el gate para "desbloquear" el
// color normal, un empujón visual más hacia dejar el dato) y también, ya
// desbloqueada, en la opción recomendada — esa se queda en verde a
// propósito para que siga destacando, en vez de volver a rojo como el resto.
function CompanyActions({
  producto, compania, precio, locked = false, recommended = false, onMasInfo, onSolicitar,
}: {
  producto: string; compania: string; precio: number; locked?: boolean; recommended?: boolean;
  // Si se pasa, "Más información" abre el detalle en la propia página (modal)
  // en vez de navegar a /comparativa/[compania] — necesario para las opciones
  // reales de Codeoscopic, que no existen como página de catálogo y además
  // evita salir de la comparativa y volver a pasar por el gate.
  onMasInfo?: () => void;
  // Si se pasa, "Que te llamen gratis" ejecuta este handler (crear presupuesto
  // por interés + navegar) en vez de ser un simple enlace. Se usa en salud.
  onSolicitar?: () => void;
}) {
  const green = locked || recommended;
  // En móvil los botones se apilan a ancho completo (evita que "Que te llamen
  // gratis" desborde la tarjeta); en ≥sm van en fila repartiendo el ancho.
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      {onMasInfo ? (
        <button
          type="button" onClick={onMasInfo}
          tabIndex={locked ? -1 : 0}
          className="min-w-0 flex-1 rounded-card border border-hair px-3 py-2.5 text-center text-[13px] font-semibold leading-tight text-navy transition-colors hover:border-navy/40 hover:bg-mist"
        >
          Más información
        </button>
      ) : (
        <a
          href={`/comparativa/${slugify(compania)}?producto=${producto}`}
          tabIndex={locked ? -1 : 0}
          className="min-w-0 flex-1 rounded-card border border-hair px-3 py-2.5 text-center text-[13px] font-semibold leading-tight text-navy transition-colors hover:border-navy/40 hover:bg-mist"
        >
          Más información
        </a>
      )}
      {onSolicitar ? (
        <button
          type="button" onClick={onSolicitar}
          tabIndex={locked ? -1 : 0}
          className={`min-w-0 flex-1 rounded-card px-3 py-2.5 text-center text-[13px] font-semibold leading-tight text-white transition-colors ${green ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-red hover:bg-brand-red-deep"}`}
        >
          Que te llamen gratis
        </button>
      ) : (
        <a
          href={`/quiero-que-me-llamen?producto=${producto}&compania=${encodeURIComponent(compania)}&precio=${precio}`}
          tabIndex={locked ? -1 : 0}
          className={`min-w-0 flex-1 rounded-card px-3 py-2.5 text-center text-[13px] font-semibold leading-tight text-white transition-colors ${green ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-red hover:bg-brand-red-deep"}`}
        >
          Que te llamen gratis
        </a>
      )}
    </div>
  );
}

/* ------------------------------ Gate de contacto --------------------------- */
// Modal fullscreen con backdrop opaco. En modo mustGate (draft pendiente
// = salud/vida) NO permite cerrar: sin datos no podemos crear el lead ni
// mostrar precios. En modo legacy (lead ya existe) sí se puede "Ver sin
// completar" para no romper el flujo antiguo.
function ComparativaGate({
  producto, isHealthLike, mustGate,
  nombre, onNombre, apellido1, onApellido1, apellido2, onApellido2,
  documentoTipo, onDocumentoTipo, documento, onDocumento,
  telefono, onTelefono, email, onEmail,
  aceptaEsencial, onAceptaEsencial,
  aceptaComercial, onAceptaComercial,
  error, submitting, onSubmit, onSkip,
}: {
  producto: string;
  isHealthLike: boolean;
  mustGate: boolean;
  nombre: string; onNombre: (v: string) => void;
  apellido1: string; onApellido1: (v: string) => void;
  apellido2: string; onApellido2: (v: string) => void;
  documentoTipo: "Dni" | "Nie"; onDocumentoTipo: (v: "Dni" | "Nie") => void;
  documento: string; onDocumento: (v: string) => void;
  telefono: string; onTelefono: (v: string) => void;
  email: string; onEmail: (v: string) => void;
  aceptaEsencial: boolean; onAceptaEsencial: (v: boolean) => void;
  aceptaComercial: boolean; onAceptaComercial: (v: boolean) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
}) {
  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/80 p-0 md:p-6"
    >
      <div className="flex h-full w-full flex-col overflow-y-auto bg-white shadow-card md:h-auto md:max-h-[92vh] md:max-w-lg md:rounded-[24px]">
        <div className="flex items-start justify-between gap-3 border-b border-hair px-6 pb-4 pt-6 md:pt-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-red">Casi hemos terminado</p>
            <h2 id="gate-title" className="mt-1 text-[20px] font-extrabold leading-snug text-navy md:text-[22px]">
              Confirma tus datos para ver tu comparativa
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate2">
              Con esto podemos {isHealthLike ? "tarificar con las aseguradoras y mostrarte" : "mostrarte"} tus precios personalizados.
            </p>
          </div>
          {!mustGate && (
            <button
              type="button" onClick={onSkip}
              aria-label="Ver la comparativa sin completar el formulario"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-slate2 transition-colors hover:bg-mist"
            >
              ✕
            </button>
          )}
        </div>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 px-6 py-5">
          <input
            type="text" value={nombre} onChange={(e) => onNombre(e.target.value)}
            placeholder="Nombre" autoComplete="given-name" autoFocus
            className="w-full rounded-[12px] border border-hair bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60 focus:border-navy focus:outline-none"
          />
          {producto === "salud" && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text" value={apellido1} onChange={(e) => onApellido1(e.target.value)}
                placeholder="Primer apellido" autoComplete="family-name"
                className="w-full min-w-0 flex-1 rounded-[12px] border border-hair bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60 focus:border-navy focus:outline-none"
              />
              <input
                type="text" value={apellido2} onChange={(e) => onApellido2(e.target.value)}
                placeholder="Segundo apellido" autoComplete="additional-name"
                className="w-full min-w-0 flex-1 rounded-[12px] border border-hair bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60 focus:border-navy focus:outline-none"
              />
            </div>
          )}
          {producto === "salud" && (
            <div className="flex gap-2">
              <select
                value={documentoTipo} onChange={(e) => onDocumentoTipo(e.target.value as "Dni" | "Nie")}
                aria-label="Tipo de documento"
                className="shrink-0 rounded-[12px] border border-hair bg-white px-3 py-3 text-[15px] text-ink focus:border-navy focus:outline-none"
              >
                <option value="Dni">DNI</option>
                <option value="Nie">NIE</option>
              </select>
              <input
                type="text" value={documento}
                onChange={(e) => onDocumento(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 9))}
                placeholder={documentoTipo === "Nie" ? "X1234567L" : "12345678Z"}
                inputMode="text" autoComplete="off" maxLength={9}
                className="w-full rounded-[12px] border border-hair bg-white px-4 py-3 text-[15px] uppercase tnums text-ink placeholder:text-slate2/60 focus:border-navy focus:outline-none"
              />
            </div>
          )}
          <input
            type="tel" inputMode="tel" value={telefono} onChange={(e) => onTelefono(e.target.value)}
            placeholder="Teléfono móvil" autoComplete="tel"
            className="w-full rounded-[12px] border border-hair bg-white px-4 py-3 text-[15px] tnums text-ink placeholder:text-slate2/60 focus:border-navy focus:outline-none"
          />
          <input
            type="email" inputMode="email" value={email} onChange={(e) => onEmail(e.target.value)}
            placeholder="Correo electrónico" autoComplete="email"
            className="w-full rounded-[12px] border border-hair bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60 focus:border-navy focus:outline-none"
          />

          <p className="mt-1 text-[12px] leading-relaxed text-slate2">
            {BRAND_NAME}, como responsable del tratamiento, usará tus datos para tarificar tu seguro y que un asesor te confirme el precio final.{" "}
            <a href="/legal#privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">Leer más</a>
          </p>
          <EssentialConsentCheckbox
            idPrefix="comparativa-gate" datosSalud={isHealthLike}
            checked={aceptaEsencial} onChange={onAceptaEsencial}
          />
          <ComercialConsentCheckbox
            idPrefix="comparativa-gate" checked={aceptaComercial} onChange={onAceptaComercial}
          />

          {error && <p role="alert" className="mt-1 rounded-[10px] bg-brand-red/10 px-4 py-2.5 text-[13px] font-medium text-brand-red-deep">{error}</p>}

          <button
            type="submit" disabled={submitting} aria-busy={submitting || undefined}
            className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center rounded-[12px] bg-emerald-600 px-5 text-[16px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:bg-slate2/40"
          >
            {submitting ? "Preparando tu comparativa…" : "Ver mi comparativa"}
          </button>
          {!mustGate && (
            <button type="button" onClick={onSkip} className="text-center text-[12px] font-medium text-slate2 underline">
              Ver sin completar
            </button>
          )}
        </form>
      </div>
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

function CoveragesModal({ insuranceId, quote, onClose, onSolicitar }: { insuranceId: string; quote: RealQuote; onClose: () => void; onSolicitar?: () => void }) {
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
      role="dialog" aria-modal="true" aria-label={`Detalle de ${quote.compania}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] bg-white shadow-card md:rounded-[24px]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hair bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {quote.imageUrl ? <CompanyLogo logoUrl={quote.imageUrl} compania={quote.compania} size="h-9 max-w-[110px]" /> : null}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate2">Detalle de la opción</p>
              <h3 className="truncate text-[17px] font-extrabold text-navy">{quote.compania}</h3>
              {(quote.modalidad || quote.producto || quote.categoria) && (
                <p className="truncate text-[12px] text-slate2">
                  {[quote.modalidad || quote.producto, quote.categoria].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-slate2 transition-colors hover:bg-mist"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
          {/* Resumen de la opción: precio, valoración y condiciones. */}
          <div className="rounded-card border border-hair bg-mist/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {typeof quote.rating === "number" && quote.rating > 0 && (
                  <span aria-label={`Valoración ${quote.rating} de 5`} className="text-[13px] leading-none text-amber-500">
                    {"★".repeat(Math.round(quote.rating))}<span className="text-slate2/40">{"★".repeat(Math.max(0, 5 - Math.round(quote.rating)))}</span>
                  </span>
                )}
                {quote.docUrl && (
                  <a href={quote.docUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-1 block text-[12px] font-semibold text-navy underline underline-offset-2 hover:text-brand-red">
                    Condiciones del producto (PDF)
                  </a>
                )}
              </div>
              <div className="shrink-0 text-right">
                {quote.premium != null
                  ? <p className="text-[14px] text-slate2">Desde <span className="text-[19px] font-extrabold tnums text-navy">{euros(quote.premium)} €</span>/{quote.frequency === "Monthly" ? "mes" : "año"}</p>
                  : <p className="text-[13px] italic text-slate2">Precio en cálculo…</p>}
                {quote.downPayment != null && quote.downPayment > 0 && quote.downPayment !== quote.premium && (
                  <p className="mt-0.5 text-[12px] text-slate2">Primera prima: <span className="font-semibold tnums text-ink">{euros(quote.downPayment)} €</span></p>
                )}
                {quote.estimate && <p className="mt-0.5 text-[11px] italic text-slate2">Precio orientativo</p>}
              </div>
            </div>
          </div>
          <h4 className="mt-5 mb-1 text-[13px] font-bold uppercase tracking-wide text-slate2">Coberturas</h4>
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
        {/* CTA de conversión: registra la solicitud de llamada Y crea el
            presupuesto de ESTA opción concreta (vía solicitarSalud → interés). */}
        {onSolicitar && (
          <footer className="shrink-0 border-t border-hair bg-white px-5 py-4">
            <button
              type="button"
              onClick={onSolicitar}
              className="flex w-full items-center justify-center rounded-card bg-brand-red px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
            >
              Que me llamen gratis
            </button>
            <p className="mt-1.5 text-center text-[11px] text-slate2">Sin compromiso · Te llamamos cuando mejor te venga</p>
          </footer>
        )}
      </div>
    </div>
  );
}
