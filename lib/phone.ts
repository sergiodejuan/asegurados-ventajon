// Los teléfonos se guardan normalizados sin prefijo de país (ver lib/schema.ts);
// las integraciones de llamada saliente (Retell, Bland…) exigen E.164. Asume
// España (+34), el único mercado que atiende el sitio.
export function toE164Spain(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("34") && digits.length > 9) return `+${digits}`;
  return `+34${digits}`;
}
