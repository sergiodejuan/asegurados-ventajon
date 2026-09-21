"use client";

import { BRAND_NAME } from "@/lib/brand";

// Bloque de consentimiento reutilizado por todos los tarificadores y
// formularios que crean lead. El check único agrupa privacidad, contacto y
// comunicaciones comerciales; al marcarlo se firma doble timestamp
// (contactoAt + comercialAt) y aceptaComercial=true. Se conserva
// ComercialConsentCheckbox por si en algún momento vuelve a separarse.
// Para productos con datos de salud (salud, vida — fumador y motivo entran
// como tales) se añade el consentimiento explícito del art. 9 RGPD dentro
// del mismo check.
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
            <>, consiento expresamente el tratamiento de mis <strong className="text-navy">datos de salud</strong> (art. 9.2.a RGPD) para calcular y comparar mi seguro, y autorizo a {BRAND_NAME} a contactarme por teléfono, WhatsApp o email para gestionar mi solicitud y para enviarme comunicaciones comerciales de sus productos.</>
          ) : (
            <> y autorizo a {BRAND_NAME} a contactarme por teléfono, WhatsApp o email para gestionar mi solicitud y para enviarme comunicaciones comerciales de sus productos.</>
          )}
        </span>
      </label>
      {error && <p role="alert" className="ml-8 text-[13px] font-medium text-brand-red">{error}</p>}
    </>
  );
}

// Se mantiene por compatibilidad — hoy no lo pinta ningún tarificador
// (el consentimiento comercial va embebido en el check esencial, ver
// Nota arriba). Si el equipo legal exige separarlos otra vez,
// vuelve a añadirlo al lado del EssentialConsentCheckbox en cada form.
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
