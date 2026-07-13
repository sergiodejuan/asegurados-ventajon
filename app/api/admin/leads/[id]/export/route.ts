import { NextResponse } from "next/server";
import { exportLeadData } from "@/lib/store";
import { adminAuthFail } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Derecho de acceso/portabilidad (RGPD art. 15/20): exporta todos los datos
// personales que tenemos de un lead, incluidos sus presupuestos vinculados.
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const data = await exportLeadData(params.id);
  if (!data) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  const json = JSON.stringify(data, null, 2);
  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="datos-${params.id}.json"`,
    },
  });
}
