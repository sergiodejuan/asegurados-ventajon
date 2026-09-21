"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/Header";
import { Spinner } from "@/components/icons";
import { useSiteTheme } from "@/lib/useTheme";
import { BRAND_NAME } from "@/lib/brand";

// Página intermedia entre el enlace de un solo uso (email o WhatsApp, ver
// lib/clientVerification.ts) y el acceso real: exige un clic explícito del
// usuario ("Confirmar acceso") en vez de consumir el token con la simple
// carga de la página. Necesario porque varios proveedores de correo (Gmail,
// Outlook...) escanean automáticamente los enlaces de un mensaje nada más
// llegar — si esta página consumiera el token sola, ese escaneo automático
// lo invalidaría antes de que el usuario real llegara a hacer clic.
export function VerificarAccesoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useSiteTheme();
  const token = searchParams.get("token") ?? "";
  const next = searchParams.get("next") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/client/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Ese enlace ya no es válido o ha caducado. Pide uno nuevo con tu correo o teléfono.");
        setLoading(false);
        return;
      }
      // Whitelist de prefijo: "next" viene de un query param del propio
      // enlace de verificación, así que se valida que apunte al área de
      // cliente antes de redirigir, para no abrir la puerta a un
      // open-redirect si alguien manipulase el enlace.
      router.push(next.startsWith("/area-cliente") ? next : "/area-cliente?verificado=1");
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  const noToken = !token;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
      <a href="/" aria-label={`${BRAND_NAME} · Inicio`} className="mb-8 inline-block w-fit">
        <Wordmark logoUrl={theme.logoUrl} />
      </a>
      <div className="w-full max-w-sm rounded-[24px] border border-hair bg-white p-6 text-center shadow-card">
        <h1 className="text-[22px] font-extrabold leading-tight text-navy">Confirma tu acceso</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate2">
          Por seguridad, confirma con un clic que quieres entrar a tu área de cliente.
        </p>

        {noToken || error ? (
          <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">
            {noToken ? "Este enlace no es válido." : error}
          </p>
        ) : (
          <button
            type="button" onClick={handleConfirm} disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-navy px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40"
          >
            {loading && <Spinner />}
            {loading ? "Confirmando…" : "Confirmar acceso"}
          </button>
        )}

        <a href="/area-cliente" className="mt-4 block text-[13px] font-semibold text-navy underline">
          Volver al área de cliente
        </a>
      </div>
    </div>
  );
}
