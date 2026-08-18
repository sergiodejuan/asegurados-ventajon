import { Clock } from "@/components/icons";
import { BRAND_NAME } from "@/lib/brand";

// Horario propio del equipo que atiende las llamadas de /lp/salud —
// distinto del horario general del sitio (ver CONTACT_HOURS en lib/brand),
// así que se declara aparte en vez de reutilizarlo.
const HORARIO_LP_SALUD = "L-V de 8:00 a 18:00";

// Aviso de tratamiento de datos + consentimiento comercial, común a los tres
// formularios de "que me llamen" de /lp/salud (PaidLlamadaForm, la barra
// rápida del navbar/sección y el formulario lateral del tarificador).
// Sigue el patrón habitual del sector (ver referencia de MAPFRE): el
// tratamiento para atender la propia solicitud es informativo (no exige
// checkbox, ya lo autoriza el propio envío); el consentimiento explícito
// solo hace falta para las comunicaciones comerciales, opcional y
// desmarcado por defecto.
//
// `simple` deja solo el aviso informativo, centrado y sin checkbox ni
// horario — para la barra de captura de la sección "Contrata por teléfono",
// donde el bloque completo generaba demasiada carga visual bajo la barra.
export function PaidLlamadaLegalNotice({
  aceptaComercial, onChangeAceptaComercial, idPrefix, simple = false,
}: {
  aceptaComercial: boolean;
  onChangeAceptaComercial: (v: boolean) => void;
  idPrefix: string;
  simple?: boolean;
}) {
  const checkboxId = `${idPrefix}-acepta-comercial`;

  if (simple) {
    return (
      <p className="text-center text-[12px] leading-relaxed text-slate2">
        {BRAND_NAME}, como responsable del tratamiento, usará tus datos para atender esta solicitud a través de los canales que nos facilites.{" "}
        <a href="/legal#privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">Leer más</a>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] leading-relaxed text-slate2">
        {BRAND_NAME}, como responsable del tratamiento, usará tus datos para atender esta solicitud a través de los canales que nos facilites.{" "}
        <a href="/legal#privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">Leer más</a>
      </p>
      <label htmlFor={checkboxId} className="flex cursor-pointer items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={aceptaComercial}
          onChange={(e) => onChangeAceptaComercial(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy"
        />
        <span className="text-[12px] leading-relaxed text-slate2">
          Quiero recibir comunicaciones comerciales personalizadas de {BRAND_NAME} (opcional).{" "}
          <a href="/legal#privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">Leer más</a>
        </span>
      </label>
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-slate2">
        <Clock width={14} height={14} aria-hidden="true" /> {HORARIO_LP_SALUD}
      </p>
    </div>
  );
}
