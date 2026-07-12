import { BRAND_NAME, CONTACT_HOURS, ECOSYSTEM_MEMBERS, PARTNERS } from "@/lib/brand";

const PARTNERS_TEXT = new Intl.ListFormat("es-ES", { style: "long", type: "conjunction" }).format(PARTNERS);

const CONTENT = {
  salud: {
    h1: "Comparador de seguros de salud",
    intro: `Contratar un seguro de salud a ciegas, con el primero que te ofrezcan, suele salir caro. ${BRAND_NAME} es una correduría de seguros: comparamos tu perfil entre varias compañías —como ${PARTNERS_TEXT}— y te ayudamos a elegir la póliza que de verdad se ajusta a lo que necesitas, no la que más comisión deja.`,
    sections: [
      {
        h2: "¿Con copago o sin copago?",
        p: "La diferencia está en cómo pagas: en un seguro sin copago, la prima mensual es algo más alta pero no pagas nada extra cada vez que vas al médico. En uno con copago, la prima es más ajustada y solo aportas una pequeña cantidad cuando usas el servicio. Si acudes poco al médico, el copago suele compensar; si tienes hospitalizaciones o revisiones frecuentes, el sin copago suele salir más a cuenta. Te ayudamos a calcularlo con tu situación real.",
      },
      {
        h2: "¿Qué influye en el precio de un seguro de salud?",
        p: "La edad y el número de personas a asegurar son los factores que más pesan, seguidos de la cobertura elegida (dental incluido o no, cuadro médico, cobertura internacional…) y, en algunas compañías, el código postal. Por eso una comparativa genérica dice poco: lo que importa es tu comparativa, con tus datos.",
      },
      {
        h2: `¿Por qué comparar con ${BRAND_NAME}?`,
        p: `Somos correduría, no agentes de una única aseguradora: estamos de tu lado, no del de la compañía. Comparamos por ti entre las mejores del país, te explicamos en claro lo que cubre cada póliza y lo que no —sin letra pequeña— y te acompañamos con atención personalizada en Canarias y Baleares, en horario ${CONTACT_HOURS}. Formamos parte del ecosistema Ventajon, con ${ECOSYSTEM_MEMBERS}.`,
      },
    ],
    faq: [
      {
        q: "¿Cuánto cuesta un seguro de salud?",
        a: "Depende del perfil: edad, número de asegurados, si incluye dental o cobertura internacional, y si es con o sin copago. Por eso no publicamos un precio cerrado: calculamos el tuyo con el formulario de arriba y un asesor te confirma la propuesta final, sin compromiso.",
      },
      {
        q: "¿Puedo cambiarme de compañía si ya tengo seguro de salud?",
        a: "Sí. Si nos cuentas qué tienes contratado ahora mismo (precio y servicios incluidos), lo comparamos con las alternativas disponibles para ver si te conviene cambiar o mantenerlo.",
      },
      {
        q: "¿La comparativa tiene algún coste?",
        a: "No. Comparar y recibir asesoramiento es gratuito y sin compromiso de contratación.",
      },
    ],
  },
  vida: {
    h1: "Comparador de seguros de vida",
    intro: `Un seguro de vida protege a las personas que dependen de ti —tu familia, tu hipoteca— si a ti te faltara. ${BRAND_NAME} compara tu perfil entre varias compañías —como ${PARTNERS_TEXT}— para encontrar la cobertura adecuada al precio justo, sin venderte de más.`,
    sections: [
      {
        h2: "¿Qué cubre un seguro de vida?",
        p: "Lo habitual es que cubra fallecimiento e invalidez absoluta, y muchas pólizas permiten añadir enfermedades graves o vincular el capital a tu hipoteca para que quede cubierta si algo te pasa. Qué combinación te conviene depende de tu situación familiar y financiera; te ayudamos a decidirlo.",
      },
      {
        h2: "¿Qué influye en el precio de un seguro de vida?",
        p: "Sobre todo la edad y si eres fumador o no. También influyen el capital que quieras asegurar y el motivo principal —proteger a tu familia, cubrir la hipoteca o combinarlo con ahorro—. Por eso el formulario te pregunta justo eso: con esos datos, tu comparativa es real, no un precio genérico.",
      },
      {
        h2: `¿Por qué comparar con ${BRAND_NAME}?`,
        p: `Somos correduría, no agentes de una única aseguradora: comparamos por ti entre las mejores compañías del país y te explicamos en claro lo que cubre cada póliza, sin letra pequeña. Atención personalizada en Canarias y Baleares, en horario ${CONTACT_HOURS}, dentro del ecosistema Ventajon con ${ECOSYSTEM_MEMBERS}.`,
      },
    ],
    faq: [
      {
        q: "¿Cuánto cuesta un seguro de vida?",
        a: "Depende sobre todo de tu edad, si fumas y el capital que quieras asegurar. Calcula tu precio con el formulario de arriba y un asesor te confirma la propuesta final, sin compromiso.",
      },
      {
        q: "¿Necesito un seguro de vida si ya tengo hipoteca?",
        a: "Muchas hipotecas exigen o recomiendan un seguro de vida vinculado al préstamo. Podemos comparar tanto esa opción como una póliza independiente, para que elijas la que mejor te convenga.",
      },
      {
        q: "¿La comparativa tiene algún coste?",
        a: "No. Comparar y recibir asesoramiento es gratuito y sin compromiso de contratación.",
      },
    ],
  },
} as const;

export function SeoContent({ variant }: { variant: "salud" | "vida" }) {
  const c = CONTENT[variant];
  return (
    <section aria-labelledby="seo-heading" className="mx-auto mt-16 max-w-app px-5 pb-14 md:mt-24 md:max-w-5xl lg:max-w-6xl">
      <h2 id="seo-heading" className="text-[20px] font-extrabold leading-tight text-navy md:text-[24px]">{c.h1}</h2>
      <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-slate2">{c.intro}</p>

      <div className="mt-6 md:grid md:grid-cols-2 md:gap-x-12">
        <div>
          {c.sections.map((s) => (
            <div key={s.h2} className="mt-6 first:mt-0">
              <h3 className="text-[16px] font-bold text-navy">{s.h2}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">{s.p}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 md:mt-0">
          <h3 className="text-[16px] font-bold text-navy">Preguntas frecuentes</h3>
          <dl className="mt-3 flex flex-col gap-4">
            {c.faq.map((f) => (
              <div key={f.q}>
                <dt className="text-[14px] font-semibold text-ink">{f.q}</dt>
                <dd className="mt-1 text-[14px] leading-relaxed text-slate2">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
