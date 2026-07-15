"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RescheduleCallModal } from "@/components/RescheduleCallModal";
import { Check, ChevronLeft, ChevronRight, IconByName, Spinner } from "@/components/icons";
import { BRAND_NAME, DIAS_LLAMADA, TURNOS_LLAMADA } from "@/lib/brand";
import {
  loadClientProfile, saveClientProfile, loadClientQuotes, removeClientQuote, addClientQuote, type ClientProfile,
} from "@/lib/clientArea";
import {
  saveQuote, quoteNumber, ageFromDob, buildWhatsAppText, whatsAppUrl, type QuoteProfile,
} from "@/lib/quote";

function formatDate(iso: string) {
  try { return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)); }
  catch { return iso; }
}

export function AreaClienteContent() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [profile, setProfile] = useState<ClientProfile>({});
  const [quotes, setQuotes] = useState<QuoteProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rescheduleQuote, setRescheduleQuote] = useState<QuoteProfile | null>(null);
  const lookupRef = useRef<{ telefono?: string; email?: string }>({});

  const PRESUPUESTOS_POR_PAGINA = 3;
  const [page, setPage] = useState(1);

  // Recuperar presupuestos desde otro dispositivo: el resto de esta página
  // vive solo en localStorage, así que si el cliente entra desde el móvil
  // después de tarificar en el ordenador, no ve nada hasta que se identifica
  // con su número de presupuesto + correo + teléfono.
  const [loginCodigo, setLoginCodigo] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginTelefono, setLoginTelefono] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginOk, setLoginOk] = useState(false);

  useEffect(() => {
    const p = loadClientProfile() ?? {};
    lookupRef.current = { telefono: p.telefono, email: p.email };
    setProfile(p);
    setQuotes(loadClientQuotes());
    setChecked(true);
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    saveClientProfile(profile);
    try {
      await fetch("/api/client/update-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookupPhone: lookupRef.current.telefono, lookupEmail: lookupRef.current.email, patch: profile }),
      });
    } catch { /* el guardado local ya se ha hecho; el sync remoto es best-effort */ }
    lookupRef.current = { telefono: profile.telefono, email: profile.email };
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function continueQuote(q: QuoteProfile) {
    saveQuote(q);
    router.push(`/comparativa?producto=${q.producto}`);
  }

  function handleRemove(id: string) {
    removeClientQuote(id);
    setQuotes(loadClientQuotes());
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
    setLoginOk(false);
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
      for (const q of body.presupuestos as QuoteProfile[]) addClientQuote(q);
      setQuotes(loadClientQuotes());
      setPage(1);
      setLoginCodigo(""); setLoginEmail(""); setLoginTelefono("");
      setLoginOk(true);
      setTimeout(() => setLoginOk(false), 2500);
    } catch {
      setLoginError("Error de conexión. Inténtalo de nuevo.");
    }
    setLoginLoading(false);
  }

  if (!checked) return null;

  return (
    <>
      <Header />
      <main id="contenido" className="mx-auto max-w-app px-5 py-10 md:max-w-3xl md:py-16">
        <h1 className="text-[28px] font-extrabold leading-tight text-navy">Tu área de cliente</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate2">
          Sin registro ni contraseña: todo se guarda en este navegador. Aquí puedes recuperar tus presupuestos,
          cambiar tus datos de contacto o reprogramar tu llamada cuando quieras.
        </p>

        {/* Recuperar desde otro dispositivo */}
        <section aria-labelledby="acceso" className="mt-8 rounded-[24px] border border-hair bg-white p-6 shadow-card">
          <h2 id="acceso" className="text-[18px] font-bold text-navy">¿Tarificaste desde otro dispositivo?</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate2">
            Introduce el número de presupuesto (te lo enviamos por WhatsApp o aparece en tu PDF), tu correo y tu
            teléfono para traer aquí tus presupuestos.
          </p>
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
          <button
            type="button" onClick={handleLogin} disabled={loginLoading}
            className="mt-4 flex items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40"
          >
            {loginLoading && <Spinner />}
            {loginLoading ? "Buscando…" : loginOk ? "Encontrado ✓" : "Recuperar mis presupuestos"}
          </button>
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
              Si ya tienes una solicitud en curso con {BRAND_NAME}, estos cambios se actualizan también en tu ficha
              con tu asesor, al momento.
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
                Todavía no tienes presupuestos guardados en este navegador. Calcula tu precio y aparecerá aquí.
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
                      <button type="button" onClick={() => handleRemove(q.id)} className="text-[12px] font-medium text-slate2 underline hover:text-brand-red">
                        Eliminar
                      </button>
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
          {["Guardado solo en este navegador: si cambias de dispositivo, no verás este historial.", "Puedes borrar un presupuesto cuando quieras, sin que afecte a tu solicitud ya enviada."].map((c) => (
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
