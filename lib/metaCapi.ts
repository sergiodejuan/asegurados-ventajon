import crypto from "crypto";
import { getTheme } from "./store";

// Conversions API de Meta: manda el evento de conversión ("Lead") directo
// servidor-a-servidor, sin depender de que el píxel del navegador haya
// podido cargar (bloqueadores de anuncios, Safari/ITP, "no cookies hasta
// aceptar"...). Es el complemento server-side del píxel de components/
// MetaPixel.tsx, que solo se encarga de PageView/remarketing.
//
// El access token es un dato sensible de verdad (permite escribir eventos
// de conversión en la cuenta de anuncios): vive en variable de entorno
// (META_CAPI_ACCESS_TOKEN), nunca en el tema editable desde el admin — mismo
// criterio que RETELL_API_KEY, BLAND_API_KEY, RESEND_API_KEY, etc.
// El ID del píxel sí se lee del tema (no es secreto, ya viaja en el JS del
// navegador con el píxel de cliente).

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// Formato exigido por Meta para el teléfono en user_data: solo dígitos, con
// prefijo de país, sin "+" ni espacios (ver lib/schema.ts normalizePhone,
// que ya deja el número sin el 34 delante — aquí se antepone para el hash).
function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("34") ? digits : `34${digits}`;
  return sha256(withCountry);
}

export type CapiLeadInput = {
  email?: string;
  telefono?: string;
  eventSourceUrl: string;
  ip?: string;
  userAgent?: string;
  fbp?: string; // cookie _fbp, si el píxel de cliente ya la dejó puesta
  fbc?: string; // cookie _fbc, si llegó por un anuncio de Meta
};

// Lee de la propia petición lo que Meta necesita para casar el evento con el
// visitante (IP, user-agent, cookies _fbp/_fbc que deja el píxel de cliente
// si llegó a cargar) — evita repetir este parsing en cada ruta que llama a
// sendMetaLeadEvent.
export function capiContextFromRequest(request: Request): { eventSourceUrl: string; ip?: string; userAgent?: string; fbp?: string; fbc?: string } {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => c.trim().split("=")).filter(([k]) => k).map(([k, ...v]) => [k, v.join("=")])
  );
  return {
    eventSourceUrl: request.headers.get("referer") || "",
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
    fbp: cookies["_fbp"],
    fbc: cookies["_fbc"],
  };
}

export async function sendMetaLeadEvent(input: CapiLeadInput): Promise<void> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) return; // no configurado: no-op, igual que el resto de integraciones opcionales

  const theme = await getTheme();
  const pixelId = theme.metaPixel.pixelId;
  if (!pixelId) return;

  const userData: Record<string, unknown> = {};
  if (input.email) userData.em = [sha256(input.email)];
  if (input.telefono) userData.ph = [hashPhone(input.telefono)];
  if (input.ip) userData.client_ip_address = input.ip;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const event = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: input.eventSourceUrl,
    user_data: userData,
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event], access_token: accessToken }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[metaCapi] error", res.status, text);
    }
  } catch (err) {
    console.error("[metaCapi] request error", err);
  }
}
