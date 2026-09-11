import type { Metadata } from "next";
import { Check, ArrowRight, IconByName } from "@/components/icons";
import { BRAND_NAME, PARTNERS, ECOSYSTEM_MEMBERS } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Presentación ejecutiva — ${BRAND_NAME}`,
  description: "Presentación ejecutiva del proyecto web de Asegurados Ventajon: funcionalidades, atribución UTM, tarificadores, captación de llamadas y panel admin.",
  robots: { index: false, follow: false },
};

const TOC = [
  { id: "resumen", label: "Resumen" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "plataforma", label: "La plataforma" },
  { id: "jornada", label: "Recorrido" },
  { id: "tarificadores", label: "Tarificadores" },
  { id: "precios", label: "Precios reales" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "utm", label: "Atribución" },
  { id: "llamada", label: "Llamada + voz IA" },
  { id: "area-cliente", label: "Área de cliente" },
  { id: "referidos", label: "Referidos" },
  { id: "gracias", label: "Página de gracias" },
  { id: "admin", label: "Panel / CRM" },
  { id: "seguridad", label: "Seguridad" },
  { id: "cumplimiento", label: "Cumplimiento" },
  { id: "antes-despues", label: "Antes / después" },
  { id: "roadmap", label: "Pendientes" },
];

export default function PresentacionEjecutiva() {
  const today = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  return (
    <>
      {/* Barra superior */}
      <header className="sticky top-0 z-40 border-b border-hair bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-baseline gap-1.5 font-display text-[17px] font-extrabold tracking-tight text-navy" translate="no">
            <span aria-hidden="true" className="mr-0.5 inline-block h-3 w-3 translate-y-[1px] rounded-[3px] bg-brand-red" />
            Asegurados<span className="text-brand-red">Ventajon</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-pill bg-navy/10 px-3 py-1 text-[12px] font-semibold text-navy sm:inline">Presentación ejecutiva</span>
            <span className="rounded-pill bg-brand-red/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand-red">Confidencial</span>
          </div>
        </div>
        <nav aria-label="Secciones" className="border-t border-hair bg-white">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TOC.map((t) => (
              <a key={t.id} href={`#${t.id}`} className="shrink-0 rounded-pill px-3 py-1.5 text-[13px] font-semibold text-slate2 transition-colors hover:bg-mist hover:text-navy">
                {t.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      <main id="contenido">
        {/* PORTADA */}
        <section className="border-b border-hair bg-gradient-to-b from-navy to-navy-deep text-white">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <span className="inline-flex items-center rounded-pill bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-white/90">
              Dirección · Manager Asegurados Ventajon
            </span>
            <h1 className="mt-5 max-w-3xl text-[40px] font-extrabold leading-[1.08] tracking-tight sm:text-[52px]">
              De la auditoría del funnel a una plataforma propia
            </h1>
            <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-white/80">
              Presentación del proyecto web de {BRAND_NAME}: qué construimos, qué problema resuelve
              frente al funnel actual y cómo funcionan por dentro los tarificadores, la comparativa con
              precios reales, el tarificador por WhatsApp, la captación y llamada automática, el área de
              cliente, los referidos y el panel de gestión de leads.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-white/70">
              <span>{today}</span>
              <span aria-hidden="true">·</span>
              <span>Marketing Digital &amp; Ecommerce</span>
              <span aria-hidden="true">·</span>
              <span>Base: auditoría UX, funnel y CRO — 13 de julio de 2026</span>
            </div>
          </div>
        </section>

        {/* RESUMEN EJECUTIVO */}
        <Section id="resumen" eyebrow="01" title="Resumen ejecutivo">
          <p className="max-w-3xl text-[16px] leading-relaxed text-slate2">
            La auditoría del funnel actual (<span className="text-ink">ventajon.com/seguros</span>) detectó fallos
            estructurales en el tramo de mayor valor: analítica poco fiable, un cross-sell que interrumpe la
            venta principal y un formulario que no confirma nada al usuario tras pedirle sus datos. La respuesta
            no ha sido parchear esos puntos, sino construir un espacio propio para Asegurados Ventajon, con su
            propio customer journey, su propio tarificador y un CRM interno que hace visible todo lo que antes
            se perdía.
          </p>
          <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-slate2">
            Desde entonces la plataforma ha crecido bastante más allá del arreglo del funnel: hoy son <b className="text-ink">4
            tarificadores</b> (salud, vida, auto y decesos) sobre un mismo motor, una <b className="text-ink">comparativa con
            precios reales de las aseguradoras en vivo</b> (integración de Codeoscopic ya cableada), un <b className="text-ink">tarificador
            conversacional por WhatsApp</b> (ManyChat), <b className="text-ink">llamada automática de voz con IA</b> (Retell/Bland),
            un <b className="text-ink">área de cliente sin registro</b>, un <b className="text-ink">programa de referidos</b> con pago
            automático de incentivos, y un panel de administración tipo SaaS con equipo, permisos y doble factor.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard tone="red" k="3 hallazgos" v="de severidad alta o crítica" d="detectados en el funnel actual y evitados por diseño en la nueva plataforma." />
            <StatCard tone="navy" k="1 solo objetivo" v="por pantalla" d="ningún tarificador se interrumpe con productos ajenos a la intención del usuario." />
            <StatCard tone="mint" k="100% de los leads" v="con atribución" d="cada lead guarda sus UTMs, consentimientos y trazabilidad desde el primer contacto." />
          </div>
        </Section>

        {/* DIAGNÓSTICO */}
        <Section id="diagnostico" eyebrow="02" tone="mist" title="El diagnóstico: qué falla en el funnel actual" subtitle="Extraído de la auditoría de UX, Funnel y CRO sobre ventajon.com/seguros.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FindingCard severity="CRÍTICO" title="Error técnico de analítica" desc="Las llamadas a Google Analytics 4 devuelven un error 503 y el título de la página de resultados se corrompe, acumulando decenas de valores de “Presupuesto” concatenados. Compromete la fiabilidad de los datos de conversión." />
            <FindingCard severity="ALTO" title="Callejón sin salida en el lead" desc="El formulario de captación del descuento no muestra confirmación ni entrega el código prometido tras el envío. Riesgo de pérdida de confianza justo tras compartir datos personales." />
            <FindingCard severity="ALTO" title="Cross-sell fuera de foco, con confirmshaming" desc="Antes de ver el presupuesto de salud aparece un cross-sell de Viajeros no solicitado. El enlace de renuncia usa fricción emocional artificial para forzar la conversión del producto cruzado." />
            <FindingCard severity="ALTO" title="Resultados sin CTA por plan individual" desc="La tabla comparativa es informativa pero no permite avanzar sobre una combinación concreta: el usuario llega al momento de mayor interés y no tiene un siguiente paso propio." />
            <FindingCard severity="MEDIO" title="Formulario de contacto duplicado" desc="La página de categoría incluye un segundo formulario en el footer, redundante con el tarificador ya ofrecido arriba: genera confusión sobre cuál es el camino de conversión recomendado." />
            <FindingCard severity="MEDIO" title="Acceso a salud sin CTA directo en home" desc="El usuario debe pasar por el menú superior o hacer scroll ~40% para llegar al producto que busca, alargando el camino de quien llega con intención específica." />
          </div>
          <p className="mt-6 max-w-3xl text-[14px] leading-relaxed text-slate2">
            Lectura de fondo: el funnel actual mezcla dos objetivos de conversión distintos en el tramo final
            (salud y Viajeros), no confirma nada tras el envío del formulario y no deja capturar la intención de
            compra en el momento en que es más alta. Los tres problemas comparten una misma causa: el funnel de
            salud vive dentro de una web pensada para otro producto, sin espacio propio.
          </p>
        </Section>

        {/* LA PLATAFORMA */}
        <Section id="plataforma" eyebrow="03" title="La respuesta: una plataforma propia" subtitle="Landing, tarificadores y CRM construidos desde cero para Asegurados Ventajon, con su propio customer journey.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TechPill label="Next.js 14" note="App Router" />
            <TechPill label="TypeScript" note="tipado extremo a extremo" />
            <TechPill label="Tailwind CSS" note="sistema visual propio" />
            <TechPill label="Zod" note="validación de formularios" />
            <TechPill label="Vercel KV / Redis" note="almacén de leads durable" />
            <TechPill label="Codeoscopic" note="precios reales de aseguradoras" />
            <TechPill label="ManyChat" note="tarificador por WhatsApp" />
            <TechPill label="Retell / Bland" note="llamada de voz con IA" />
            <TechPill label="Meta CAPI + GA4" note="medición server-side + Consent Mode" />
            <TechPill label="Tremendous" note="pago de referidos (vale Amazon)" />
            <TechPill label="Mobile-first" note="pensado para el móvil primero" />
            <TechPill label="CSV / API admin" note="exportación e integración" />
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <PrincipleCard title="Un solo objetivo por pantalla" desc="Cada paso del tarificador pide un único dato. Ningún producto ajeno (viajes, hogar…) interrumpe un tarificador en curso." />
            <PrincipleCard title="Confirmación siempre" desc="Todo envío termina en una pantalla de agradecimiento visible, con próximos pasos explicados. Nunca un callejón sin salida." />
            <PrincipleCard title="Sin letra pequeña ni precios de gancho" desc="No se muestran precios cerrados ni descuentos sin validar por dirección: el asesor da la propuesta real, personalizada." />
          </div>
        </Section>

        {/* RECORRIDO */}
        <Section id="jornada" eyebrow="04" tone="mist" title="El recorrido del usuario, de un vistazo">
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <JourneyStep n={1} title="Home" desc="CTA directo a “Calcula tu precio” y “Te llamamos gratis” ya en el primer scroll." />
            <JourneyStep n={2} title="Tarificador guiado" desc="Pasos cortos, un dato por pantalla, sin interstitials de otros productos." />
            <JourneyStep n={3} title="Solicitud de contacto" desc="El tarificador cierra pidiendo nombre, teléfono y correo. Sin tablas sin salida." />
            <JourneyStep n={4} title="Gracias + seguimiento" desc="Confirmación inmediata, números de llamada guardables y WhatsApp de respaldo." last />
          </ol>
        </Section>

        {/* TARIFICADORES */}
        <Section id="tarificadores" eyebrow="05" title="Tarificadores guiados (4 ramos, un solo motor)" subtitle="Un mismo motor declarativo de pasos (StepForm + lib/forms.ts) alimenta los 4 tarificadores. Solo cambian los pasos y el endpoint; se organizan en 3 fases con nombre: Tu seguro → Tus datos → Tu precio.">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
              <p className="text-[13px] font-bold uppercase tracking-wide text-brand-red">/tarificador · salud</p>
              <h3 className="mt-1 text-[20px] font-extrabold text-navy">Seguro de salud · 3 fases</h3>
              <ol className="mt-4 flex flex-col gap-2.5 text-[14px] text-ink">
                {["Inicio deseado y nº de personas a asegurar (la zona se deriva del CP, sin paso “¿dónde vives?”)", "Titular (fecha nac. + sexo), CP real, ¿fuma?, asegurados adicionales, ¿dental?, ¿ya tiene seguro?", "En la comparativa: nombre, dos apellidos, DNI/NIE, teléfono, email y consentimiento → POST /api/lead"].map((s, i) => (
                  <li key={s} className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy/10 text-[12px] font-bold tnums text-navy">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
              <p className="text-[13px] font-bold uppercase tracking-wide text-brand-red">vida · auto · decesos</p>
              <h3 className="mt-1 text-[20px] font-extrabold text-navy">Los otros 3 ramos</h3>
              <ul className="mt-4 flex flex-col gap-3 text-[14px] text-ink">
                <li><b className="text-navy">Vida</b> — motivo (familia / hipoteca / ahorro), zona, fecha nac. + sexo, ¿fumador?, seguro actual.</li>
                <li><b className="text-navy">Auto</b> — el más largo: vehículo y matrícula, uso, conductor, antigüedad de carnet + cobertura, seguro actual.</li>
                <li><b className="text-navy">Decesos</b> — para quién es (uno mismo / familiar / toda la familia), nº de asegurados, titular.</li>
                <li className="text-slate2">Hogar aún no tiene tarificador propio: es página informativa + “que te llamen”.</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-card border border-hair bg-white p-5">
              <p className="text-[14px] leading-relaxed text-slate2">
                Cada respuesta se valida con <b className="text-ink">Zod</b> antes de enviarse (móvil español, CP de 5
                dígitos, DNI/NIE, fecha de nacimiento coherente…). En salud y vida el lead se crea en el <b className="text-ink">gate
                de la comparativa</b>, no antes; en auto y decesos, en el paso de contacto. Nunca hay tabla de
                resultados sin CTA ni desvíos a otro producto a mitad de camino — el hallazgo de mayor severidad de la
                auditoría queda resuelto por diseño.
              </p>
            </div>
            <div className="rounded-card border border-navy/20 bg-navy/[0.03] p-5">
              <p className="text-[14px] leading-relaxed text-slate2">
                <b className="text-ink">Minimización de datos (RGPD art. 5.1.c):</b> el DNI/NIE y los apellidos ya no se
                piden dentro del tarificador — solo se recogen al final, en la comparativa, justo cuando hacen falta para
                cotizar de verdad. Menos fricción para el usuario y menos dato personal en tránsito del que no se
                necesita todavía.
              </p>
            </div>
          </div>
        </Section>

        {/* PRECIOS REALES / CODEOSCOPIC */}
        <Section id="precios" eyebrow="06" tone="mist" title="La comparativa: precios reales de las aseguradoras en vivo" subtitle="El tramo de resultados que la auditoría señaló sin CTA es ahora una comparativa propia con precios reales consultados en directo a las compañías, vía el motor Codeoscopic (Avant2).">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
              <h3 className="text-[16px] font-bold text-ink">Dos bloques en una sola pantalla</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                <b className="text-ink">Opciones negociadas por Asegurados Ventajon</b> (catálogo editable en /admin/productos):
                salen siempre arriba, con badge “Recomendado”, por norma sin copago — es la oferta comercial preferente.
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-slate2">
                <b className="text-ink">Precios reales de mercado</b>: las compañías cotizando en directo el perfil del
                usuario, con logo, modalidad, valoración, precio/mes, coberturas y condicionado en PDF. El usuario ordena
                (recomendado / precio / valoración) y filtra (copago, dental, reembolso), y cada opción lleva a “Que te
                llamen gratis”.
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-slate2">
                Se mantiene la decisión de marca: <b className="text-ink">sin precios de gancho ni % de ahorro sin validar</b>.
                Todo precio es orientativo; el asesor confirma la propuesta real.
              </p>
            </div>
            <div className="rounded-[24px] border border-hair bg-navy p-6 text-white shadow-card">
              <p className="text-[13px] font-bold uppercase tracking-wide text-white/60">Cómo fluye la cotización</p>
              <ol className="mt-4 flex flex-col gap-4 text-[14px]">
                <FlowStep n={1} text="Al montar la comparativa se crea un proyecto en Codeoscopic (POST /api/quote/create)." />
                <FlowStep n={2} text="La web hace polling cada 4s mientras las aseguradoras van respondiendo con su tarifa." />
                <FlowStep n={3} text="Se muestran las opciones reales junto a las negociadas, con acceso protegido al lead." />
                <FlowStep n={4} text="Si el usuario elige una, se crea el presupuesto con esa compañía y precio." last />
              </ol>
            </div>
          </div>
          <div className="mt-6 rounded-card border border-navy/20 bg-navy/[0.03] p-5">
            <p className="text-[14px] leading-relaxed text-slate2">
              <b className="text-ink">Estado:</b> la integración está construida y cableada de punta a punta (cliente OAuth2,
              mapeo del lead, resolución de código postal a municipio). Lo único pendiente para producción son las
              credenciales reales de Codeoscopic; mientras tanto, todo el flujo degrada en silencio a un catálogo de
              referencia, sin error para el usuario.
            </p>
          </div>
        </Section>

        {/* WHATSAPP / MANYCHAT */}
        <Section id="whatsapp" eyebrow="07" title="Tarificador por WhatsApp (ManyChat)" subtitle="El mismo motor de precios reales, ahora dentro de una conversación de WhatsApp — donde ya está el usuario que viene de campañas de Meta.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FeatureRow icon="compare" title="Cotiza en tiempo real en el chat" desc="ManyChat recoge los datos por WhatsApp y llama a la web, que da de alta el lead y pide precios a Codeoscopic dentro de la propia conversación." />
            <FeatureRow icon="check" title="La más barata, con y sin copago" desc="Espera a que respondan varias compañías y devuelve la tarifa firme más barata; muestra con y sin copago, y añade como gancho las opciones negociadas por Asegurados Ventajon (sin copagos)." />
            <FeatureRow icon="doc" title="Puente a la web sin reteclear" desc="Manda un enlace firmado a la comparativa con los datos precargados: el usuario ve todas las opciones sin volver a escribir nada ni reaceptar la política." />
            <FeatureRow icon="pin" title="Reconoce al cliente y prellena" desc="Con el teléfono sabe si ya tarificó en la web y prerrellena sus datos para saltarse preguntas; muestra sus presupuestos y le deja cancelar o reprogramar su llamada, todo desde WhatsApp." />
          </div>
        </Section>

        {/* UTM */}
        <Section id="utm" eyebrow="08" tone="mist" title="Atribución propia y medición server-side" subtitle="Cada lead sabe de dónde vino, aunque Analytics falle — y la conversión se mide también desde el servidor.">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
              <p className="text-[14px] leading-relaxed text-slate2">
                La auditoría señaló un error crítico: las llamadas a GA4 fallan (503) y el título de la página se
                corrompe, lo que compromete la fiabilidad de los datos de conversión de campañas. La plataforma
                no depende únicamente de una herramienta externa: captura la atribución <b className="text-ink">en el propio lead</b>,
                en el momento del envío, y la persiste en el CRM interno.
              </p>
              <div className="mt-5 flex flex-wrap gap-2" translate="no">
                {["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer", "gclid", "fbclid"].map((u) => (
                  <span key={u} className="rounded-pill border border-hair bg-mist px-3 py-1.5 text-[12px] font-semibold text-navy">{u}</span>
                ))}
              </div>
              <p className="mt-5 text-[14px] leading-relaxed text-slate2">
                Además, el evento de conversión <b className="text-ink">“Lead” se envía a Meta por la Conversions API
                (server-to-server)</b>, resistente a bloqueadores y a Safari/ITP, con email y teléfono hasheados. GA4 y GTM
                cargan con <b className="text-ink">Consent Mode v2</b>, reactivos al banner de cookies, que siempre tiene
                prioridad sobre los popups de marketing.
              </p>
            </div>
            <div className="rounded-[24px] border border-hair bg-navy p-6 text-white shadow-card">
              <p className="text-[13px] font-bold uppercase tracking-wide text-white/60">Cómo fluye</p>
              <ol className="mt-4 flex flex-col gap-4 text-[14px]">
                <FlowStep n={1} text="Un anuncio o email llega con parámetros ?utm_source=…&utm_campaign=…" />
                <FlowStep n={2} text="La landing o el tarificador leen esos parámetros al cargar la página (ventana de 30 días)." />
                <FlowStep n={3} text="Al enviar, los UTM viajan junto al lead; el evento Lead sale también por CAPI." />
                <FlowStep n={4} text="El lead queda guardado con su atribución completa, visible y filtrable en el panel admin." last />
              </ol>
            </div>
          </div>
        </Section>

        {/* LLAMADA */}
        <Section id="llamada" eyebrow="09" title="Solicitud de llamada + llamada automática de voz IA" subtitle="La página “Quiero que me llamen” es un paso de conversión aislado; y cuando el lead autoriza contacto, un agente de voz con IA puede llamarle en segundos.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FeatureRow icon="shield" title="Pantalla completa, sin salidas" desc="Sin menú, sin navegación ni enlaces de fuga: es la página CRO de /quiero-que-me-llamen, dedicada solo a captar el teléfono. Si ya tarificó, no repite datos: confirma la franja en un clic." />
            <FeatureRow icon="check" title="Confirmación inmediata" desc="Al enviar, el propio formulario cambia a un estado de “Solicitud recibida”, con mensaje claro de qué va a pasar. Nunca un envío sin respuesta." />
            <FeatureRow icon="doc" title="Consentimiento con sello de tiempo" desc="Un único check esencial agrupa privacidad, contacto y comunicaciones; se graba con doble sello de tiempo (cliente y servidor), listo para auditoría legal." />
            <FeatureRow icon="compare" title="Antispam y anti-acoso" desc="Honeypot + CAPTCHA invisible (Turnstile) + límite de frecuencia por IP y por teléfono, para no llamar de más a la misma persona." />
          </div>
          <div className="mt-6 rounded-[24px] border border-hair bg-white p-6 shadow-card">
            <h3 className="text-[16px] font-bold text-ink">Llamada automática de voz con IA (Retell / Bland)</h3>
            <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-slate2">
              Al completar un tarificador o pedir que le llamen, si el lead autoriza el contacto se dispara —de forma
              opcional y configurable— una llamada saliente de un agente de voz con IA, con su nombre, producto y zona
              como variables. El resultado de la llamada vuelve por webhook firmado y queda registrado en la ficha del
              lead. Frente al “callejón sin salida” de la auditoría, este flujo cierra siempre con una respuesta visible
              y la ficha creada (o actualizada, si es recurrente) en el CRM.
            </p>
          </div>
        </Section>

        {/* AREA DE CLIENTE */}
        <Section id="area-cliente" eyebrow="10" tone="mist" title="Área de cliente, sin registro" subtitle="El propio lead consulta y gestiona lo suyo sin crear usuario ni contraseña — identificado de forma segura, con la base de datos como única fuente de verdad.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FeatureRow icon="shield" title="Sin usuario ni contraseña" desc="Se identifica por una cookie de sesión firmada que solo guarda el identificador del lead. Tras tarificar por primera vez, entra directo." />
            <FeatureRow icon="doc" title="Recuperación con enlace de un solo uso" desc="Desde otro dispositivo, introduce su email o teléfono y recibe un enlace de acceso caducable al dato YA guardado (nunca autentica con datos que no son secretos)." />
            <FeatureRow icon="compare" title="Sus presupuestos y llamadas" desc="Ve sus presupuestos (solo lo que le concierne, sin notas internas del agente) y puede cancelar o reprogramar sus llamadas." />
            <FeatureRow icon="check" title="Avisos y notificaciones push" desc="Centro de notificaciones (llamada reprogramada/hecha) y notificaciones push del navegador si las activa. Reenvío del acceso por WhatsApp además de email." />
          </div>
        </Section>

        {/* REFERIDOS */}
        <Section id="referidos" eyebrow="11" title="Programa de referidos “Amigos Ventajon”" subtitle="Un canal de captación con coste por adquisición objetivo la mitad del de paid ads, con pago automático de incentivos.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <PrincipleCard title="Doble incentivo simétrico" desc="20 € en vale Amazon para el amigo al cotizar (tras doble opt-in) y 20 € para el cliente que le trajo cuando el amigo contrata y supera 30 días de vigencia." />
            <PrincipleCard title="Pago automático" desc="Los vales se emiten por Tremendous (Amazon.es eGift) sin gestión manual, con idempotencia para no pagar dos veces y reintentos ante fallo." />
            <PrincipleCard title="Anti-fraude y RGPD" desc="Solo refieren clientes con póliza vigente (comprobado en vivo), tope anual por persona, y el referidor nunca introduce el email del amigo — es él quien entra por su enlace." />
          </div>
        </Section>

        {/* GRACIAS / SaveCaller */}
        <Section id="gracias" eyebrow="12" tone="mist" title="Página de gracias: cerrar el círculo de confianza">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
              <h3 className="text-[18px] font-extrabold text-navy">“Guarda estos números”</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                La página de gracias ofrece descargar una tarjeta de contacto (vCard) con los números reales
                desde los que llama {BRAND_NAME}, más un botón de WhatsApp de respaldo. Así la llamada se
                reconoce y no se confunde con spam — clave de cara a la normativa de llamadas comerciales de
                octubre de 2026 (numeración 900/800 + solicitud previa del cliente).
              </p>
            </div>
            <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card">
              <h3 className="text-[18px] font-extrabold text-navy">Qué pasa ahora</h3>
              <ol className="mt-3 flex flex-col gap-2.5 text-[14px] text-ink">
                {["Preparamos tu comparativa personalizada.", "Te llamamos en tu franja horaria de atención.", "Si no puedes atender, insistimos o seguimos por WhatsApp.", "Eliges tranquilo, con un asesor de tu lado."].map((s, i) => (
                  <li key={s} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy/10 text-navy"><Check width={12} height={12} /></span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Section>

        {/* ADMIN */}
        <Section id="admin" eyebrow="13" title="Panel de administración: un CRM interno tipo SaaS" subtitle="Todo lo que entra —cualquier tarificador, “quiero que me llamen”, exit-intent o WhatsApp— aterriza en la misma ficha de lead. Rediseñado como un SaaS: menú lateral colapsable, modo oscuro y módulos.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FeatureRow icon="pin" title="Ficha 360º del lead" desc="Contacto, zona, datos del tarificador por ramo, identificación, atribución (UTM, referrer, gclid/fbclid), consentimientos y actividad — todo en una sola vista." />
            <FeatureRow icon="shield" title="Antiduplicado automático" desc="Si el mismo teléfono o email vuelve a escribir, no se crea otro lead: se completa la ficha existente y se registra la nueva solicitud en su actividad." />
            <FeatureRow icon="doc" title="Pipeline y próximo paso" desc="Nuevo → Contactado → Presupuestado → Ganado / Perdido, con “próximo paso” y notas editables por el asesor." />
            <FeatureRow icon="compare" title="Presupuestos, llamadas y tareas" desc="El presupuesto se crea solo cuando el usuario elige una opción; las llamadas y las tareas/recordatorios del equipo se gestionan desde el mismo panel." />
            <FeatureRow icon="doc" title="Resultado de las llamadas de voz" desc="El resultado de cada llamada automática (Retell/Bland) vuelve por webhook firmado y queda registrado en la ficha del lead." />
            <FeatureRow icon="check" title="Auditoría de consentimientos" desc="Cada consentimiento queda con IP, dispositivo, página de origen y marca de tiempo (cliente y servidor): prueba legal ante cualquier reclamación." />
            <FeatureRow icon="shield" title="Equipo con doble factor" desc="Agentes con login por email + contraseña y OTP obligatorio por email, con permisos por módulo; gestionar equipo y ver el registro de auditoría exige rol admin no delegable." />
            <FeatureRow icon="compare" title="Informes y seguimiento UTM" desc="Informes de negocio (Codeoscopic, price-match, referidos) y seguimiento de campañas por UTM, más exportación a CSV." />
            <FeatureRow icon="doc" title="Integraciones con estado real" desc="Una sección lista cada integración con su estado (derivado de las variables presentes) y una prueba de conexión real, con documentación descargable en PDF." />
          </div>
        </Section>

        {/* SEGURIDAD */}
        <Section id="seguridad" eyebrow="14" tone="mist" title="Seguridad, por diseño" subtitle="La captación abre una superficie que hay que proteger. Esto es lo que ya está integrado — pensado para la conversación con el equipo de ciberseguridad.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FeatureRow icon="shield" title="Doble factor y permisos" desc="Agentes con login + OTP obligatorio por email y permisos por módulo. Gestionar equipo y ver la auditoría exigen rol admin no delegable." />
            <FeatureRow icon="shield" title="Anti-acoso y antibot" desc="Límite de frecuencia por IP y por teléfono destino (para no llamar de más), honeypot y CAPTCHA invisible (Turnstile) en los formularios públicos." />
            <FeatureRow icon="doc" title="Webhooks firmados" desc="Los webhooks entrantes (Retell, Bland) verifican firma HMAC y son fail-closed; ManyChat usa un secreto compartido. Idempotencia para no procesar dos veces un reintento." />
            <FeatureRow icon="shield" title="Secretos aislados" desc="Cada dominio (sesión admin, sesión cliente, bloqueo de sitio) usa su propio secreto: si uno se ve comprometido, no arrastra a los demás." />
            <FeatureRow icon="compare" title="CSRF y aislamiento" desc="El middleware exige doble señal de origen en toda mutación de admin/cliente y añade cabeceras COOP/CORP. Acceso al lead protegido contra referencias directas (BOLA)." />
            <FeatureRow icon="pin" title="Bloqueo global de la web" desc="La web se puede cerrar tras contraseña (para pruebas o pre-lanzamiento), con anti-fuerza-bruta y sin exponerse a buscadores mientras está cerrada." />
          </div>
        </Section>

        {/* CUMPLIMIENTO */}
        <Section id="cumplimiento" eyebrow="15" title="Cumplimiento y protección legal" subtitle="La auditoría marcó la ausencia de checkboxes legales con persistencia como un gap obligatorio. Aquí es la base del formulario.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PrincipleCard title="Consentimiento esencial con sello de tiempo" desc="Un único check obligatorio agrupa privacidad, autorización de contacto y comunicaciones comerciales; en salud y vida incluye además el consentimiento explícito de datos de salud (RGPD art. 9). Se graba con doble sello de tiempo (cliente y servidor) para auditoría." />
            <PrincipleCard title="Preparado para octubre 2026" desc="La normativa de llamadas comerciales exigirá numeración identificable y solicitud previa: el flujo de captación y la página de gracias ya están alineados con ese modelo." />
            <PrincipleCard title="Minimización y retención" desc="Solo se pide el dato cuando hace falta (el DNI, ya en la comparativa); anonimización a los 24 meses de inactividad, y export/borrado del lead a petición (RGPD art. 15/17/20). Los avisos al equipo van sin datos personales." />
            <PrincipleCard title="Sin cifras sin validar" desc="No se publican precios cerrados ni porcentajes de descuento sin aprobación expresa de dirección, evitando el “bait” detectado en el cross-sell auditado." />
          </div>
        </Section>

        {/* ANTES / DESPUÉS */}
        <Section id="antes-despues" eyebrow="16" tone="mist" title="Antes / después, hallazgo por hallazgo">
          <div className="overflow-x-auto rounded-[24px] border border-hair bg-white shadow-card">
            <table className="w-full min-w-[720px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-hair bg-mist text-left">
                  <th className="px-5 py-3.5 font-bold text-navy">Hallazgo de la auditoría</th>
                  <th className="px-5 py-3.5 font-bold text-navy">En la plataforma propia</th>
                </tr>
              </thead>
              <tbody>
                <CompareRow before="Error 503 en GA4 y título de página corrupto." after="Atribución UTM propia en cada lead + evento Lead por la Conversions API server-side; no depende solo de GA4." />
                <CompareRow before="Formulario de descuento sin confirmación ni código." after="Confirmación visible en el propio formulario + página de gracias con próximos pasos." />
                <CompareRow before="Cross-sell de Viajeros con confirmshaming antes del presupuesto." after="Un único objetivo por tarificador: ningún producto ajeno interrumpe el flujo." />
                <CompareRow before="Tabla de resultados sin CTA por plan individual." after="Comparativa propia con precios reales en vivo (Codeoscopic) y un CTA de contacto por opción, sin callejones sin salida." />
                <CompareRow before="Formulario de contacto duplicado en la página de categoría." after="Un solo camino de conversión por página: tarificador o “quiero que me llamen”." />
                <CompareRow before="Sin checkboxes legales con persistencia." after="Consentimiento obligatorio con sello de tiempo y auditoría en el panel admin." />
              </tbody>
            </table>
          </div>
        </Section>

        {/* ROADMAP */}
        <Section id="roadmap" eyebrow="17" title="Decisiones pendientes antes de publicar" subtitle="Puntos abiertos que necesitan validación de dirección — transparencia total antes del lanzamiento.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RoadmapItem title="Textos legales" desc="La identificación registral y fiscal ya está cableada (razón social, CIF, clave DGSFP, Registro Mercantil, email de atención). Queda la validación final de privacidad RGPD, condiciones y aviso legal con legal." />
            <RoadmapItem title="Nombre de marca" desc="Confirmar la forma definitiva: “Asegurados Ventajon” (por defecto) o “Asegurados Ventajón”." />
            <RoadmapItem title="Números de la centralita" desc="Sustituir los números de ejemplo de la página de gracias por los números reales, antes de la normativa de octubre 2026." />
            <RoadmapItem title="Logos de compañías" desc="Adeslas, Mapfre y el resto de aseguradoras se muestran hoy solo en texto: los logos requieren autorización previa." />
            <RoadmapItem title="Imagen del hero" desc="La imagen actual es un placeholder de marca; sustituir por fotografía aprobada." />
            <RoadmapItem title="Precios y promociones" desc="Por decisión de marca, no se muestran precios ni % de ahorro. Cualquier cifra necesita validación expresa de dirección." />
            <RoadmapItem title="Credenciales de Codeoscopic" desc="La integración está construida y cableada; para dar precios reales en producción solo faltan las credenciales y la documentación de acceso de Codeoscopic." />
            <RoadmapItem title="Encaje con IT / desarrollo del grupo" desc="Decidir el modelo de dato (¿CRM propio o unificado con el del grupo?), la titularidad y el gobierno técnico y de ciberseguridad de esta plataforma frente a los sistemas actuales." />
          </div>
        </Section>

        {/* CIERRE */}
        <section className="border-t border-hair bg-navy text-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-[28px] font-extrabold leading-tight">Un funnel propio, medible y sin fugas</h2>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-white/80">
              La plataforma resuelve, uno por uno, los hallazgos de severidad alta y crítica de la auditoría, y
              deja una base propia — landing, tarificadores, captación de llamadas y CRM — sobre la que seguir
              construyendo el resto del ecosistema Ventajon, con {ECOSYSTEM_MEMBERS} de respaldo y trabajo
              conjunto con {PARTNERS.slice(0, 3).join(", ")} y el resto de compañías del panel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/" className="inline-flex items-center gap-2 rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
                Ver la landing en vivo <ArrowRight width={17} height={17} />
              </a>
              <a href="/tarificador" className="inline-flex items-center gap-2 rounded-card border border-white/30 px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10">
                Probar el tarificador
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hair bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-[12px] text-slate2">
          <span>{BRAND_NAME} · Marketing Digital &amp; Ecommerce · Confidencial</span>
          <span>{today}</span>
        </div>
      </footer>
    </>
  );
}

/* --------------------------------- Piezas -------------------------------- */

function Section({
  id, eyebrow, title, subtitle, tone = "white", children,
}: {
  id: string; eyebrow: string; title: string; subtitle?: string; tone?: "white" | "mist"; children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-32 border-b border-hair ${tone === "mist" ? "bg-mist" : "bg-white"}`}>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-[13px] font-bold uppercase tracking-wide text-brand-red">{eyebrow}</p>
        <h2 className="mt-2 max-w-2xl text-[28px] font-extrabold leading-tight text-navy sm:text-[32px]">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate2">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function StatCard({ k, v, d, tone }: { k: string; v: string; d: string; tone: "red" | "navy" | "mint" }) {
  const tones = {
    red: "border-brand-red/20 bg-brand-red/[0.04]",
    navy: "border-navy/20 bg-navy/[0.03]",
    mint: "border-mint-deep/20 bg-mint",
  } as const;
  return (
    <div className={`rounded-[24px] border p-6 ${tones[tone]}`}>
      <p className="text-[22px] font-extrabold text-navy">{k}</p>
      <p className="mt-0.5 text-[14px] font-semibold text-ink">{v}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-slate2">{d}</p>
    </div>
  );
}

function FindingCard({ severity, title, desc }: { severity: "CRÍTICO" | "ALTO" | "MEDIO"; title: string; desc: string }) {
  const styles: Record<string, string> = {
    "CRÍTICO": "bg-brand-red text-white",
    "ALTO": "bg-orange-100 text-orange-700",
    "MEDIO": "bg-amber-100 text-amber-700",
  };
  return (
    <div className="rounded-[24px] border border-hair bg-white p-5 shadow-soft">
      <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[11px] font-bold ${styles[severity]}`}>{severity}</span>
      <h3 className="mt-3 text-[16px] font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-slate2">{desc}</p>
    </div>
  );
}

function TechPill({ label, note }: { label: string; note: string }) {
  return (
    <div className="rounded-card border border-hair bg-white px-4 py-3.5 shadow-soft">
      <p className="text-[15px] font-bold text-navy">{label}</p>
      <p className="mt-0.5 text-[12px] text-slate2">{note}</p>
    </div>
  );
}

function PrincipleCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-[24px] border border-hair bg-white p-6 shadow-soft">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-navy/10 text-navy"><Check width={18} height={18} /></span>
      <p className="mt-4 text-[16px] font-bold text-ink">{title}</p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-slate2">{desc}</p>
    </div>
  );
}

function JourneyStep({ n, title, desc, last }: { n: number; title: string; desc: string; last?: boolean }) {
  return (
    <li className="relative rounded-[24px] border border-hair bg-white p-5 shadow-soft">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-red text-[14px] font-bold tnums text-white">{n}</span>
      <p className="mt-3 text-[16px] font-bold text-ink">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">{desc}</p>
      {!last && <ArrowRight width={16} height={16} className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-hair lg:block" />}
    </li>
  );
}

function FlowStep({ n, text, last }: { n: number; text: string; last?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15 text-[12px] font-bold tnums text-white">{n}</span>
      <span className={last ? "" : "border-b border-white/10 pb-4"}>{text}</span>
    </li>
  );
}

function FeatureRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4 rounded-[24px] border border-hair bg-white p-5 shadow-soft">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red">
        {icon === "check" ? <Check width={18} height={18} /> : <IconByName name={icon} width={18} height={18} />}
      </span>
      <div>
        <p className="text-[15px] font-bold text-ink">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-slate2">{desc}</p>
      </div>
    </div>
  );
}

function CompareRow({ before, after }: { before: string; after: string }) {
  return (
    <tr className="border-b border-hair last:border-0">
      <td className="px-5 py-4 align-top text-slate2">
        <span className="mr-2 inline-block h-2 w-2 shrink-0 rounded-full bg-brand-red" />
        {before}
      </td>
      <td className="px-5 py-4 align-top text-ink">
        <span className="mr-2 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        {after}
      </td>
    </tr>
  );
}

function RoadmapItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-card border border-hair bg-white p-5 shadow-soft">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">{desc}</p>
    </div>
  );
}
