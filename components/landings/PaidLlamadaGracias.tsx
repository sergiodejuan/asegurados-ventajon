import { Phone } from "@/components/icons";
import { BRAND_NAME } from "@/lib/brand";

// Redacta la preferencia de forma natural en vez de repetir literalmente
// "Cualquier día"/"Cualquier turno" (los valores por defecto de los
// selects), que sonarían raro metidos en una frase.
function formatPreferencia(dia?: string, turno?: string): string {
  const diaEspecifico = dia && dia !== "Cualquier día" ? dia : null;
  const turnoEspecifico = turno && turno !== "Cualquier turno" ? turno.toLowerCase() : null;
  if (diaEspecifico && turnoEspecifico) return `el ${diaEspecifico} por la ${turnoEspecifico}`;
  if (diaEspecifico) return `el ${diaEspecifico}`;
  if (turnoEspecifico) return `por la ${turnoEspecifico}`;
  return "en cuanto podamos";
}

// Mismo mensaje de "¡Gracias!" que la barra rápida del navbar (ver
// PaidQuickCallBar), pero con la preferencia de día/hora que el usuario
// eligió en el formulario completo. Solo para /lp/salud: en el resto de la
// web, solicitar una llamada sigue llevando a /gracias.
export function PaidLlamadaGracias({
  telefono, dia, turno, phone, onClose,
}: {
  telefono: string;
  dia?: string;
  turno?: string;
  phone: string;
  onClose: () => void;
}) {
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;
  return (
    <div>
      <p>
        Gracias por tu confianza en {BRAND_NAME}. Un asesor se pondrá en contacto contigo{" "}
        {formatPreferencia(dia, turno)}, en el <span className="font-semibold tnums text-ink">{telefono}</span>.
      </p>
      <p className="mt-3">
        También puedes contactar en el{" "}
        <a href={phoneHref} className="inline-flex items-center gap-1.5 font-bold tnums text-navy underline">
          <Phone width={14} height={14} /> {phone}
        </a>
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-pill bg-brand-red px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-brand-red-deep"
      >
        Volver a {BRAND_NAME}
      </button>
    </div>
  );
}
