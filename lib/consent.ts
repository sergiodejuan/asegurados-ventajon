import type { ConsentRecord } from "./crm";

type ClientTimes = { privacidadAt?: string; contactoAt?: string; comercialAt?: string } | undefined;
type Granted = { privacidad: boolean; contacto: boolean; comercial: boolean };

export function buildConsent(
  request: Request,
  source: string,
  page: string,
  granted: Granted,
  clientTimes: ClientTimes
): ConsentRecord {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";
  const userAgent = request.headers.get("user-agent") || "";
  return {
    at: new Date().toISOString(),
    ip,
    userAgent,
    source,
    page,
    privacidad: { granted: !!granted.privacidad, at: clientTimes?.privacidadAt },
    contacto: { granted: !!granted.contacto, at: clientTimes?.contactoAt },
    comercial: { granted: !!granted.comercial, at: clientTimes?.comercialAt },
  };
}
