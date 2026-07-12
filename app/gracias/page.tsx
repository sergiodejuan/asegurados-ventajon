import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SaveCaller } from "@/components/SaveCaller";
import { Check } from "@/components/icons";
import { BRAND_NAME, CONTACT_HOURS, WHATSAPP_URL } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Gracias — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function Gracias() {
  return (
    <>
      <Header />
      <main id="contenido" className="mx-auto max-w-app px-5 py-14">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-navy text-white">
          <Check width={30} height={30} />
        </div>
        <h1 className="mt-6 text-[28px] font-extrabold leading-tight text-navy">
          Hecho. Te llamamos enseguida.
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-slate2">
          Un asesor de {BRAND_NAME} preparará tu comparativa y te contactará para
          darte tu propuesta personalizada, comparando entre las mejores
          compañías. Sin compromiso.
        </p>

        {/* Números de llamada + guardar contacto (buena práctica anti-spam) */}
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

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center rounded-card border border-navy px-5 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
        >
          ¿Prefieres que sigamos por WhatsApp? Escríbenos
        </a>

        <a
          href="/"
          className="mt-4 block text-center text-[14px] font-medium text-slate2 underline"
        >
          Volver al inicio
        </a>
      </main>
    </>
  );
}
