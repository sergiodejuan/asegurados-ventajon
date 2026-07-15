"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RescheduleCallModal } from "@/components/RescheduleCallModal";
import { Check, ChevronLeft, ChevronRight, IconByName, Spinner } from "@/components/icons";
import { BRAND_NAME, DIAS_LLAMADA, TURNOS_LLAMADA } from "@/lib/brand";
import { saveQuote, quoteNumber, ageFromDob, buildWhatsAppText, whatsAppUrl, type QuoteProfile } from "@/lib/quote";

type Profile = { nombre?: string; telefono?: string; email?: string; diaLlamada?: string; turnoLlamada?: string };

function formatDate(iso: string) {
  try { return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)); }
  catch { return iso; }
}

// Tus tarificaciones se guardan en nuestra base de datos, no en el
// navegador: el acceso va por sesión (cookie tras identificarte con tu nº
// de presupuesto + correo + teléfono, o automático justo después de
// tarificar en este mismo dispositivo), y los datos siempre se piden en
// vivo al servidor — así funciona desde cualquier dispositivo, como en la
// web de una aseguradora real.
type Vista = "comprobando" | "acceso" | "transicion" | "area";

export function AreaClienteContent() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("comprobando");
  const [greeting, setGreeting] = useState("");
  const [profile, setProfile] = useState<Profile>({});
  const [quotes, setQuotes] = useState<QuoteProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [rescheduleQuote, setRescheduleQuote] = useState<QuoteProfile | null>(null);
  const [showRecoverBox, setShowRecoverBox] = useState(false);

  const PRESUPUESTOS_POR_PAGINA = 3;
  const [page, setPage] = useState(1);

  // Formulario de acceso: nº de presupuesto + correo + teléfono usados al
  // tarificar. Es el mismo formulario tanto para la pantalla de entrada
  // inicial como para añadir presupuestos de otro dispositivo una vez ya
  // dentro del área.
  const [loginCodigo, setLoginCodigo] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginTelefono, setLoginTelefono] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/client/session");
        const body = await res.json();
        if (body.ok) {
          setProfile(body.profile ?? {});
          setQuotes(body.presupuestos ?? []);
          setVista("area");
          return;
        }
      } catch { /* sin sesión válida: pasa a la pantalla de acceso */ }
      setVista("acceso");
    })();
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
    setPage(1);
    setLoggingOut(false);
    setVista("acceso");
  }

  const totalPages = Math.max(1, Math.ceil(quotes.length / PRESUPUESTOS_POR_PAGINA));
  const currentPage = Math.min(page, totalPages);
  const pageQuotes = quotes.slice((currentPage - 1) * PRESUPUESTOS_POR_PAGINA, currentPage * PRESUPUESTOS_POR_PAGINA);

  async function handleLogin() {
    if (!loginCodigo.trim() || !loginEmail.trim() || !loginTelefono.trim()) {
      setLoginError("Rellena el número de presupuesto, el correo y el teléfono.");
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/client/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: loginCodigo, email: loginEmail, telefono: loginTelefono }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setLoginError(body.error ?? "No se ha podido verificar. Inténtalo de nuevo.");
        setLoginLoading(false);
        return;
      }
      const found = body.presupuestos as QuoteProfile[];
      const first = found[0];
      setProfile((p) => ({ ...p, nombre: first?.nombre, telefono: first?.telefono, email: first?.email }));
      setQuotes(found);
      setPage(1);
      setShowRecoverBox(false);
      setLoginCodigo(""); setLoginEmail(""); setLoginTelefono("");
      setLoginLoading(false);
      setGreeting(first?.nombre?.trim().split(/\s+/)[0] ?? "");
      setVista("transicion");
      setTimeout(() => setVista("area"), 1800);
      return;
    } catch {
      setLoginError("Error de conexión. Inténtalo de nuevo.");
    }
    setLoginLoading(false);
  }

  if (vista === "comprobando") return null;

  // Pantalla de transición tras identificarse: breve y personalizada, antes
  // de revelar el área completa.
  if (vista === "transicion") {
    return (
      <div
        role="status" aria-live="polite"
        className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-br from-navy to-navy-deep px-6 text-center text-white"
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15 motion-safe:animate-pulse">
          <Spinner width={32} height={32} />
        </div>
        <h2 className="mt-6 max-w-sm text-[22px] font-extrabold leading-snug md:text-[26px]">
          Estamos recuperando tus datos y presupuestos{greeting ? `, ${greeting}` : ""}
        </h2>
      </div>
    );
  }

  const loginFields = (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label>
          <span className="mb-1 block text-[13px] font-semibold text-ink">Nº de presupuesto</span>
          <input
            value={loginCodigo} onChange={(e) => setLoginCodigo(e.target.value)}
            placeholder="p.ej. E97AED9D"
            className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[15px] uppercase text-ink placeholder:text-slate2/60 placeholder:normal-case"
          />
        </label>
        <label>
          <span className="mb-1 block text-[13px] font-semibold text-ink">Correo electrónico</span>
          <input
            inputMode="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="maria@correo.com…"
            className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate2/60"
          />
        </label>
        <label>
          <span className="mb-1 block text-[13px] font-semibold text-ink">Teléfono móvil</span>
          <input
            inputMode="tel" value={loginTelefono} onChange={(e) => setLoginTelefono(e.target.value)}
            placeholder="600 000 000…"
            className="w-full rounded-card border border-hair bg-white px-4 py-3 text-[15px] tnums text-ink placeholder:text-slate2/60"
          />
        </label>
      </div>
      {loginError && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{loginError}</p>}
    </>
  );

  // Sin sesión válida: pantalla de acceso a pantalla completa en vez de
  // aterrizar en un área vacía sin sentido.
  if (vista === "acceso") {
    return (
      <>
        <Header />
        <main id="contenido" className="mx-auto flex max-w-app flex-col items-center px-5 py-10 md:py-16">
          <div className="w-full max-w-lg rounded-[24px] border border-hair bg-white p-6 shadow-card md:p-8">
            <h1 className="text-[24px] font-extrabold leading-tight text-navy">Tu área de cliente</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-slate2">
              Introduce el número de presupuesto (te lo enviamos por WhatsApp o aparece en tu PDF), tu correo y tu
              teléfono para traer aquí tus presupuestos.
            </p>
            {loginFields}
            <button
              type="button" onClick={handleLogin} disabled={loginLoading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40"
            >
              {loginLoading && <Spinner />}
              {loginLoading ? "Buscando…" : "Entrar a mi área"}
            </button>
            <p className="mt-4 text-center text-[13px] text-slate2">
              ¿Aún no has tarificado con nosotros?{" "}
              <a href="/tarificador" className="font-semibold text-brand-red underline">Calcula tu precio</a>
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main id="contenido" className="mx-auto max-w-app px-5 py-10 md:max-w-3xl md:py-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight text-navy">Tu área de cliente</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate2">
              Tus presupuestos se guardan de forma segura con nosotros: accede desde cualquier dispositivo,
              cambia tus datos de contacto o reprograma tu llamada cuando quieras.
            </p>
          </div>
          <button type="button" onClick={handleLogout} disabled={loggingOut}
            className="shrink-0 rounded-card border border-hair bg-white px-3.5 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-mist disabled:opacity-50">
            {loggingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>

        {/* Añadir presupuestos de otro dispositivo (compacto, plegado) */}
        <section aria-labelledby="acceso" className="mt-8 rounded-[24px] border border-hair bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 id="acceso" className="text-[15px] font-bold text-navy">¿Tarificaste también desde otro dispositivo?</h2>
            <button type="button" onClick={() => setShowRecoverBox((v) => !v)} className="shrink-0 text-[13px] font-semibold text-brand-red underline">
              {showRecoverBox ? "Ocultar" : "Añadir presupuestos"}
            </button>
          </div>
          {showRecoverBox && (
            <>
              <p className="mt-2 text-[13px] leading-relaxed text-slate2">
                Introduce el número de presupuesto, tu correo y tu teléfono de ese otro tarificador.
              </p>
              {loginFields}
              <button
                type="button" onClick={handleLogin} disabled={loginLoading}
                className="mt-4 flex items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40"
              >
                {loginLoading && <Spinner />}
                {loginLoading ? "Buscando…" : "Añadir a mi área"}
              </button>
            </>
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

        {rescheduleQuote && (
          <RescheduleCallModal
            quote={rescheduleQuote}
            onClose={() => setRescheduleQuote(null)}
            onUpdated={(updated) => {
              setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
            }}
          />
        )}

        <ul className="mt-8 flex flex-col gap-2">
          {["Tus datos y presupuestos se guardan de forma segura en nuestros sistemas, no solo en este navegador.", "Accede desde cualquier dispositivo con tu número de presupuesto, tu correo y tu teléfono."].map((c) => (
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
