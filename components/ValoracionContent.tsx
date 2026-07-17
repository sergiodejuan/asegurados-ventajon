"use client";

import { useEffect, useState } from "react";
import { MinimalTopBar } from "./MinimalTopBar";
import { Check, Spinner } from "./icons";
import { BRAND_NAME, GOOGLE_REVIEW_URL } from "@/lib/brand";

type Fetched = {
  producto: string; nombre: string; already: boolean;
  response: { score: number; comentario: string } | null;
};

export function ValoracionContent({ id }: { id: string }) {
  const [state, setState] = useState<"loading" | "notfound" | "form" | "sent" | "already">("loading");
  const [data, setData] = useState<Fetched | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiereResena, setQuiereResena] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/valoracion/${id}`);
        const body = await res.json();
        if (!res.ok || !body.ok) { setState("notfound"); return; }
        setData(body);
        if (body.already) {
          setQuiereResena((body.response?.score ?? 0) >= 9);
          setState("already");
        } else {
          setState("form");
        }
      } catch { setState("notfound"); }
    })();
  }, [id]);

  async function submit() {
    if (score === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/valoracion/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comentario }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No hemos podido enviar tu respuesta."); setSubmitting(false); return; }
      setQuiereResena(!!body.quiereResena);
      setState("sent");
    } catch {
      setError("Parece que hay un problema de conexión. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  const primerNombre = data?.nombre?.trim().split(/\s+/)[0];
  const productoTxt = data?.producto ? ` sobre tu seguro de ${data.producto}` : "";

  return (
    <main className="safe-top min-h-screen bg-mist">
      <div className="mx-auto max-w-app px-5 py-10 md:max-w-lg md:py-16">
        <MinimalTopBar />

        <div className="rounded-[24px] border border-hair bg-white p-6 shadow-card sm:p-8">
          {state === "loading" && (
            <div className="flex items-center justify-center py-10"><Spinner /></div>
          )}

          {state === "notfound" && (
            <div className="text-center">
              <h1 className="text-[19px] font-extrabold text-navy">Encuesta no encontrada</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                Puede que el enlace haya caducado o esté incompleto. Si tienes alguna duda, escríbenos.
              </p>
            </div>
          )}

          {state === "form" && (
            <div>
              <h1 className="text-[19px] font-extrabold leading-tight text-navy">
                {primerNombre ? `${primerNombre}, ¿` : "¿"}qué probabilidad hay de que nos recomiendes{productoTxt}?
              </h1>
              <p className="mt-1.5 text-[13px] text-slate2">0 = nada probable · 10 = muy probable</p>

              <div role="group" aria-label="Puntuación del 0 al 10" className="mt-5 grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                {Array.from({ length: 11 }, (_, n) => n).map((n) => (
                  <button
                    key={n} type="button" aria-pressed={score === n} onClick={() => setScore(n)}
                    className={`aspect-square rounded-card border text-[14px] font-bold tnums transition-colors ${score === n ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/40 hover:bg-mist"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {score !== null && (
                <div className="mt-5 motion-safe:animate-fade-up">
                  <label htmlFor="val-comentario" className="mb-1.5 block text-[13px] font-semibold text-ink">
                    ¿Algo que quieras contarnos? <span className="font-normal text-slate2">(opcional)</span>
                  </label>
                  <textarea
                    id="val-comentario" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value.slice(0, 500))}
                    placeholder="Cuéntanos qué tal fue…"
                    className="w-full resize-none rounded-card border border-hair bg-white px-4 py-3 text-[14px] text-ink placeholder:text-slate2/60"
                  />
                  {error && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{error}</p>}
                  <button
                    type="button" onClick={submit} disabled={submitting} aria-busy={submitting || undefined}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep disabled:bg-slate2/40"
                  >
                    {submitting && <Spinner />}
                    {submitting ? "Enviando…" : "Enviar valoración"}
                  </button>
                </div>
              )}
            </div>
          )}

          {(state === "sent" || state === "already") && (
            <ThankYou quiereResena={quiereResena} already={state === "already"} />
          )}
        </div>
      </div>
    </main>
  );
}

function ThankYou({ quiereResena, already }: { quiereResena: boolean; already: boolean }) {
  return (
    <div className="text-center">
      <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-navy/10 text-navy">
        <Check width={26} height={26} />
      </span>
      <h1 className="mt-4 text-[19px] font-extrabold text-navy">
        {already ? "Ya nos habías respondido" : "¡Gracias por tu valoración!"}
      </h1>
      {quiereResena && GOOGLE_REVIEW_URL ? (
        <>
          <p className="mt-2 text-[14px] leading-relaxed text-slate2">
            Nos alegra mucho saberlo. Si tienes 30 segundos, nos ayudaría muchísimo que lo contaras en una reseña.
          </p>
          <a
            href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center rounded-card bg-brand-red px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-red-deep"
          >
            Dejar una reseña en Google
          </a>
        </>
      ) : (
        <p className="mt-2 text-[14px] leading-relaxed text-slate2">
          Tu opinión nos ayuda a mejorar. Si nos has dejado algún comentario, un asesor de {BRAND_NAME} le echará un vistazo.
        </p>
      )}
    </div>
  );
}
