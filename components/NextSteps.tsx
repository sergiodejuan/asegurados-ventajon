import { SaveCaller } from "./SaveCaller";
import { CONTACT_HOURS, WHATSAPP_URL } from "@/lib/brand";

// Bloque reutilizado tras el envío de un formulario: números de llamada +
// guardar contacto (buena práctica anti-spam), próximos pasos y salida por WhatsApp.
// showCaller=false: para páginas donde aún NO se ha solicitado una llamada
// (p.ej. la comparativa de precios) — ahí no tiene sentido mostrar los
// números "desde los que llamaremos" todavía.
export function NextSteps({ whatsappHref = WHATSAPP_URL, showCaller = true }: { whatsappHref?: string; showCaller?: boolean }) {
  return (
    <>
      {showCaller && (
        <>
          <SaveCaller />
          <div className="mt-6 rounded-card border border-hair bg-white p-5 shadow-soft">
            <p className="text-[14px] font-semibold text-ink">¿Qué pasa ahora?</p>
            <ol className="mt-3 flex flex-col gap-2 text-[14px] text-slate2">
              <li>1. Preparamos tu comparativa personalizada.</li>
              <li>2. Te llamamos en horario {CONTACT_HOURS}.</li>
              <li>3. Si no puedes atender, no te preocupes: lo intentamos otra vez o seguimos por WhatsApp.</li>
              <li>4. Eliges tranquilo, con un asesor de tu lado.</li>
            </ol>
          </div>
        </>
      )}

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex w-full items-center justify-center rounded-card border border-navy px-5 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
      >
        ¿Prefieres que sigamos por WhatsApp? Escríbenos
      </a>

      <a href="/" className="mt-4 block text-center text-[14px] font-medium text-slate2 underline">
        Volver al inicio
      </a>
    </>
  );
}
