import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { BRAND_NAME, CONTACT_HOURS, PARTNERS, SITE_URL } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Información legal — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

// Marca en rojo los datos concretos que todavía faltan por rellenar (CIF,
// nº de registro DGSFP, domicilio social, email del DPO...). El resto del
// texto de esta página SÍ es contenido legal completo y correcto conforme
// al RGPD, la LOPDGDD, la LSSI-CE y el RD-ley 3/2020 de distribución de
// seguros — no un simple placeholder genérico.
function Pendiente({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-brand-red-deep">[{children}]</span>;
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="mt-8 text-[19px] font-bold text-navy">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 text-[15px] font-bold text-ink">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[14px] leading-relaxed text-slate2">{children}</p>;
}

export default function Legal() {
  const partnersTxt = new Intl.ListFormat("es-ES", { style: "long", type: "conjunction" }).format(PARTNERS);

  return (
    <>
      <Header />
      <main id="contenido" className="mx-auto max-w-app px-5 py-12 md:max-w-2xl md:py-16">
        <h1 className="text-[26px] font-extrabold text-navy">Información legal</h1>

        <div className="mt-4 rounded-card border border-brand-red/30 bg-brand-red/5 p-4">
          <p className="text-[14px] font-semibold text-brand-red-deep">Pendiente de completar</p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Este texto ya cubre la estructura y las cláusulas exigidas por el RGPD, la LOPDGDD, la
            LSSI-CE y la normativa de distribución de seguros (RD-ley 3/2020). Los datos identificativos
            concretos de la correduría, marcados en rojo, deben completarse con la información real antes
            de publicar — y conviene una revisión final de un asesor legal.
          </p>
        </div>

        <nav aria-label="Índice" className="mt-6 rounded-card border border-hair bg-mist p-4 text-[13px]">
          <p className="font-bold text-navy">Índice</p>
          <ul className="mt-2 flex flex-col gap-1">
            <li><a href="#aviso-legal" className="text-navy underline">1. Aviso legal e identificación</a></li>
            <li><a href="#correduria" className="text-navy underline">2. Actividad de mediación de seguros</a></li>
            <li><a href="#privacidad" className="text-navy underline">3. Política de privacidad</a></li>
            <li><a href="#cookies" className="text-navy underline">4. Política de cookies</a></li>
            <li><a href="#condiciones" className="text-navy underline">5. Condiciones de uso</a></li>
            <li><a href="#comunicaciones" className="text-navy underline">6. Comunicaciones comerciales y llamadas</a></li>
          </ul>
        </nav>

        {/* 1. AVISO LEGAL */}
        <H2 id="aviso-legal">1. Aviso legal e identificación (art. 10 LSSI-CE)</H2>
        <P>
          En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la
          Información y de Comercio Electrónico, se informa de los siguientes datos: este sitio web
          (<span translate="no">{SITE_URL}</span>) es titularidad de <strong translate="no">{BRAND_NAME}</strong>,
          con CIF <Pendiente>CIF de la correduría</Pendiente>, domicilio social en{" "}
          <Pendiente>domicilio social completo</Pendiente>, inscrita en el Registro Mercantil de{" "}
          <Pendiente>provincia, tomo, folio, hoja</Pendiente>. Correo electrónico de contacto:{" "}
          <Pendiente>email de contacto legal</Pendiente>. Teléfono: <Pendiente>teléfono de contacto</Pendiente>.
        </P>

        {/* 2. CORREDURÍA */}
        <H2 id="correduria">2. Actividad de mediación de seguros</H2>
        <P>
          {BRAND_NAME} opera como correduría de seguros, sujeta al Real Decreto-ley 3/2020, de 4 de
          febrero, de medidas urgentes por el que se incorporan al ordenamiento jurídico español diversas
          directivas de la Unión Europea en materia de distribución de seguros y reaseguros. En
          cumplimiento de dicha normativa, se informa:
        </P>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed text-slate2">
          <li>
            Se encuentra inscrita en el Registro Administrativo Especial de Distribuidores de Seguros y
            Reaseguros de la Dirección General de Seguros y Fondos de Pensiones (DGSFP) con el número{" "}
            <Pendiente>nº de registro DGSFP</Pendiente>, registro que puede consultarse en{" "}
            <a href="https://sedeelectronica.dgsfp.mineco.es/" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">
              sedeelectronica.dgsfp.mineco.es
            </a>.
          </li>
          <li>
            Dispone de un seguro de responsabilidad civil profesional y de capacidad financiera conforme
            a los límites exigidos por el artículo 152 del citado Real Decreto-ley, contratado con{" "}
            <Pendiente>aseguradora del seguro de RC profesional</Pendiente>.
          </li>
          <li>
            {BRAND_NAME} es correduría independiente: no mantiene una participación, directa o indirecta,
            superior al 10 % de los derechos de voto o del capital de ninguna entidad aseguradora, ni
            ninguna entidad aseguradora la mantiene sobre {BRAND_NAME}.
          </li>
          <li>
            Compara y asesora sobre los productos de las siguientes aseguradoras, entre otras:{" "}
            {partnersTxt}. No presta asesoramiento imparcial y personal basado en un análisis objetivo
            cuando la comparativa se limita a los productos con los que trabaja habitualmente.
          </li>
          <li>
            Para quejas y reclamaciones relacionadas con la actividad de mediación, puede dirigirse al
            departamento de atención al cliente en <Pendiente>email del servicio de atención al cliente</Pendiente>,
            y, en caso de no obtener respuesta satisfactoria, ante el Servicio de Reclamaciones de la
            DGSFP.
          </li>
        </ul>

        {/* 3. PRIVACIDAD */}
        <H2 id="privacidad">3. Política de privacidad</H2>

        <H3>3.1 Responsable del tratamiento</H3>
        <P>
          <strong translate="no">{BRAND_NAME}</strong>, CIF <Pendiente>CIF</Pendiente>, domicilio en{" "}
          <Pendiente>domicilio social</Pendiente>. Contacto para cuestiones de protección de datos:{" "}
          <Pendiente>email del delegado de protección de datos o responsable de privacidad</Pendiente>.
        </P>

        <H3>3.2 Finalidades y base jurídica del tratamiento</H3>
        <P>Tratamos los datos que nos facilitas a través de los formularios de esta web para:</P>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed text-slate2">
          <li>
            Elaborar y enviarte una comparativa o presupuesto de seguros, y contactarte por teléfono,
            WhatsApp o correo electrónico para atender esa misma solicitud (confirmarte el precio,
            resolver dudas, programar una llamada) — base jurídica: ejecución de medidas
            precontractuales a tu solicitud (art. 6.1.b RGPD). Te informamos de ello, junto con esta
            política de privacidad, en la casilla obligatoria de cada formulario: al no ser una
            finalidad distinta de la que tú mismo inicias, no exige un consentimiento separado, aunque
            igualmente requiere una acción afirmativa expresa (marcar la casilla) antes de poder
            enviar el formulario.
          </li>
          <li>
            Cuando el seguro que solicitas trata datos de salud (salud, vida — el hábito de fumar o el
            motivo de la contratación cuentan como datos de salud a estos efectos), calcular y comparar
            tu tarifa a partir de esos datos — base jurídica: tu consentimiento explícito y separado
            para categorías especiales de datos (art. 9.2.a RGPD), recogido en una casilla propia,
            distinta de la anterior y nunca premarcada.
          </li>
          <li>Enviarte comunicaciones comerciales sobre productos de seguros — base jurídica: tu consentimiento expreso, opcional, desmarcado por defecto y revocable en cualquier momento.</li>
          <li>Gestionar tu área de cliente, tus llamadas programadas y tus notificaciones, si te registras — base jurídica: ejecución de la relación contractual o precontractual.</li>
          <li>Medir el rendimiento y la seguridad de la web (analítica, prevención de abuso) — base jurídica: interés legítimo y, para las cookies no esenciales, tu consentimiento a través del panel de cookies.</li>
        </ul>

        <H3>3.3 Destinatarios y encargados del tratamiento</H3>
        <P>
          Tus datos no se venden ni se ceden a terceros para fines distintos de los indicados. Para
          poder prestar el servicio, algunos datos se comparten con los siguientes encargados del
          tratamiento, cada uno vinculado por su correspondiente contrato de encargo (art. 28 RGPD):
        </P>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed text-slate2">
          <li><strong>Alojamiento y base de datos:</strong> Vercel Inc. y Upstash Inc. (infraestructura de hosting y almacenamiento de la web y del CRM).</li>
          <li><strong>Mensajería por WhatsApp:</strong> ManyChat LLC, si nos escribes o te contactamos por WhatsApp.</li>
          <li><strong>Llamada automática de bienvenida (si está activada):</strong> Retell AI o Bland AI, proveedores del asistente de voz que puede realizar una primera llamada automatizada tras completar un formulario con autorización de contacto.</li>
          <li><strong>Analítica y medición (solo si aceptas cookies analíticas/de marketing):</strong> Google (Tag Manager / Analytics) y Meta Platforms Inc. (píxel de Facebook/Instagram y Conversions API, esta última solo si has marcado la casilla de comunicaciones comerciales — el email y el teléfono se envían siempre cifrados con SHA-256 antes de salir de nuestro servidor, nunca en claro).</li>
          <li><strong>Envío de correo electrónico:</strong> Resend (Resend Inc.), para el correo de verificación de acceso a tu área de cliente.</li>
          <li><strong>Aseguradoras:</strong> {partnersTxt}, únicamente si decides avanzar hacia la contratación de una póliza, y solo con los datos necesarios para tramitarla.</li>
        </ul>

        <H3>3.4 Transferencias internacionales</H3>
        <P>
          Algunos de los proveedores anteriores (Vercel, Upstash, ManyChat, Retell AI, Bland AI, Google,
          Meta, Resend) pueden tratar datos en servidores ubicados fuera del Espacio Económico Europeo,
          en particular en Estados Unidos. En esos casos, la transferencia se ampara en las Cláusulas
          Contractuales Tipo aprobadas por la Comisión Europea u otro mecanismo de garantía equivalente
          reconocido por el RGPD. Puedes solicitarnos más información sobre estas garantías en cualquier
          momento.
        </P>

        <H3>3.5 Plazo de conservación</H3>
        <P>
          Conservamos tus datos mientras exista una relación activa contigo o mientras no ejerzas tu
          derecho de supresión. Si tu solicitud no llega a convertirse en una póliza contratada,
          conservamos tus datos identificativos durante un máximo de 24 meses desde tu última
          interacción; pasado ese plazo, se anonimizan automáticamente, conservando únicamente
          información estadística y el histórico de consentimientos como prueba de cumplimiento, sin
          que puedan volver a asociarse a ti. Si llegas a ser cliente, tus datos se conservan mientras
          dure la relación contractual y, después, durante los plazos de prescripción legal aplicables
          (fiscal, mercantil y de responsabilidad civil).
        </P>

        <H3>3.6 Tus derechos</H3>
        <P>Puedes ejercer en cualquier momento los siguientes derechos, de forma gratuita:</P>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed text-slate2">
          <li><strong>Acceso:</strong> saber qué datos tuyos tratamos.</li>
          <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
          <li><strong>Supresión:</strong> pedir que eliminemos tus datos cuando ya no sean necesarios.</li>
          <li><strong>Oposición:</strong> oponerte al tratamiento, en particular a las comunicaciones comerciales.</li>
          <li><strong>Limitación:</strong> pedir que restrinjamos temporalmente el tratamiento.</li>
          <li><strong>Portabilidad:</strong> recibir tus datos en un formato estructurado y de uso común.</li>
          <li><strong>Retirar el consentimiento</strong> en cualquier momento, sin que afecte a la licitud del tratamiento previo.</li>
        </ul>
        <P>
          Puedes ejercer estos derechos escribiendo a <Pendiente>email para ejercer derechos RGPD</Pendiente>,
          indicando el derecho que quieres ejercer y adjuntando una copia de tu DNI u otro documento que
          acredite tu identidad. Responderemos en el plazo máximo de un mes. Si en algún momento
          consideras que no hemos atendido correctamente tu solicitud, tienes derecho a presentar una
          reclamación ante la Agencia Española de Protección de Datos (AEPD),{" "}
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">www.aepd.es</a>.
        </P>

        <H3>3.7 Menores de edad</H3>
        <P>
          Los formularios de esta web están dirigidos a personas mayores de edad. No recogemos de forma
          consciente datos de menores de 18 años; si detectamos que se han facilitado, los eliminaremos
          en cuanto tengamos constancia.
        </P>

        <H3>3.8 Seguridad</H3>
        <P>
          Aplicamos medidas técnicas y organizativas adecuadas para proteger tus datos: cifrado de las
          comunicaciones (HTTPS), contraseñas de acceso al panel interno protegidas mediante funciones
          de derivación de clave, control de acceso basado en permisos por persona del equipo, y un
          registro de auditoría de las acciones realizadas sobre tus datos dentro de nuestro CRM.
        </P>

        {/* 4. COOKIES */}
        <H2 id="cookies">4. Política de cookies</H2>
        <P>
          Este sitio utiliza cookies y tecnologías similares propias y de terceros. Puedes aceptarlas,
          rechazarlas o configurarlas de forma granular desde el aviso que aparece en tu primera visita,
          o volver a abrirlo en cualquier momento desde el enlace del pie de página.
        </P>
        <div className="mt-3 overflow-x-auto rounded-card border border-hair">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-mist text-[12px] font-bold text-navy">
              <tr>
                <th className="px-3 py-2">Cookie</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Finalidad</th>
                <th className="px-3 py-2">Duración</th>
              </tr>
            </thead>
            <tbody className="text-slate2">
              <tr className="border-t border-hair">
                <td className="px-3 py-2 font-mono text-[12px]">ventajon_client_session</td>
                <td className="px-3 py-2">Necesaria</td>
                <td className="px-3 py-2">Mantener tu sesión en el área de cliente.</td>
                <td className="px-3 py-2">Hasta 90 días</td>
              </tr>
              <tr className="border-t border-hair">
                <td className="px-3 py-2 font-mono text-[12px]">ventajon_agent_session</td>
                <td className="px-3 py-2">Necesaria</td>
                <td className="px-3 py-2">Sesión del equipo en el panel interno de administración.</td>
                <td className="px-3 py-2">Hasta 30 días</td>
              </tr>
              <tr className="border-t border-hair">
                <td className="px-3 py-2 font-mono text-[12px]">_ga, _gid y similares</td>
                <td className="px-3 py-2">Analítica (opcional)</td>
                <td className="px-3 py-2">Medir el uso de la web mediante Google Analytics, si aceptas cookies analíticas.</td>
                <td className="px-3 py-2">Hasta 24 meses</td>
              </tr>
              <tr className="border-t border-hair">
                <td className="px-3 py-2 font-mono text-[12px]">_fbp, _fbc</td>
                <td className="px-3 py-2">Marketing (opcional)</td>
                <td className="px-3 py-2">Píxel de Meta (Facebook/Instagram): medir campañas y mostrarte anuncios relevantes, si aceptas cookies de marketing.</td>
                <td className="px-3 py-2">Hasta 3 meses</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          Además, guardamos en el almacenamiento local de tu navegador (no son cookies enviadas al
          servidor) tu decisión sobre este aviso y, si lo aceptas, el origen de tu visita (utm/página de
          entrada) durante 30 días, para poder atribuir correctamente de dónde llega cada solicitud.
        </P>

        {/* 5. CONDICIONES DE USO */}
        <H2 id="condiciones">5. Condiciones de uso</H2>
        <P>
          El acceso y uso de este sitio web atribuye la condición de usuario y supone la aceptación de
          estas condiciones. Los precios y estimaciones que se muestran en los tarificadores y
          comparativas son orientativos, calculados a partir de los datos que facilitas y de las
          tarifas vigentes de cada compañía en cada momento: el precio final de cualquier póliza queda
          sujeto a la confirmación de la aseguradora tras el estudio completo del riesgo. El uso del
          comparador y del formulario de solicitud de contacto es gratuito y no implica ningún
          compromiso de contratación.
        </P>
        <P>
          Todos los contenidos de esta web (textos, diseño, código, logotipos) son propiedad de{" "}
          {BRAND_NAME} o se utilizan con la correspondiente autorización, y están protegidos por la
          normativa de propiedad intelectual. Queda prohibida su reproducción sin autorización expresa.
        </P>
        <P>
          Estas condiciones se rigen por la legislación española. Para cualquier controversia que no
          pueda resolverse por vía amistosa, y sin perjuicio del derecho del usuario consumidor a acudir
          al fuero de su domicilio, las partes se someten a los Juzgados y Tribunales de{" "}
          <Pendiente>ciudad del domicilio social</Pendiente>.
        </P>

        {/* 6. COMUNICACIONES COMERCIALES */}
        <H2 id="comunicaciones">6. Comunicaciones comerciales y llamadas telefónicas</H2>
        <P>
          Solo te llamamos o te escribimos por WhatsApp para atender una solicitud que tú mismo nos has
          enviado (por ejemplo, confirmarte un presupuesto) o si nos has dado tu consentimiento expreso
          para comunicaciones comerciales; en ambos casos te lo indicamos con claridad en el propio
          formulario antes de enviarlo. Puedes revocar tu autorización en cualquier momento indicándolo
          en la propia llamada, respondiendo "BAJA" por WhatsApp, o escribiendo a{" "}
          <Pendiente>email para darte de baja del contacto comercial</Pendiente>. En cumplimiento de la
          Ley General de Telecomunicaciones, las llamadas comerciales se realizan desde numeración
          identificable como tal; puedes consultar los números concretos desde los que te llamamos en la
          página de agradecimiento tras completar un formulario. Si consideras que hemos vulnerado tu
          derecho a no recibir comunicaciones comerciales no deseadas, puedes reclamar ante la Lista
          Robinson (<a href="https://www.listarobinson.es" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">listarobinson.es</a>) o ante la AEPD.
        </P>

        <p className="mt-4 text-[12px] text-slate2">
          Última actualización de este texto: {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long" })}.
          {" "}Atención {CONTACT_HOURS}.
        </p>

        <a href="/" className="mt-8 block text-[14px] font-medium text-navy underline">
          Volver al inicio
        </a>
      </main>
    </>
  );
}
