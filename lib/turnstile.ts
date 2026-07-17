// Verificación server-side de Cloudflare Turnstile — defensa en profundidad
// para los formularios públicos, por detrás del rate limiting (que es la
// protección principal, ver lib/rateLimit.ts y ya no depende de esto).
//
// Sin TURNSTILE_SECRET_KEY configurada, la verificación se salta sin más
// (igual que Retell/Bland/ManyChat): el formulario sigue funcionando, solo
// que sin la capa extra. En cuanto Sergio cree un site en
// https://dash.cloudflare.com/?to=/:account/turnstile y añada
// NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY, se activa sola.

export function turnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // no configurado: no bloquea
  if (!token) return false; // configurado pero el cliente no mandó nada: sospechoso

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const body = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return !!body?.success;
  } catch (err) {
    console.error("[turnstile] error de verificación", err);
    // Si Cloudflare no responde, no se bloquea el formulario por un fallo
    // ajeno — el rate limiting sigue protegiendo de todas formas.
    return true;
  }
}
