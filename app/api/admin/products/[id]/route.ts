import { NextResponse } from "next/server";
import { deleteProduct, getProduct, saveProduct } from "@/lib/store";
import { adminAuthFail } from "@/lib/adminAuth";
import type { ProductDraft } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const product = await getProduct(params.id);
  if (!product) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, product });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const denied = adminAuthFail(request);
  if (denied) return denied;

  let body: ProductDraft;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "Cuerpo no válido." }, { status: 400 }); }

  const product = await saveProduct(params.id, body);
  if (!product) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, product });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const denied = adminAuthFail(request);
  if (denied) return denied;
  const removed = await deleteProduct(params.id);
  if (!removed) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
