"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header, Wordmark } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Modal } from "@/components/Modal";
import { RescheduleCallModal } from "@/components/RescheduleCallModal";
import { NotificationBell } from "@/components/NotificationBell";
import { PushOptIn } from "@/components/PushOptIn";
import { LlamadaClientModal, type LlamadaView } from "@/components/LlamadaClientModal";
import { Check, ChevronLeft, ChevronRight, IconByName, Spinner } from "@/components/icons";
import { BRAND_NAME, DIAS_LLAMADA, TURNOS_LLAMADA } from "@/lib/brand";
import { useSiteTheme } from "@/lib/useTheme";
import { saveQuote, quoteNumber, ageFromDob, buildWhatsAppText, whatsAppUrl, type QuoteProfile } from "@/lib/quote";

type Profile = { nombre?: string; telefono?: string; email?: string; diaLlamada?: string; turnoLlamada?: string };

const LLAMADA_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente de contactar",
  programada: "Programada",
  hecha: "Completada",
  cancelada: "Cancelada",
};
const LLAMADA_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  programada: "bg-navy/10 text-navy",
  hecha: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-slate-200 text-slate-600",
};

function cuandoLlamada(l: LlamadaView): string {
  if (l.fechaProgramada) {
    const d = new Date(`${l.fechaProgramada}T${l.horaProgramada || "00:00"}:00`);
    const txt = Number.isNaN(d.getTime())
      ? l.fechaProgramada
      : d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
    return l.horaProgramada ? `${txt} a las ${l.horaProgramada}` : txt;
  }
  const partes = [l.diaLlamada, l.turnoLlamada].filter((v) => v && v !== DIAS_LLAMADA[0] && v !== TURNOS_LLAMADA[0]);
  return partes.length ? partes.join(" · ") : "Sin concretar todavía";
}

function formatDate(iso: string) {
  try { return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)); }
  catch { return iso; }
}

const TARIFICADORES = [
  { href: "/tarificador", icon: "flower", label: "Seguro de salud", desc: "Compara precio en 2 minutos." },
  { href: "/tarificador-vida", icon: "life", label: "Seguro de vida", desc: "Protege a los tuyos, a tu medida." },
  { href: "/tarificador-auto", icon: "car", label: "Seguro de auto", desc: "Coche o moto, con tu matrícula." },
];

// Mismo contenido (aún placeholder, pendiente de redacción legal) que
// app/legal/page.tsx — aquí en modal para no hacer salir de la pantalla de
// acceso, que no tiene cabecera ni pie de página con enlaces de navegación.
type LegalKey = "privacidad" | "condiciones" | "aviso";
const LEGAL_CONTENT: Record<LegalKey, { title: string; body: string }> = {
  privacidad: {
    title: "Política de privacidad",
    body: "[Responsable del tratamiento, finalidad, base jurídica (consentimiento), destinatarios, plazo de conservación, derechos del interesado y forma de ejercerlos. Pendiente de redacción.]",
  },
  condiciones: {
    title: "Condiciones de uso",
    body: "[Condiciones del servicio de comparación y del formulario de solicitud de contacto. Pendiente de redacción.]",
  },
  aviso: {
    title: "Aviso legal",
    body: `[Datos identificativos de ${BRAND_NAME} como correduría de seguros. Pendiente de redacción.]`,
  },
};

// Tus tarificaciones se guardan en nuestra base de datos, no en el
// navegador: el acceso va por sesión (cookie tras identificarte con un
// solo dato — correo, teléfono o nº de presupuesto —, o automático justo
// después de tarificar en este mismo dispositivo), y los datos siempre se
// piden en vivo al servidor — así funciona desde cualquier dispositivo,
// como en la web de una aseguradora real.
type Vista = "comprobando" | "acceso" | "area";

