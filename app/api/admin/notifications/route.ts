import { NextResponse } from "next/server";
import { requireModule } from "@/lib/agentAuth";
import { getTeamNotificationsConfig, saveTeamNotificationsConfig } from "@/lib/store";
import { emailConfigured } from "@/lib/email";
import { webPushConfigured } from "@/lib/webPush";
import type { TeamNotificationsConfig } from "@/lib/teamNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 20;
const MAX_SOURCES = 40;

function sanitizeEmailList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const v = raw.trim().toLowerCase();
    if (!v || v.length > 200) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= MAX_RECIPIENTS) break;
  }
  return out;
}

function sanitizeSources(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (!v || v.length > 120) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= MAX_SOURCES) break;
  }
  return out;
}

export async function GET(request: Request) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;
  const config = await getTeamNotificationsConfig();
  return NextResponse.json({
    ok: true,
    config,
    status: { email: emailConfigured(), push: webPushConfigured() },
  });
}

export async function PUT(request: Request) {
  const auth = await requireModule(request, "configuracion");
  if (!auth.ok) return auth.response;
  let body: Partial<TeamNotificationsConfig>;
  try { body = (await request.json()) as Partial<TeamNotificationsConfig>; }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const patch: Partial<TeamNotificationsConfig> = { version: 1 };
  if (body.email) {
    patch.email = {
      enabled: !!body.email.enabled,
      recipients: sanitizeEmailList(body.email.recipients),
      sources: sanitizeSources(body.email.sources),
      soloConComercial: !!body.email.soloConComercial,
    };
  }
  if (body.push) {
    patch.push = {
      enabled: !!body.push.enabled,
      sources: sanitizeSources(body.push.sources),
      soloConComercial: !!body.push.soloConComercial,
    };
  }

  const next = await saveTeamNotificationsConfig(patch);
  return NextResponse.json({
    ok: true,
    config: next,
    status: { email: emailConfigured(), push: webPushConfigured() },
  });
}
