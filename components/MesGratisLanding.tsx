"use client";

import { useState } from "react";
import { BRAND_NAME, WHATSAPP_URL, PARTNERS } from "@/lib/brand";
import { CompanyLogo } from "./Comparativa";
import { Modal } from "./Modal";
import { Check, IconByName, WhatsApp } from "./icons";
import { useSiteTheme } from "@/lib/useTheme";

// UTM fijo de esta landing: todo lead que tarifique desde aquí queda
// marcado de forma única para poder filtrarlo/exportarlo en /admin (el
// buscador de leads ya incluye utm_campaign, y la exportación CSV también).
const CTA_HREF = "/tarificador?utm_source=campana&utm_medium=landing&utm_campaign=mes-gratis-salud";

const STEPS = [
  { n: "1", t: "Calcula tu precio", d: "Un minuto, sin compromiso. Comparamos entre las mejores compañías para ti." },
  { n: "2", t: "Contrata tu seguro de salud", d: "Un asesor te confirma tu propuesta final y formalizas tu póliza nueva." },
  { n: "3", t: "Te regalamos 1 mes", d: "Se aplica sobre tu primera mensualidad, sin letra pequeña ni pasos extra." },
];

const BENEFITS = [
  { icon: "shield", t: "Sin trucos", d: "El mes de regalo se aplica igual, lo compares con quien lo compares." },
  { icon: "compare", t: "Comparamos por ti", d: "Entre las principales aseguradoras del país, no una sola marca." },
  { icon: "doc", t: "Sin letra pequeña", d: "Condiciones completas siempre visibles, un clic más abajo." },
];

const FAQ = [
  { q: "¿Cómo se aplica el mes gratis?", a: "Se descuenta el importe de una mensualidad de tu nueva póliza de salud, gestionado directamente por tu asesor de " + BRAND_NAME + " al formalizar la contratación." },
  { q: "¿Vale para cualquier compañía?", a: "Aplica a las aseguradoras de salud con las que trabajamos en el momento de tu contratación. Tu asesor te lo confirma antes de firmar nada." },
  { q: "¿Tiene coste comparar?", a: "No. Comparar y que te asesoremos es gratis y sin compromiso, tengas o no promoción." },
  { q: "¿Puedo combinarla con otra oferta?", a: "No es acumulable con otras promociones vigentes. Se aplica la que más te convenga." },
];