export function AreaClienteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useSiteTheme();
  const [vista, setVista] = useState<Vista>("comprobando");
  const [profile, setProfile] = useState<Profile>({});
  const [quotes, setQuotes] = useState<QuoteProfile[]>([]);
  const [llamadas, setLlamadas] = useState<LlamadaView[]>([]);
  const [selectedLlamada, setSelectedLlamada] = useState<LlamadaView | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [rescheduleQuote, setRescheduleQuote] = useState<QuoteProfile | null>(null);
  const [legalModal, setLegalModal] = useState<LegalKey | null>(null);
  const [showRecoverBox, setShowRecoverBox] = useState(false);

  const PRESUPUESTOS_POR_PAGINA = 3;
  const [page, setPage] = useState(1);

  // Formulario de acceso: un único dato (correo, teléfono o nº de
  // presupuesto) usado al tarificar. Es el mismo formulario tanto para la
  // pantalla de entrada inicial como para añadir presupuestos de otro
  // dispositivo una vez ya dentro del área.
  const [loginValue, setLoginValue] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSent, setLoginSent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/client/session");
        const body = await res.json();
        if (body.ok) {
          setProfile(body.profile ?? {});
          setQuotes(body.presupuestos ?? []);
          setLlamadas(body.llamadas ?? []);
          setVista("area");
          return;
        }
      } catch { /* sin sesión válida: pasa a la pantalla de acceso */ }
      // Vuelta del enlace de verificación por email (ver lib/clientVerification.ts):
      // si el token no era válido o ya había caducado, se avisa aquí en vez de
      // dejar al cliente sin explicación en la pantalla de acceso.
      if (searchParams.get("error") === "token-invalido") {
        setLoginError("Ese enlace ya no es válido o ha caducado. Pide uno nuevo con tu correo o teléfono.");
      }
      setVista("acceso");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await fetch("/api/client/update-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookupPhone: profile.telefono, lookupEmail: profile.email, patch: profile }),
      });
    } catch { /* red: el usuario puede reintentar */ }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function continueQuote(q: QuoteProfile) {
    saveQuote(q);
    router.push(`/comparativa?producto=${q.producto}`);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await fetch("/api/client/logout", { method: "POST" }); } catch { /* noop */ }
    setProfile({});
    setQuotes([]);
    setLlamadas([]);
    setPage(1);
    setLoggingOut(false);
    setVista("acceso");
  }

  const totalPages = Math.max(1, Math.ceil(quotes.length / PRESUPUESTOS_POR_PAGINA));
  const currentPage = Math.min(page, totalPages);
  const pageQuotes = quotes.slice((currentPage - 1) * PRESUPUESTOS_POR_PAGINA, currentPage * PRESUPUESTOS_POR_PAGINA);

  // Por seguridad, este endpoint ya no concede acceso al instante ni
  // devuelve los presupuestos en la respuesta (un teléfono, un correo o un
  // número de presupuesto no son un secreto: cualquiera que los conociera
  // podría, si no, "entrar" como esa persona). Ahora manda un enlace de un
  // solo uso al email ya guardado en la ficha; al hacer clic, ese enlace
  // (app/api/client/verify) concede la sesión y trae de vuelta aquí.
  async function handleLogin() {
    if (!loginValue.trim()) {
      setLoginError("Introduce tu correo, tu teléfono o tu número de presupuesto.");
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/client/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginValue }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setLoginError(body.error ?? "No se ha podido verificar. Inténtalo de nuevo.");
        setLoginLoading(false);
        return;
      }
      setLoginSent(true);
      setLoginValue("");
      setLoginLoading(false);
      return;
    } catch {
      setLoginError("Error de conexión. Inténtalo de nuevo.");
    }
    setLoginLoading(false);
  }

  if (vista === "comprobando") return null;

  const loginField = (
    <>
      <label className="mt-5 block">
        <span className="sr-only">Correo, teléfono o número de presupuesto</span>
        <input
          value={loginValue} onChange={(e) => setLoginValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="Correo, teléfono o nº de presupuesto"
          className="w-full rounded-card border border-hair bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-slate2/60"
        />
      </label>
      {loginError && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{loginError}</p>}
    </>
  );

  // Tras pedir el enlace de verificación (ver handleLogin): ya no hay nada
  // que mostrar al instante, solo pedir que abran el correo.
  const loginSentBox = (
    <div className="mt-5 rounded-card border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-[14px] font-semibold text-emerald-800">Revisa tu correo</p>
      <p className="mt-1 text-[13px] leading-relaxed text-emerald-700">
        Te hemos enviado un enlace para confirmar que eres tú. Ábrelo desde este mismo dispositivo para entrar a tu área de cliente.
      </p>
      <button type="button" onClick={() => setLoginSent(false)} className="mt-2 text-[12px] font-semibold text-emerald-800 underline">
        Usar otro dato
      </button>
    </div>
  );

  // Sin sesión válida: pantalla de acceso a pantalla completa, sin cabecera
  // ni pie con enlaces de salida — como el login de un área de clientes real.
  if (vista === "acceso") {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col md:flex-row">
          <div className="flex flex-1 flex-col justify-center bg-white px-6 py-10 sm:px-10 md:px-16 lg:px-20">
            <a href="/" aria-label={`${BRAND_NAME} · Inicio`} className="inline-block w-fit">
              <Wordmark logoUrl={theme.logoUrl} />
            </a>
            <div className="mt-8 w-full max-w-sm sm:mt-12">
              <h1 className="text-[26px] font-extrabold leading-tight text-navy">Hola, entra en tu área de cliente</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                Con tu correo, tu teléfono o tu número de presupuesto (te lo enviamos por WhatsApp o aparece en tu PDF), te
                mandamos un enlace de acceso a tu correo para confirmar que eres tú.
              </p>
              {loginSent ? loginSentBox : (
                <>
                  {loginField}
                  <button
                    type="button" onClick={handleLogin} disabled={loginLoading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40"
                  >
                    {loginLoading && <Spinner />}
                    {loginLoading ? "Enviando enlace…" : "Enviarme un enlace de acceso"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center bg-mist px-6 py-10 sm:px-10 md:px-16 lg:px-20">
            <div className="w-full max-w-sm">
              <h2 className="text-[22px] font-extrabold leading-tight text-navy">¿Aún no has tarificado?</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                Calcula tu precio en menos de 2 minutos, sin compromiso, y tu presupuesto se guardará aquí automáticamente.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {TARIFICADORES.map((t) => (
                  <a key={t.href} href={t.href}
                    className="flex items-center gap-3 rounded-card border border-hair bg-white p-4 shadow-soft transition-colors hover:bg-white/80">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                      <IconByName name={t.icon} width={20} height={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold text-ink">{t.label}</span>
                      <span className="block text-[12px] text-slate2">{t.desc}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="safe-bottom border-t border-hair bg-white px-6 py-4 sm:px-10 md:px-16 lg:px-20">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-[12px] text-slate2">© {new Date().getFullYear()} {BRAND_NAME} · Todos los derechos reservados</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {(Object.keys(LEGAL_CONTENT) as LegalKey[]).map((key) => (
                <button key={key} type="button" onClick={() => setLegalModal(key)}
                  className="text-[12px] font-medium text-slate2 underline transition-colors hover:text-navy">
                  {LEGAL_CONTENT[key].title}
                </button>
              ))}
            </div>
          </div>
        </footer>

        {legalModal && (
          <Modal open onClose={() => setLegalModal(null)} title={LEGAL_CONTENT[legalModal].title}>
            <p>{LEGAL_CONTENT[legalModal].body}</p>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <>
      <Header />
      <main id="contenido" className="mx-auto max-w-app px-5 py-10 md:max-w-3xl md:py-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight text-navy">Mi área de cliente</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate2">
              Tus presupuestos se guardan de forma segura con nosotros: accede desde cualquier dispositivo,
              cambia tus datos de contacto o reprograma tu llamada cuando quieras.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <button type="button" onClick={handleLogout} disabled={loggingOut}
              className="rounded-card border border-hair bg-white px-3.5 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-mist disabled:opacity-50">
              {loggingOut ? "Saliendo…" : "Cerrar sesión"}
            </button>
          </div>
        </div>

        <PushOptIn />

        {/* Añadir presupuestos de otro dispositivo (compacto, plegado) */}
        <section aria-labelledby="acceso" className="mt-8 rounded-[24px] border border-hair bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 id="acceso" className="text-[15px] font-bold text-navy">¿Tarificaste también desde otro dispositivo?</h2>
            <button type="button" onClick={() => setShowRecoverBox((v) => !v)} className="shrink-0 text-[13px] font-semibold text-brand-red underline">
              {showRecoverBox ? "Ocultar" : "Añadir presupuestos"}
            </button>
          </div>
          {showRecoverBox && (
            loginSent ? loginSentBox : (
              <>
                <p className="mt-2 text-[13px] leading-relaxed text-slate2">
                  Introduce el correo, el teléfono o el número de ese otro tarificador y te mandamos un enlace a ese correo
                  para confirmarlo.
                </p>
                {loginField}
                <button
                  type="button" onClick={handleLogin} disabled={loginLoading}
                  className="mt-4 flex items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40"
                >
                  {loginLoading && <Spinner />}
                  {loginLoading ? "Enviando enlace…" : "Enviarme un enlace"}
                </button>
              </>
            )
          )}
        </section>

        {/* Datos de contacto */}
        <section aria-labelledby="datos" className="mt-8 rounded-[24px] border border-hair bg-white p-6 shadow-card">
          <h2 id="datos" className="text-[18px] font-bold text-navy">Tus datos de contacto</h2>
          <div className="mt-4 flex flex-col gap-4">
            <label>
              <span className="mb-1 block text-[13px] font-semibold text-ink">Nombre</span>
              <input
                value={profile.nombre ?? ""} onChange={(e) => setProfile((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="María…"
                className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60"
              />
            </label>
            <label>
              <span className="mb-1 block text-[13px] font-semibold text-ink">Teléfono móvil</span>
              <input
                inputMode="tel" value={profile.telefono ?? ""} onChange={(e) => setProfile((p) => ({ ...p, telefono: e.target.value }))}
                placeholder="600 000 000…"
                className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[15px] tnums text-ink placeholder:text-slate2/60"
              />
            </label>
            <label>
              <span className="mb-1 block text-[13px] font-semibold text-ink">Correo electrónico</span>
              <input
                inputMode="email" value={profile.email ?? ""} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                placeholder="maria@correo.com…"
                className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60"
              />
            </label>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink">¿Cuándo prefieres que te llamemos?</p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mejor día para llamar">
                {DIAS_LLAMADA.map((d) => (
                  <button key={d} type="button" aria-pressed={(profile.diaLlamada ?? DIAS_LLAMADA[0]) === d}
                    onClick={() => setProfile((p) => ({ ...p, diaLlamada: d }))}
                    className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors ${(profile.diaLlamada ?? DIAS_LLAMADA[0]) === d ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Turno para llamar">
                {TURNOS_LLAMADA.map((t) => (
                  <button key={t} type="button" aria-pressed={(profile.turnoLlamada ?? TURNOS_LLAMADA[0]) === t}
                    onClick={() => setProfile((p) => ({ ...p, turnoLlamada: t }))}
                    className={`rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors ${(profile.turnoLlamada ?? TURNOS_LLAMADA[0]) === t ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:bg-mist"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button" onClick={handleSaveProfile} disabled={saving}
              className="flex items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40"
            >
              {saving && <Spinner />}
              {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
            </button>
            <p className="text-[12px] leading-relaxed text-slate2">
              Estos cambios se actualizan también en tu ficha con tu asesor de {BRAND_NAME}, al momento.
            </p>
          </div>
        </section>

        {/* Presupuestos */}
        <section aria-labelledby="presupuestos" className="mt-8">
          <h2 id="presupuestos" className="text-[18px] font-bold text-navy">Tus presupuestos</h2>

          {quotes.length === 0 ? (
            <div className="mt-4 rounded-[24px] border border-dashed border-hair bg-white p-6 text-center shadow-soft">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                <IconByName name="doc" width={22} height={22} />
              </span>
              <p className="mt-3 text-[14px] leading-relaxed text-slate2">
                Todavía no tienes presupuestos. Calcula tu precio y aparecerá aquí.
              </p>
              <a href="/tarificador" className="mt-4 inline-flex items-center justify-center rounded-card bg-brand-red px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
                Calcula tu precio
              </a>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {pageQuotes.map((q) => {
                const age = ageFromDob(q.fechaNacimiento);
                const waText = buildWhatsAppText({ producto: q.producto, quote: q, origen: "área de cliente" });
                return (
                  <li key={q.id} className="rounded-[20px] border border-hair bg-white p-5 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center rounded-pill bg-brand-red/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-red">
                          {q.producto === "vida" ? "Seguro de vida" : q.producto === "auto" ? "Seguro de auto" : "Seguro de salud"}
                        </span>
                        <p className="mt-1.5 text-[13px] font-semibold tnums text-slate2">Presupuesto nº {quoteNumber(q.id)}</p>
                        <p className="text-[12px] text-slate2">{formatDate(q.createdAt)}</p>
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                      {q.codigoPostal && <><dt className="text-slate2">Código postal</dt><dd className="text-right font-semibold tnums text-ink">{q.codigoPostal}</dd></>}
                      {age !== null && <><dt className="text-slate2">Edad</dt><dd className="text-right font-semibold tnums text-ink">{age} años</dd></>}
                      {q.numAsegurados != null && <><dt className="text-slate2">Asegurados</dt><dd className="text-right font-semibold tnums text-ink">{q.numAsegurados}</dd></>}
                      {q.fumador != null && <><dt className="text-slate2">Fumador</dt><dd className="text-right font-semibold text-ink">{q.fumador ? "Sí" : "No"}</dd></>}
                      {q.tipoVehiculo && <><dt className="text-slate2">Vehículo</dt><dd className="text-right font-semibold text-ink">{q.tipoVehiculo === "moto" ? "Moto" : "Coche"}</dd></>}
                      {q.matricula && <><dt className="text-slate2">Matrícula</dt><dd className="text-right font-semibold tnums text-ink">{q.matricula}</dd></>}
                    </dl>

                    {(q.diaLlamada || q.turnoLlamada) && (
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-pill border border-hair bg-mist px-3 py-1.5 text-[12px] font-semibold text-ink">
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        Llamada programada{q.diaLlamada && q.diaLlamada !== DIAS_LLAMADA[0] ? ` el ${q.diaLlamada}` : ""}
                        {q.turnoLlamada && q.turnoLlamada !== TURNOS_LLAMADA[0] ? ` en el turno de ${q.turnoLlamada.toLowerCase()}` : ""}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => continueQuote(q)}
                        className="rounded-card bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-red-deep">
                        Ver comparativa
                      </button>
                      <button type="button" onClick={() => setRescheduleQuote(q)}
                        className="rounded-card border border-hair px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:bg-mist">
                        {q.diaLlamada || q.turnoLlamada ? "Reprogramar llamada" : "Solicitar llamada"}
                      </button>
                      <a href={whatsAppUrl(waText)} target="_blank" rel="noopener noreferrer"
                        className="rounded-card border border-hair px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:bg-mist">
                        WhatsApp
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}
                className="flex items-center gap-1 rounded-card border border-hair bg-white px-3.5 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft width={16} height={16} /> Anterior
              </button>
              <p className="text-[13px] font-medium tnums text-slate2">Página {currentPage} de {totalPages}</p>
              <button
                type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                className="flex items-center gap-1 rounded-card border border-hair bg-white px-3.5 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente <ChevronRight width={16} height={16} />
              </button>
            </div>
          )}
        </section>

        {/* Llamadas */}
        {llamadas.length > 0 && (
          <section aria-labelledby="llamadas" className="mt-8">
            <h2 id="llamadas" className="text-[18px] font-bold text-navy">Tus llamadas</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {llamadas.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedLlamada(l)}
                    className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-hair bg-white p-5 text-left shadow-soft transition-colors hover:bg-mist"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold capitalize text-ink">
                        {l.producto ? `Seguro de ${l.producto}` : "Consulta general"}
                      </p>
                      <p className="mt-0.5 text-[13px] text-slate2">{cuandoLlamada(l)}</p>
                      {l.presupuestoId && (
                        <p className="mt-0.5 text-[12px] tnums text-slate2/80">Presupuesto nº {quoteNumber(l.presupuestoId)}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold ${LLAMADA_STATUS_COLORS[l.status] ?? "bg-slate-200"}`}>
                      {LLAMADA_STATUS_LABELS[l.status] ?? l.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {rescheduleQuote && (
          <RescheduleCallModal
            quote={rescheduleQuote}
            onClose={() => setRescheduleQuote(null)}
            onUpdated={(updated) => {
              setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
            }}
          />
        )}

        {selectedLlamada && (
          <LlamadaClientModal
            llamada={selectedLlamada}
            onClose={() => setSelectedLlamada(null)}
            onUpdated={(updated) => {
              setLlamadas((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              setSelectedLlamada(null);
            }}
          />
        )}

        <ul className="mt-8 flex flex-col gap-2">
          {["Tus datos y presupuestos se guardan de forma segura en nuestros sistemas, no solo en este navegador.", "Accede desde cualquier dispositivo con tu correo, tu teléfono o tu número de presupuesto."].map((c) => (
            <li key={c} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy/10 text-navy"><Check width={13} height={13} /></span>
              <span className="text-[13px] leading-relaxed text-slate2">{c}</span>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
