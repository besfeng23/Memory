import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ ok: false, status: "disabled_read_only_stub", code: "not_implemented", id, item: null, userIdSource: "server_auth_context_only", ignoresClientUserId: true, wouldPersist: false, wouldApprove: false }, { status: 501 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await request.json().catch(() => null);
  const { id } = await params;
  return NextResponse.json({ ok: false, status: "disabled_read_only_stub", code: "not_implemented", id, message: "Review item mutation and approval are disabled for public routes.", userIdSource: "server_auth_context_only", ignoresClientUserId: true, wouldPersist: false, wouldApprove: false }, { status: 501 });
}
