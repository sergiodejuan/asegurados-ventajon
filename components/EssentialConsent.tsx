"use client";

import { BRAND_NAME } from "@/lib/brand";

// Bloque de consentimiento reutilizado por todos los formularios y
// tarificadores que crean un lead completo (ComparativaGate, CallRequestForm,
// PriceMatchForm, PriceMatchStepsModal, StepForm, AssistantWidget).
//
// Antes cada uno pedía 3-4 checks sueltos (privacidad, autorización de
// contacto, datos de salud, comercial) y eso generaba fricción real en el
// envío de leads. Se fusiona en un único check "esencial" que cubre a la vez
// la información de privacidad y la autorización de contacto necesaria para
// atender la propia solicitud (no requiere consentimiento aparte: es
// tratamiento necesario para prestar el servicio pedido, art. 6.1.b RGPD) y,
// cuando el producto trata datos de salud (salud/vida — fumador/motivo
// cuentan como datos de salud a efectos legales), el consentimiento explícito
// y separado que exige el art. 9 RGPD para categorías especiales. El check de
// comunicaciones comerciales sigue aparte, opcional y desmarcado por
// defecto — nunca se mezcla con el esencial (RGPD exige consentimientos
// granulares por finalidad).
export type EssentialConsentProps = {
  idPrefix: string;
  datosSalud?: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  size?: "sm" | "md";
};

const SIZE_CLASS: Record<"sm" | "md", string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
};

export function EssentialConsentCheckbox({
  idPrefix, datosSalud = false, checked, onChange, error, size = "md",
}: EssentialConsentProps) {
  const id = `${idPrefix}-consiente-esencial`;
  return (
    <>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id} type="checkbox" checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          className={`mt-0.5 ${SIZE_CLASS[size]} shrink-0 cursor-pointer accent-navy`}
        />
        <span className="text-[13px] leading-relaxed text-slate2">
          He sido informado sobre el tratamiento de mis datos conforme a la{" "}
          <a href="/legal#privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">política de privacidad</a>
          {datosSalud ? (
            <> y consiento expresamente el tratamiento de mis <strong className="text-navy">datos de salud</strong> (art. 9.2.a RGPD) para calcular y comparar mi seguro.</>
          ) : (
            <> y autorizo que {BRAND_NAME} me contacte por teléfono, WhatsApp o email para gestionar mi solicitud.</>
          )}
        </span>
      </label>
      {error && <p role="alert" className="ml-8 text-[13px] font-medium text-brand-red">{error}</p>}
    </>
  );
}

export function ComercialConsentCheckbox({
  idPrefix, checked, onChange, size = "md",
}: {
  idPrefix: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
}) {
  const id = `${idPrefix}-acepta-comercial`;
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id} type="checkbox" checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`mt-0.5 ${SIZE_CLASS[size]} shrink-0 cursor-pointer accent-navy`}
      />
      <span className="text-[13px] leading-relaxed text-slate2">
        Quiero recibir comunicaciones comerciales de {BRAND_NAME} por teléfono, WhatsApp o email (opcional).
      </span>
    </label>
  );
}
