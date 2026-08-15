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
    // Fail-closed cuando el secreto está configurado (ver auditoría, N-01):
    // si Cloudflare no responde, rechazamos el envío. Un atacante podría
    // provocar el timeout para saltarse la verificación; el rate limiting
    // sigue siendo la segunda barrera, pero no vamos a fiarnos solo de él.
    // La rama previa (sin secret) ya devuelve true por otro camino, así que
    // aquí sabemos que el operador HA configurado Turnstile y espera que
    // funcione.
    return false;
  }
}
