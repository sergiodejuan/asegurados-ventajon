"use client";

import { Modal } from "./Modal";
import { Phone, WhatsApp, Check } from "./icons";

const REASONS = [
  { icon: Phone, text: "Es la única forma de que un asesor revise tu caso y te confirme el precio real." },
  { icon: WhatsApp, text: "Solo te contactamos por teléfono o WhatsApp sobre tu seguro — nunca spam." },
  { icon: Check, text: "Puedes pedirnos que dejemos de contactarte cuando quieras." },
];

// Se muestra cuando alguien intenta enviar un formulario habiendo dejado sin
// marcar la autorización de contacto (obligatoria: sin ella no podemos
// llamar para dar seguimiento al presupuesto). En vez de limitarnos al
// mensaje de error en rojo, explicamos brevemente por qué conviene marcarla
// — descartable en todo momento (nunca bloquea el envío), para que el
// consentimiento siga siendo libre y válido a efectos de RGPD.
export function ConsentNudgeModal({
  open, onClose, onAccept,
}: {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Antes de enviar…">
      <p className="text-[14px] leading-relaxed text-ink">
        Para tramitar tu solicitud necesitamos tu autorización para contactarte:
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {REASONS.map(({ icon: Icon, text }, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
              <Icon width={14} height={14} />
            </span>
            <span className="text-[13px] leading-relaxed text-slate2">{text}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAccept}
        className="mt-6 flex w-full items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
      >
        Sí, autorizo el contacto
      </button>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 block w-full text-center text-[13px] font-medium text-slate2 underline"
      >
        Ahora no
      </button>
    </Modal>
  );
}