export function MesGratisLanding() {
  const [termsOpen, setTermsOpen] = useState(false);
  const theme = useSiteTheme();

  return (
    <main id="contenido" className="overflow-x-hidden bg-ink">
      {/* CABECERA — sin salida, sin navegación */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <p className="font-display text-[16px] font-extrabold text-white" translate="no">{BRAND_NAME}</p>
          <span className="rounded-pill bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white">
            Oferta por tiempo limitado
          </span>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-navy via-navy-deep to-brand-red-deep" />
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-red/30 blur-3xl motion-safe:animate-pulse" />
        <div aria-hidden="true" className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-6 text-center md:pb-24 md:pt-10">
          <span className="motion-safe:animate-fade-up inline-flex items-center gap-2 rounded-pill bg-brand-red px-4 py-2 text-[13px] font-extrabold uppercase tracking-wide text-white shadow-card">
            <IconByName name="shield" width={16} height={16} />
            Seguro de salud
          </span>

          <h1 className="motion-safe:animate-fade-up mt-6 text-[42px] font-extrabold leading-[1.02] tracking-tight text-white sm:text-[56px] md:text-[68px]">
            Contrata ahora
            <br />
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">y te regalamos</span>
            <br />
            <span className="text-brand-red drop-shadow-[0_2px_24px_rgba(200,49,42,0.6)]">1 mes gratis</span>
          </h1>

          <p className="motion-safe:animate-fade-up mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-white/80">
            Calcula tu precio en un minuto, elige tu compañía y formaliza tu seguro de salud nuevo. Nosotros
            nos encargamos de aplicarte el mes de regalo sin que muevas un papel.
          </p>

          <div className="motion-safe:animate-fade-up mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href={CTA_HREF}
              className="flex w-full items-center justify-center rounded-card bg-white px-8 py-4 text-[17px] font-extrabold text-navy shadow-card transition-transform hover:scale-[1.02] sm:w-auto">
              Quiero mi mes gratis →
            </a>
            <button type="button" onClick={() => setTermsOpen(true)}
              className="text-[13px] font-semibold text-white/70 underline underline-offset-2 hover:text-white">
              Ver condiciones completas
            </button>
          </div>

          <p className="mt-5 text-[12px] text-white/50">Sin coste por comparar · Sin compromiso · Sin letra pequeña</p>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="relative bg-mist py-14 md:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {BENEFITS.map((b, i) => (
              <div key={b.t} style={{ animationDelay: `${i * 80}ms` }}
                className="motion-safe:animate-fade-up rounded-[20px] border border-hair bg-white p-6 shadow-soft">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                  <IconByName name={b.icon} width={24} height={24} />
                </span>
                <p className="mt-4 text-[17px] font-bold text-ink">{b.t}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-slate2">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center text-[26px] font-extrabold text-navy md:text-[32px]">Así de fácil</h2>
          <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative flex-1 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-navy text-[20px] font-extrabold text-white shadow-card">
                  {s.n}
                </div>
                <p className="mt-4 text-[16px] font-bold text-ink">{s.t}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate2">{s.d}</p>
                {i < STEPS.length - 1 && (
                  <span aria-hidden="true" className="absolute right-[-12%] top-7 hidden h-px w-1/4 bg-hair sm:block" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a href={CTA_HREF}
              className="inline-flex items-center justify-center rounded-card bg-brand-red px-8 py-4 text-[16px] font-bold text-white shadow-card transition-colors hover:bg-brand-red-deep">
              Empezar ahora →
            </a>
          </div>
        </div>
      </section>

      {/* CONFIANZA */}
      <section className="bg-mist py-12">
        <div className="mx-auto max-w-5xl px-5 text-center">
          <p className="text-[12px] font-bold uppercase tracking-wide text-slate2">Comparamos entre las mejores aseguradoras</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3" translate="no">
            {PARTNERS.map((name) => (
              <span key={name} className="flex items-center gap-2 rounded-pill border border-hair bg-white px-4 py-2 text-[13px] font-semibold text-navy">
                <CompanyLogo logoUrl={theme.partnerLogos[name]} compania={name} />
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-navy py-14 md:py-20">
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="text-center text-[24px] font-extrabold text-white md:text-[28px]">Preguntas rápidas</h2>
          <div className="mt-8 flex flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-[16px] border border-white/15 bg-white/5 px-5 py-4 open:bg-white/10">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-white marker:content-none">
                  {f.q}
                  <span aria-hidden="true" className="shrink-0 text-white/70 transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-white/70">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center gap-3">
            <a href={CTA_HREF}
              className="flex w-full items-center justify-center rounded-card bg-white px-8 py-4 text-[16px] font-extrabold text-navy shadow-card sm:w-auto">
              Quiero mi mes gratis →
            </a>
            <button type="button" onClick={() => setTermsOpen(true)} className="text-[12px] font-semibold text-white/60 underline">
              Condiciones completas de la promoción
            </button>
          </div>
        </div>
      </section>

      {/* Barra fija móvil */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-white/10 bg-ink/95 px-4 py-3 backdrop-blur lg:hidden">
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-card border border-white/15 text-[#25D366]">
          <WhatsApp width={20} height={20} />
        </a>
        <a href={CTA_HREF} className="flex-1 rounded-card bg-brand-red px-4 py-3 text-center text-[14px] font-bold text-white">
          Quiero mi mes gratis
        </a>
      </div>
      <div className="h-16 lg:hidden" aria-hidden="true" />

      <Modal open={termsOpen} onClose={() => setTermsOpen(false)} title="Condiciones de la promoción">
        <TermsContent />
      </Modal>
    </main>
  );
}

function TermsContent() {
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-[12px] font-medium text-amber-800">
        ⚠️ Texto DEMO: fechas de vigencia, compañías participantes y mecánica exacta de aplicación del
        descuento pendientes de validación con dirección/legal antes de publicar esta campaña.
      </p>

      <div>
        <h3 className="text-[13px] font-bold text-ink">1. Objeto de la promoción</h3>
        <p className="mt-1">
          &ldquo;1 mes gratis en tu seguro de salud&rdquo; (la &ldquo;Promoción&rdquo;) es una campaña de {BRAND_NAME},
          correduría de seguros, por la que los nuevos clientes que formalicen una póliza de seguro de salud a
          través de nuestra intermediación durante el periodo de vigencia disfrutan de la bonificación de una
          mensualidad de su póliza.
        </p>
      </div>

      <div>
        <h3 className="text-[13px] font-bold text-ink">2. Periodo de vigencia</h3>
        <p className="mt-1">Del [fecha de inicio] al [fecha de fin] (DEMO — pendiente de fijar fecha real).</p>
      </div>

      <div>
        <h3 className="text-[13px] font-bold text-ink">3. Requisitos de participación</h3>
        <ul className="mt-1 flex flex-col gap-1.5">
          <li>Ser mayor de edad y residente en España.</li>
          <li>Formalizar una póliza de seguro de salud <b>nueva</b> a través de {BRAND_NAME} durante el periodo de vigencia.</li>
          <li>No es válida para renovaciones, traspasos de póliza ya existente ni pólizas en trámite antes del inicio de la Promoción.</li>
          <li>Superar el cuestionario de salud y demás condiciones de contratación de la aseguradora elegida.</li>
        </ul>
      </div>

      <div>
        <h3 className="text-[13px] font-bold text-ink">4. Compañías participantes</h3>
        <p className="mt-1">
          Las aseguradoras de salud incluidas en el catálogo vigente de {BRAND_NAME} en el momento de la
          contratación. No todas las compañías tienen por qué participar en todo momento; tu asesor te lo
          confirma antes de firmar nada.
        </p>
      </div>

      <div>
        <h3 className="text-[13px] font-bold text-ink">5. Aplicación del beneficio</h3>
        <p className="mt-1">
          El importe equivalente a una mensualidad de la póliza contratada se bonifica o descuenta conforme al
          procedimiento que {BRAND_NAME} confirme junto con la aseguradora elegida, dentro de los primeros
          recibos de la póliza. No es canjeable por dinero en metálico ni por otro producto o servicio.
        </p>
      </div>

      <div>
        <h3 className="text-[13px] font-bold text-ink">6. Exclusiones</h3>
        <ul className="mt-1 flex flex-col gap-1.5">
          <li>No acumulable con otras promociones u ofertas vigentes de {BRAND_NAME}.</li>
          <li>{BRAND_NAME} se reserva el derecho a modificar o cancelar la Promoción en cualquier momento, respetando los derechos ya adquiridos por quienes hubieran contratado conforme a estas condiciones.</li>
        </ul>
      </div>

      <div>
        <h3 className="text-[13px] font-bold text-ink">7. Protección de datos</h3>
        <p className="mt-1">
          Los datos facilitados se tratan conforme a nuestra política de privacidad, únicamente para gestionar tu
          comparativa, tu contratación y, si procede, la aplicación de esta Promoción.
        </p>
      </div>

      <div>
        <h3 className="text-[13px] font-bold text-ink">8. Aceptación</h3>
        <p className="mt-1">
          La participación en la Promoción implica la aceptación íntegra de estas condiciones y de las
          condiciones generales de contratación de la aseguradora elegida.
        </p>
      </div>

      <a href="/legal" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-navy underline">
        <Check width={14} height={14} /> Ver información legal completa
      </a>
    </div>
  );
}
