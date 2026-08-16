"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Phone, Spinner } from "@/components/icons";
import { normalizePhone } from "@/lib/schema";
import { getAttribution } from "@/lib/attribution";
import { pushDataLayerEvent } from "@/lib/dataLayer";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { BRAND_NAME } from "@/lib/brand";
import { PaidLlamadaLegalNotice } from "./PaidLlamadaLegalNotice";

// Réplica del "Llamadme gratis" de una sola línea que Línea Directa embebe
// en su navbar y bajo sus tarjetas de producto: solo pide el teléfono (sin
// nombre ni resto de datos) para que la fricción sea mínima. Al enviarlo,
// registra la llamada en el mismo backend que el resto de la web
// (/api/call-request → /admin/llamadas) y muestra un "¡Gracias!" propio de
// esta landing en vez de navegar a /gracias.
//
// `variant="navbar"` es la barra compacta (input + botón) para la cabecera
// en escritorio — en móvil no hay hueco junto al logo, así que ahí se deja
// el icono de llamada directa que ya existía y esta barra solo se usa en
// variant="section" (bajo "Tipos de Seguros"), que sí es mobile-first: se
// apila en columna en pantallas estrechas.
//
// El aviso de tratamiento de datos + consentimiento comercial (ver
// PaidLlamadaLegalNotice) no cabe permanentemente en la barra compacta del
// navbar (cabecera de altura fija) — ahí se muestra en un desplegable al
// pulsar el icono "i", igual que hace la propia referencia de Línea Directa
// en su navbar. En variant="section" sí hay sitio de sobra, así que se
// muestra siempre visible debajo de la barra.
export function PaidQuickCallBar({
  phone, variant = "navbar", label, ctaLabel = "Llamadme gratis", producto = "salud", landingSlug,
}: {
  phone: string;
  variant?: "navbar" | "section";
  label?: string;
  ctaLabel?: string;
  producto?: string;
  landingSlug?: string;
}) {
  const [telefono, setTelefono] = useState("");
  const [aceptaComercial, setAceptaComercial] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[6-9]\d{8}$/.test(normalizePhone(telefono))) {
      setError("Introduce un móvil español válido.");
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const res = await fetch("/api/call-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: "", telefono, codigoPostal: "", producto,
          aceptaPrivacidad: true, autorizaContacto: true, aceptaComercial,
          company: "",
          consent: { privacidadAt: now, contactoAt: now },
          utm: getAttribution(),
          turnstileToken,
          origen: "lp",
          landingSlug,
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; errors?: Record<string, string[]> } | null;
      if (res.ok && body?.ok) {
        pushDataLayerEvent("generate_lead", { producto, form: `lp-quickcall-${variant}` });
        setSent(true);
        setNoticeOpen(false);
        return;
      }
      const first = body?.errors ? Object.values(body.errors).find((v) => v && v[0]) : undefined;
      setError(first?.[0] ?? body?.error ?? "No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function closeGracias() {
    setSent(false);
    setTelefono("");
  }

  return (
    <div className={variant === "navbar" ? "relative" : undefined}>
      <form
        onSubmit={submit}
        className={variant === "section"
          ? "flex flex-col gap-3 rounded-[16px] border border-hair bg-white p-4 sm:flex-row sm:items-center sm:gap-4 sm:rounded-pill sm:py-2.5"
          : "flex items-center gap-2"}
      >
        {variant === "section" && (
          <div className="flex items-center gap-3 sm:mr-auto">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red">
              <Phone width={18} height={18} />
            </span>
            <div>
              <p className="text-[14px] font-bold text-navy">{label}</p>
              <a href={phoneHref} className="text-[13px] font-bold tnums text-emerald-700">{phone}</a>
            </div>
          </div>
        )}
        <div className={`flex overflow-hidden rounded-pill border border-hair bg-white ${variant === "section" ? "w-full sm:w-auto" : ""}`}>
          <input
            type="tel" inputMode="tel" autoComplete="tel"
            value={telefono} onChange={(e) => setTelefono(e.target.value)}
            placeholder="Tu teléfono"
            aria-label="Tu teléfono"
            className="w-full min-w-0 bg-transparent py-2.5 pl-4 pr-2 text-[14px] text-ink placeholder:text-slate2/70 focus:outline-none sm:w-[150px]"
          />
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting || undefined}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-pill bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:bg-slate2/40"
          >
            {submitting && <Spinner width={14} height={14} />}
            {ctaLabel}
          </button>
        </div>
        {variant === "navbar" && (
          <button
            type="button"
            onClick={() => setNoticeOpen((o) => !o)}
            aria-label="Información sobre el tratamiento de tus datos"
            aria-expanded={noticeOpen}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-hair text-[12px] font-bold italic text-slate2 transition-colors hover:border-navy hover:text-navy"
          >
            i
          </button>
        )}
      </form>

      {variant === "navbar" && noticeOpen && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[320px] rounded-[16px] border border-hair bg-white p-4 shadow-card">
          <PaidLlamadaLegalNotice idPrefix="quickcall-navbar" aceptaComercial={aceptaComercial} onChangeAceptaComercial={setAceptaComercial} />
        </div>
      )}

      {error && <p role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{error}</p>}

      {variant === "section" && (
        <div className="mt-3">
          <PaidLlamadaLegalNotice
            simple
            idPrefix="quickcall-section"
            aceptaComercial={aceptaComercial}
            onChangeAceptaComercial={setAceptaComercial}
          />
        </div>
      )}

      <TurnstileWidget onToken={setTurnstileToken} />

      <Modal open={sent} onClose={closeGracias} title="¡Gracias!">
        <p>
          Gracias por tu confianza en {BRAND_NAME}, un asesor se pondrá en contacto contigo
          {telefono && <> en el <span className="font-semibold tnums text-ink">{telefono}</span></>}.
        </p>
        <p className="mt-3">
          También puedes contactar en el{" "}
          <a href={phoneHref} className="inline-flex items-center gap-1.5 font-bold tnums text-navy underline">
            <Phone width={14} height={14} /> {phone}
          </a>
        </p>
        <button
          type="button"
          onClick={closeGracias}
          className="mt-5 w-full rounded-pill bg-brand-red px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-brand-red-deep"
        >
          Volver a {BRAND_NAME}
        </button>
      </Modal>
    </div>
  );
}
