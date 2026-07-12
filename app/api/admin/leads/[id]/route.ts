import { NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/store";
import { STATUSES, type Status } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function auth(request: Request): NextResponse | null {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Configura ADMIN_TOKEN." },
      { status: 503 }
    );
  }
  if (request.headers.get("x-admin-token") !== secret) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = auth(request);
  if (denied) return denied;
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = auth(request);
  if (denied) return denied;

  let body: { status?: string; nextStep?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 });
  }

  const status =
    body.status && (STATUSES as readonly string[]).includes(body.status)
      ? (body.status as Status)
      : undefined;

  const lead = await updateLead(params.id, {
    status,
    nextStep: typeof body.nextStep === "string" ? body.nextStep : undefined,
    note: body.note,
  });
  if (!lead) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}
